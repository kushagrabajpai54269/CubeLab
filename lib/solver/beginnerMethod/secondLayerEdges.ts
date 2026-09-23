import type { CubeState } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import {
  SECOND_LAYER_EDGE_IDENTITIES,
  isSecondLayerEdgeSolved,
  ownFacesOfSecondLayerEdge,
} from './secondLayerGeometry'
import { ejectSecondLayerEdgeMoves, alignSecondLayerEdgeMoves } from './secondLayerEjectAndAlign'
import { secondLayerInsertionMoves } from './secondLayerInsertionMoves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved, currentSlotOf, whiteFacingFaceOfSlot } from './geometry'
import { solveWhiteEdge } from './whiteCross'
import {
  FIRST_LAYER_CORNER_IDENTITIES,
  isFirstLayerCornerSolved,
  currentCornerSlotOf,
  whiteFacingFaceOfCornerSlot,
} from './cornerGeometry'
import { solveOneCorner } from './firstLayerCorners'
import { readEdgeColors } from '../../cube/pieces'

/**
 * Second-Layer Edges (Phase C, Subsystem 4) — the third Beginner Method
 * solving stage, run after White Cross and First-Layer Corners. Same
 * eject/align/insert shape and same round-robin-plus-cycle-detection
 * termination architecture as Subsystems 2 and 3 (full rationale for that
 * architecture: D-045 through D-048); this module's own docstrings above
 * each piece explain what's genuinely different for this stage
 * (`secondLayerGeometry.ts`, `secondLayerEjectAndAlign.ts`,
 * `secondLayerInsertionAlgorithms.ts`).
 */

/** Solves one target second-layer edge from wherever it currently is:
 * eject to the D-layer (if needed), align it to a matched facing, insert.
 * Returns `[]` if already solved. */
export function solveOneSecondLayerEdge(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  if (isSecondLayerEdgeSolved(state, identity)) return []
  let moves: Move[] = []
  let current = state

  const eject = ejectSecondLayerEdgeMoves(current, identity, allTargets)
  moves = moves.concat(eject)
  current = applyMoves(current, eject)

  const align = alignSecondLayerEdgeMoves(current, identity)
  moves = moves.concat(align)
  current = applyMoves(current, align)

  const insert = secondLayerInsertionMoves(current, identity)
  moves = moves.concat(insert)

  return moves
}

/**
 * Reduced state for cycle detection: covers every piece group this
 * stage's own eject/insert moves can touch — the 4 second-layer targets
 * themselves, AND the full white cross, AND the full first layer of
 * corners (a single quarter turn of any second-layer edge's own face
 * moves that face's 2 first-layer corners and 1 cross edge too, per
 * `secondLayerEjectAndAlign.ts`'s own docstring). This is the same
 * "track and repair every piece type a subsystem might disturb, not just
 * its own targets" lesson Subsystem 3 documents (D-048) — the cycle
 * detector has to see all of it for the termination guarantee to be real,
 * not just a targets-only guarantee that misses a genuine cross/corner
 * oscillation.
 */
function reducedSecondLayerState(state: CubeState, targets: readonly number[]): string {
  const edgeColors = readEdgeColors(state)
  const second = targets
    .map((id) => {
      const slot = currentSlotOf(state, id)
      return `L${id}:${slot}:${edgeColors[slot]}`
    })
    .join('|')
  const cross = WHITE_CROSS_EDGE_IDENTITIES
    .map((id) => {
      const slot = currentSlotOf(state, id)
      return `E${id}:${slot}:${whiteFacingFaceOfSlot(state, slot)}`
    })
    .join('|')
  const corners = FIRST_LAYER_CORNER_IDENTITIES
    .map((id) => {
      const slot = currentCornerSlotOf(state, id)
      return `C${id}:${slot}:${whiteFacingFaceOfCornerSlot(state, slot)}`
    })
    .join('|')
  return `${second}||${cross}||${corners}`
}

function isSecondLayerFullySolved(state: CubeState, targets: readonly number[]): boolean {
  if (!targets.every((id) => isSecondLayerEdgeSolved(state, id))) return false
  if (!WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id))) return false
  return FIRST_LAYER_CORNER_IDENTITIES.every((id) => isFirstLayerCornerSolved(state, id))
}

/**
 * Solves the full Second-Layer Edges stage: processes the 4 target edges
 * in a fixed order, then re-solves any white-cross edge or first-layer
 * corner disturbed as a side effect (via the existing, already-verified
 * `solveWhiteEdge`/`solveOneCorner`), repeating rounds until the targets
 * AND the full first layer are simultaneously solved. The same finite-
 * state cycle detector Subsystems 2/3 use (now covering second-layer
 * targets, cross, and corners together) is the real termination
 * guarantee, not a hand-proved round count.
 */
/** Whether `id` (any of the 3 piece groups this stage cares about) is
 * currently solved. */
function isPieceSolved(state: CubeState, id: number, kind: 'second' | 'cross' | 'corner'): boolean {
  if (kind === 'second') return isSecondLayerEdgeSolved(state, id)
  if (kind === 'cross') return isWhiteCrossEdgeSolved(state, id)
  return isFirstLayerCornerSolved(state, id)
}

