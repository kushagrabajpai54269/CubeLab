import { FACES, type CubeState, type Face, type FaceletColor } from './types'

/**
 * Standard WCA color scheme for a solved cube: each face is a single solid
 * color. Opposite-face pairs are U/D, F/B, L/R.
 */
const SOLVED_FACE_COLOR: Record<Face, FaceletColor> = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  L: 'orange',
  R: 'red',
}

export function createSolvedCube(size = 3): CubeState {
  const facelets = {} as Record<Face, FaceletColor[]>
  for (const face of FACES) {
    facelets[face] = new Array(size * size).fill(SOLVED_FACE_COLOR[face])
  }
  return { size, facelets }
}

/**
 * Deep clone. The Move Engine (Phase A, step 2) must never mutate the state
 * it's given — every move produces a new CubeState — so this is what makes
 * that possible.
 */
export function cloneCubeState(state: CubeState): CubeState {
  const facelets = {} as Record<Face, FaceletColor[]>
  for (const face of FACES) {
    facelets[face] = [...state.facelets[face]]
  }
  return { size: state.size, facelets }
}

export function areCubeStatesEqual(a: CubeState, b: CubeState): boolean {
  if (a.size !== b.size) return false
  return FACES.every((face) =>
    a.facelets[face].every((color, i) => color === b.facelets[face][i])
  )
}

/**
 * A face is solved when all its facelets match each other — compared
 * against an arbitrary reference sticker on that face (its first one),
 * not a geometric "center", so this works for any puzzle size (D-003).
 */
export function isSolvedState(state: CubeState): boolean {
  return FACES.every((face) => {
    const [reference] = state.facelets[face]
    return state.facelets[face].every((color) => color === reference)
  })
}

/**
 * Flattens facelets into one array (FACES order) and back. Shared by the
 * Move Engine (moves.ts) and the piece decomposition used by the Validator
 * (pieces.ts) — kept here since it's fundamentally about the CubeState
 * representation, not about either consumer specifically.
 */
export function flattenFacelets(state: CubeState): FaceletColor[] {
  return FACES.flatMap((face) => state.facelets[face])
}

export function unflattenFacelets(flat: FaceletColor[], size: number): CubeState {
  const facelets = {} as Record<Face, FaceletColor[]>
  const perFace = size * size
  FACES.forEach((face, i) => {
    facelets[face] = flat.slice(i * perFace, (i + 1) * perFace)
  })
  return { size, facelets }
}

/**
 * The reverse of flattenFacelets: given a flat index (as used by
 * CORNER_FACELETS/EDGE_FACELETS), returns which face and within-face
 * facelet it refers to. Introduced for Subsystem 3 so the Validator's
 * logical piece/slot references (lib/cube/highlight.ts) can be resolved
 * back to facelet coordinates without either module hand-rolling the
 * FACES-order arithmetic.
 */
export function faceletAt(flatIndex: number, size: number): { face: Face; facelet: number } {
  const perFace = size * size
  const faceIndex = Math.floor(flatIndex / perFace)
  const face = FACES[faceIndex] as Face
  return { face, facelet: flatIndex % perFace }
}
