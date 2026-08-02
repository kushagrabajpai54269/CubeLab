import type { Face } from './types'

/**
 * Verified base (single clockwise quarter-turn) facelet permutations, one
 * per face. Derived from 3D rotation geometry and self-checked (structural
 * bijectivity, order-4, locality, and two independent chirality anchors) by
 * scripts/derive-move-tables.mjs — see D-027. Do not hand-edit this data;
 * if it ever needs to change, change the derivation script and re-run it.
 *
 * Each array has 54 entries (9 facelets x 6 faces, in FACES order: U,D,L,R,F,B).
 * newFacelets[i] = oldFacelets[BASE_PERMUTATIONS[face][i]]
 */
export const BASE_PERMUTATIONS: Record<Face, number[]> = {
  U: [6,3,0,7,4,1,8,5,2,9,10,11,12,13,14,15,16,17,36,37,38,21,22,23,24,25,26,45,46,47,30,31,32,33,34,35,29,28,27,39,40,41,42,43,44,20,19,18,48,49,50,51,52,53],
  D: [0,1,2,3,4,5,6,7,8,11,14,17,10,13,16,9,12,15,18,19,20,21,22,23,53,52,51,27,28,29,30,31,32,44,43,42,36,37,38,39,40,41,24,25,26,45,46,47,48,49,50,33,34,35],
  L: [51,1,2,48,4,5,45,7,8,42,10,11,39,13,14,36,16,17,24,21,18,25,22,19,26,23,20,27,28,29,30,31,32,33,34,35,0,37,38,3,40,41,6,43,44,9,46,47,12,49,50,15,52,53],
  R: [0,1,38,3,4,41,6,7,44,9,10,47,12,13,50,15,16,53,18,19,20,21,22,23,24,25,26,29,32,35,28,31,34,27,30,33,36,37,17,39,40,14,42,43,11,45,46,8,48,49,5,51,52,2],
  F: [0,1,2,3,4,5,26,23,20,9,10,11,12,13,14,35,32,29,18,19,15,21,22,16,24,25,17,27,28,6,30,31,7,33,34,8,42,39,36,43,40,37,44,41,38,45,46,47,48,49,50,51,52,53],
  B: [27,30,33,3,4,5,6,7,8,18,21,24,12,13,14,15,16,17,2,19,20,1,22,23,0,25,26,11,28,29,10,31,32,9,34,35,36,37,38,39,40,41,42,43,44,47,50,53,46,49,52,45,48,51],
}

/**
 * Which of the 54 flat facelet indices belong to each of the 8 corner
 * slots (3 facelets each) and 12 edge slots (2 facelets each). Derived
 * geometrically alongside BASE_PERMUTATIONS — see
 * scripts/derive-move-tables.mjs and D-029.
 *
 * Each slot's facelets are ordered by fixed global axis priority (X: L/R,
 * then Y: U/D, then Z: F/B) — the same convention at every slot. This is
 * what makes pieces.ts's cornerOrientation/edgeOrientation comparable
 * across slots (D-039); an earlier version ordered by raw flat-index,
 * which is not a valid orientation-preserving convention.
 */
export const CORNER_FACELETS: readonly (readonly [number, number, number])[] = [
  [18,0,45],[27,47,2],[20,36,6],[29,8,38],[24,51,9],[33,11,53],[26,15,42],[35,44,17],
]

export const EDGE_FACELETS: readonly (readonly [number, number])[] = [
  [1,46],[19,3],[28,5],[7,37],[10,52],[25,12],[34,14],[16,43],[21,48],[23,39],[30,50],[32,41],
]