/**
 * How many currently-solved pieces (across all 3 groups, excluding
 * `identity` itself) would end up unsolved if `moves` were applied from
 * `state`. Used to greedily choose which unsolved second-layer target to
 * process next.
 */
function collateralDamage(state: CubeState, moves: readonly Move[], targets: readonly number[]): number {
  const before: [number, 'second' | 'cross' | 'corner'][] = [
    ...targets.map((id): [number, 'second'] => [id, 'second']),
    ...WHITE_CROSS_EDGE_IDENTITIES.map((id): [number, 'cross'] => [id, 'cross']),
    ...FIRST_LAYER_CORNER_IDENTITIES.map((id): [number, 'corner'] => [id, 'corner']),
  ]
  const trial = applyMoves(state, [...moves])
  let damage = 0
  for (const [id, kind] of before) {
    if (isPieceSolved(state, id, kind) && !isPieceSolved(trial, id, kind)) damage++
  }
  return damage
}

/**
 * Solves whichever currently-unsolved second-layer target causes the
 * least collateral disturbance to already-solved pieces, one target at a
 * time, re-evaluating after every move. A fixed processing order (process
 * targets 8,9,10,11 regardless of consequences) can hit a genuine
 * deterministic fixed point: this stage's eject step has no branch that's
 * provably non-disturbing (every own face is shared with another
 * second-layer target, 2 first-layer corners, and a cross edge — unlike
 * corners/cross, which converge reliably at their much shorter 3-move
 * insertion length), so two targets can end up stuck repeatedly
 * re-disturbing each other in lockstep no matter which fixed order is
 * used, including a rotating one (found and confirmed by this
 * subsystem's own fuzz testing — a genuine, not slow-but-eventual,
 * cycle). Greedily preferring the least-disruptive next move at each step
 * breaks that lockstep by construction: it can still cause some
 * disturbance when every option does, but never *needlessly* picks a
 * worse option, and the cycle detector remains the real termination
 * guarantee regardless.
 */
function solveSecondLayerEdgesGreedily(state: CubeState, targets: readonly number[]): Move[] {
  let moves: Move[] = []
  let current = state
  let remaining = targets.filter((id) => !isSecondLayerEdgeSolved(current, id))
  while (remaining.length > 0) {
    let bestId = remaining[0]!
    let bestMoves = solveOneSecondLayerEdge(current, bestId, targets)
    let bestDamage = collateralDamage(current, bestMoves, targets)
    for (const id of remaining.slice(1)) {
      const candidateMoves = solveOneSecondLayerEdge(current, id, targets)
      const damage = collateralDamage(current, candidateMoves, targets)
      if (damage < bestDamage) {
        bestId = id
        bestMoves = candidateMoves
        bestDamage = damage
      }
    }
    moves = moves.concat(bestMoves)
    current = applyMoves(current, bestMoves)
    remaining = targets.filter((id) => !isSecondLayerEdgeSolved(current, id))
  }
  return moves
}

export function solveSecondLayerEdges(state: CubeState): Move[] {
  const targets = SECOND_LAYER_EDGE_IDENTITIES
  let moves: Move[] = []
  let current = state
  const visited = new Set<string>([reducedSecondLayerState(current, targets)])
  const HARD_CAP = 30

  for (let round = 0; round < HARD_CAP; round++) {
    if (isSecondLayerFullySolved(current, targets)) return moves

    const secondMoves = solveSecondLayerEdgesGreedily(current, targets)
    moves = moves.concat(secondMoves)
    current = applyMoves(current, secondMoves)

    for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
      if (isWhiteCrossEdgeSolved(current, id)) continue
      const edgeMoves = solveWhiteEdge(current, id, WHITE_CROSS_EDGE_IDENTITIES)
      moves = moves.concat(edgeMoves)
      current = applyMoves(current, edgeMoves)
    }

    for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
      if (isFirstLayerCornerSolved(current, id)) continue
      const cornerMoves = solveOneCorner(current, id, FIRST_LAYER_CORNER_IDENTITIES)
      moves = moves.concat(cornerMoves)
      current = applyMoves(current, cornerMoves)
    }

    const key = reducedSecondLayerState(current, targets)
    if (visited.has(key)) {
      throw new Error(
        'solveSecondLayerEdges: detected a repeated cube state without reaching second-layer-edges+first-layer ' +
        'fully solved -- this indicates a genuine defect in the eject/align/insert procedure (a cycle), not a ' +
        'slow-but-eventual convergence. Please report this as a bug rather than retrying.'
      )
    }
    visited.add(key)
  }

  throw new Error(`solveSecondLayerEdges: did not converge within ${HARD_CAP} rounds (no cycle detected, but no progress reached solved either) — this indicates a genuine defect.`)
}

// Re-exported for tests that want to reference own-face pairs directly
// without re-deriving them.
export { ownFacesOfSecondLayerEdge }
