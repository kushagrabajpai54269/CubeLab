import type { CubeState } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved, currentCornerSlotOf, whiteFacingFaceOfCornerSlot } from './cornerGeometry'
import { ejectCornerMoves, alignCornerMoves } from './cornerEjectAndAlign'
import { cornerInsertionMoves } from './cornerInsertionMoves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved, currentSlotOf, whiteFacingFaceOfSlot } from './geometry'
import { solveWhiteEdge } from './whiteCross'

/**
 * First-Layer Corners (Phase C, Subsystem 3) — the second Beginner Method
 * solving stage, run after White Cross. Full design investigation and
 * rationale: Decision Log D-047/D-048.
 */

/** Solves one target corner from wherever it currently is: eject to the
 * D-layer (if needed), align its column, insert. Returns `[]` if already
 * solved. */
export function solveOneCorner(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  if (isFirstLayerCornerSolved(state, identity)) return []
  let moves: Move[] = []
  let current = state

  const eject = ejectCornerMoves(current, identity, allTargets)
  moves = moves.concat(eject)
  current = applyMoves(current, eject)

  const align = alignCornerMoves(current, identity)
  moves = moves.concat(align)
  current = applyMoves(current, align)

  const insert = cornerInsertionMoves(current, identity)
  moves = moves.concat(insert)

  return moves
}

/**
 * Reduced state used for cycle detection: each target corner's current
 * slot and facing, AND each white-cross edge's current slot and facing.
 * The cross is included deliberately (not just the 4 corners): the
 * diagonal-slot eject case (`ejectCornerMoves`, D-048) uses a single
 * foreign-face quarter turn, which — discovered by the exhaustive test
 * suite, not anticipated in advance — can disturb that face's own cross
 * edge, the same way any lone quarter turn disturbs its face's edge.
 * Tracking cross state here alongside corner state means a genuine
 * corner+cross interaction cycle would still be mechanically caught, not
 * just a corner-only one.
 */
function reducedFirstLayerState(state: CubeState, cornerTargets: readonly number[]): string {
  const corners = cornerTargets
    .map((id) => {
      const slot = currentCornerSlotOf(state, id)
      return `C${id}:${slot}:${whiteFacingFaceOfCornerSlot(state, slot)}`
    })
    .join('|')
  const cross = WHITE_CROSS_EDGE_IDENTITIES
    .map((id) => {
      const slot = currentSlotOf(state, id)
      return `E${id}:${slot}:${whiteFacingFaceOfSlot(state, slot)}`
    })
    .join('|')
  return `${corners}||${cross}`
}

function isFirstLayerFullySolved(state: CubeState, cornerTargets: readonly number[]): boolean {
  if (!cornerTargets.every((id) => isFirstLayerCornerSolved(state, id))) return false
  return WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id))
}

/**
 * Solves the full First-Layer Corners stage: processes the 4 target
 * corners in a fixed order, then re-solves any white-cross edge that got
 * disturbed as a side effect (via the existing, already-verified
 * `solveWhiteEdge`), repeating rounds until corners AND the cross are
 * simultaneously solved. The eject step's diagonal-slot case can bump an
 * already-placed corner or a cross edge (D-048); the placed-aware
 * preference in `ejectCornerMoves` makes this rare, and the round-robin
 * retry (identical in structure to `solveWhiteCross`) resolves it when it
 * happens. The termination guarantee is the same mechanical, finite-state
 * cycle detector `solveWhiteCross` uses (now covering corners and cross
 * together), not a hand-proved round count.
 */
export function solveFirstLayerCorners(state: CubeState): Move[] {
  const cornerTargets = FIRST_LAYER_CORNER_IDENTITIES
  let moves: Move[] = []
  let current = state
  const visited = new Set<string>([reducedFirstLayerState(current, cornerTargets)])
  const HARD_CAP = 20

  for (let round = 0; round < HARD_CAP; round++) {
    if (isFirstLayerFullySolved(current, cornerTargets)) return moves

    for (const id of cornerTargets) {
      if (isFirstLayerCornerSolved(current, id)) continue
      const cornerMoves = solveOneCorner(current, id, cornerTargets)
      moves = moves.concat(cornerMoves)
      current = applyMoves(current, cornerMoves)
    }

    for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
      if (isWhiteCrossEdgeSolved(current, id)) continue
      const edgeMoves = solveWhiteEdge(current, id, WHITE_CROSS_EDGE_IDENTITIES)
      moves = moves.concat(edgeMoves)
      current = applyMoves(current, edgeMoves)
    }

    const key = reducedFirstLayerState(current, cornerTargets)
    if (visited.has(key)) {
      throw new Error(
        'solveFirstLayerCorners: detected a repeated cube state without reaching corners+cross fully solved -- ' +
        'this indicates a genuine defect in the eject/align/insert procedure (a cycle), not a slow-but-eventual ' +
        'convergence. Please report this as a bug rather than retrying.'
      )
    }
    visited.add(key)
  }

  throw new Error(`solveFirstLayerCorners: did not converge within ${HARD_CAP} rounds (no cycle detected, but no progress reached solved either) — this indicates a genuine defect.`)
}
