import type { CubeState } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved, currentSlotOf, whiteFacingFaceOfSlot } from './geometry'
import { ejectMoves, alignmentMoves } from './ejectAndAlign'
import { insertionMoves } from './insertionMoves'

/**
 * White Cross (Phase C, Subsystem 2) — the first Beginner Method solving
 * stage. Full design investigation and rationale: Decision Log D-045/D-046.
 */

/** Solves one target edge from wherever it currently is: eject to the
 * D-layer (if needed), align its column, insert. Returns `[]` if already
 * solved. Each step's moves are applied to a running scratch state so the
 * next step always sees the real, current position — never assumed. */
export function solveWhiteEdge(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  if (isWhiteCrossEdgeSolved(state, identity)) return []
  let moves: Move[] = []
  let current = state

  const eject = ejectMoves(current, identity, allTargets)
  moves = moves.concat(eject)
  current = applyMoves(current, eject)

  const align = alignmentMoves(current, identity)
  moves = moves.concat(align)
  current = applyMoves(current, align)

  const insert = insertionMoves(current, identity, allTargets)
  moves = moves.concat(insert)

  return moves
}

/** Reduced state used only for cycle detection: each target's current
 * slot and facing. Finite (bounded well under 12^4 x 2^4), which is what
 * makes the termination guarantee below a real one. */
function reducedCrossState(state: CubeState, targets: readonly number[]): string {
  return targets
    .map((id) => {
      const slot = currentSlotOf(state, id)
      return `${id}:${slot}:${whiteFacingFaceOfSlot(state, slot)}`
    })
    .join('|')
}

/**
 * Solves the full White Cross: processes the 4 target edges in a fixed
 * order, repeating rounds until all 4 are simultaneously solved. A
 * previously-placed edge can occasionally be bumped back out by a later
 * edge's own necessary foreign-face move (proven unavoidable in general —
 * see D-046); when that happens, the next round re-solves it. The
 * placed-aware preference in `ejectMoves`/`insertionMoves` makes this rare
 * in practice, but the real termination guarantee is structural, not
 * statistical: the state relevant to this loop (each target's slot and
 * facing) is drawn from a finite space, and this function is deterministic
 * given a fixed state, so every state it visits is recorded — a repeat is
 * mechanically detected and throws immediately, rather than looping
 * forever undetected. This has never fired in testing (see the test file
 * for the specific investigation that found and fixed the one real cause
 * of non-termination this design encountered), but its presence is what
 * makes the termination claim a guarantee rather than an assumption.
 */
export function solveWhiteCross(state: CubeState): Move[] {
  const targets = WHITE_CROSS_EDGE_IDENTITIES
  let moves: Move[] = []
  let current = state
  const visited = new Set<string>([reducedCrossState(current, targets)])
  const HARD_CAP = 20 // generous relative to the finite reduced state space; the cycle check below is the real guarantee

  for (let round = 0; round < HARD_CAP; round++) {
    if (targets.every((id) => isWhiteCrossEdgeSolved(current, id))) return moves

    for (const id of targets) {
      if (isWhiteCrossEdgeSolved(current, id)) continue
      const edgeMoves = solveWhiteEdge(current, id, targets)
      moves = moves.concat(edgeMoves)
      current = applyMoves(current, edgeMoves)
    }

    const key = reducedCrossState(current, targets)
    if (visited.has(key)) {
      throw new Error(
        'solveWhiteCross: detected a repeated cube state without reaching a solved cross — this indicates a genuine ' +
        'defect in the eject/align/insert procedure (a cycle), not a slow-but-eventual convergence. Please report this ' +
        'as a bug rather than retrying.'
      )
    }
    visited.add(key)
  }

  throw new Error(`solveWhiteCross: did not converge within ${HARD_CAP} rounds (no cycle detected, but no progress reached solved either) — this indicates a genuine defect.`)
}
