import { type CubeState, type Face } from './types'
import { flattenFacelets, unflattenFacelets } from './state'
import { BASE_PERMUTATIONS } from './tables'

/**
 * A move is a face plus how many clockwise quarter-turns to apply.
 * Every one of the 18 standard moves (U, U', U2, ...) reduces to this shape:
 * U = {face:'U',turns:1}, U2 = {face:'U',turns:2}, U' = {face:'U',turns:3}
 * (three clockwise turns = one counterclockwise turn). This means only the
 * 6 base (turns=1) permutations needed deriving — every variant is just
 * that same permutation composed 1-3 times.
 */
export interface Move {
  face: Face
  turns: 1 | 2 | 3
}

/** Never mutates `state` — returns a new CubeState. */
export function applyMove(state: CubeState, move: Move): CubeState {
  let flat = flattenFacelets(state)
  const perm = BASE_PERMUTATIONS[move.face]
  for (let t = 0; t < move.turns; t++) {
    // Non-null: `src` is guaranteed a valid index (0-53) into `flat` by
    // BASE_PERMUTATIONS' geometric derivation, which self-checks structural
    // bijectivity (D-027) — not something tsc can prove statically.
    flat = perm.map((src) => flat[src]!)
  }
  return unflattenFacelets(flat, state.size)
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState {
  return moves.reduce((current, move) => applyMove(current, move), state)
}

const INVERSE_TURNS: Record<1 | 2 | 3, 1 | 2 | 3> = { 1: 3, 2: 2, 3: 1 }

/** The move that exactly undoes a given move. */
export function inverseMove(move: Move): Move {
  return { face: move.face, turns: INVERSE_TURNS[move.turns] }
}
