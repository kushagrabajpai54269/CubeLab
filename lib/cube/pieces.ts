import type { CubeState, FaceletColor } from './types'
import { flattenFacelets, createSolvedCube } from './state'
import { CORNER_FACELETS, EDGE_FACELETS } from './tables'

/**
 * Piece-level decomposition of a facelet CubeState — corner/edge identity,
 * permutation, and orientation. This is the "derived view" promised by
 * D-026: computed on demand from facelets, never stored. Everything here
 * is specific to a 3x3x3 cube (CORNER_FACELETS/EDGE_FACELETS assume 54
 * facelets) — see D-029 and the Validator's own size guard.
 */

export type ColorTriple = readonly [FaceletColor, FaceletColor, FaceletColor]
export type ColorPair = readonly [FaceletColor, FaceletColor]

const SOLVED_FLAT = flattenFacelets(createSolvedCube(3))

/**
 * The 3 colors the solved cube shows at each corner slot — this doubles as
 * each corner's canonical identity, since SOLVED_CORNER_COLORS[j] is
 * exactly what corner j looks like sitting in its own home slot.
 */
export const SOLVED_CORNER_COLORS: ColorTriple[] = CORNER_FACELETS.map(
  ([a, b, c]) => [SOLVED_FLAT[a], SOLVED_FLAT[b], SOLVED_FLAT[c]] as ColorTriple
)

export const SOLVED_EDGE_COLORS: ColorPair[] = EDGE_FACELETS.map(
  ([a, b]) => [SOLVED_FLAT[a], SOLVED_FLAT[b]] as ColorPair
)

export function readCornerColors(state: CubeState): ColorTriple[] {
  const flat = flattenFacelets(state)
  return CORNER_FACELETS.map(([a, b, c]) => [flat[a], flat[b], flat[c]] as ColorTriple)
}

export function readEdgeColors(state: CubeState): ColorPair[] {
  const flat = flattenFacelets(state)
  return EDGE_FACELETS.map(([a, b]) => [flat[a], flat[b]] as ColorPair)
}

function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  const remaining = [...b]
  for (const x of a) {
    const i = remaining.indexOf(x)
    if (i === -1) return false
    remaining.splice(i, 1)
  }
  return true
}

/**
 * Which of the 8 canonical corners this color set belongs to (by home-slot
 * index), or null if it's not a real corner's colors at all (e.g. two
 * opposite colors on one piece) — this null case *is* the corner-integrity
 * check: any 3 mutually-distinct, different-axis colors necessarily match
 * exactly one of the 8 real corners, since there are exactly 2^3 = 8 such
 * combinations and the solved cube has all 8.
 */
export function identifyCorner(colors: ColorTriple): number | null {
  const idx = SOLVED_CORNER_COLORS.findIndex((solved) => sameSet(solved, colors))
  return idx === -1 ? null : idx
}

export function identifyEdge(colors: ColorPair): number | null {
  const idx = SOLVED_EDGE_COLORS.findIndex((solved) => sameSet(solved, colors))
  return idx === -1 ? null : idx
}

function rotateTriple<T>(arr: readonly [T, T, T], n: number): [T, T, T] {
  const r = ((n % 3) + 3) % 3
  return [arr[r], arr[(r + 1) % 3], arr[(r + 2) % 3]]
}

/** 0, 1, or 2 — how many clockwise twists from "correctly oriented". */
export function cornerOrientation(identity: number, colors: ColorTriple): number | null {
  const solved = SOLVED_CORNER_COLORS[identity]
  for (let r = 0; r < 3; r++) {
    const rotated = rotateTriple(solved, r)
    if (rotated[0] === colors[0] && rotated[1] === colors[1] && rotated[2] === colors[2]) return r
  }
  return null
}

/** 0 (correct) or 1 (flipped). */
export function edgeOrientation(identity: number, colors: ColorPair): number | null {
  const solved = SOLVED_EDGE_COLORS[identity]
  if (solved[0] === colors[0] && solved[1] === colors[1]) return 0
  if (solved[0] === colors[1] && solved[1] === colors[0]) return 1
  return null
}

/**
 * Parity of a permutation given as `permutation[slot] = identity`.
 * Standard sum-of-(cycle length - 1) computation.
 */
export function permutationParity(permutation: readonly number[]): 0 | 1 {
  const visited = new Array(permutation.length).fill(false)
  let transpositions = 0
  for (let i = 0; i < permutation.length; i++) {
    if (visited[i]) continue
    let cycleLength = 0
    let j = i
    while (!visited[j]) {
      visited[j] = true
      j = permutation[j]
      cycleLength++
    }
    transpositions += cycleLength - 1
  }
  return (transpositions % 2) as 0 | 1
}
