import type { CubeState, Face } from '../../cube/types'
import { faceletAt } from '../../cube/state'
import { EDGE_FACELETS } from '../../cube/tables'
import { SOLVED_EDGE_COLORS, identifyEdge, readEdgeColors } from '../../cube/pieces'

/**
 * White Cross geometry (Phase C, Subsystem 2). Every fact here is derived
 * from the existing, already-verified `EDGE_FACELETS`/`SOLVED_EDGE_COLORS`
 * tables (D-027) rather than hand-typed — a future re-derivation of those
 * tables would not silently break this module's assumptions.
 */

/** Which layer an edge slot belongs to, purely from which face-blocks its
 * two facelets fall in — 'U' or 'D' if either facelet touches that face,
 * else 'E' (touches only two side faces). */
export type EdgeLayer = 'U' | 'E' | 'D'

export function facesOfSlot(slot: number): [Face, Face] {
  const [a, b] = EDGE_FACELETS[slot]!
  return [faceletAt(a, 3).face, faceletAt(b, 3).face]
}

export function layerOfSlot(slot: number): EdgeLayer {
  const [faceA, faceB] = facesOfSlot(slot)
  if (faceA === 'U' || faceB === 'U') return 'U'
  if (faceA === 'D' || faceB === 'D') return 'D'
  return 'E'
}

/**
 * The 4 white-cross target identities — derived by scanning
 * `SOLVED_EDGE_COLORS` for entries containing white, not hardcoded as
 * `[0,1,2,3]`, so a future reordering of the underlying tables can't
 * silently desync this module from them.
 */
export const WHITE_CROSS_EDGE_IDENTITIES: readonly number[] = SOLVED_EDGE_COLORS
  .map((colors, i) => (colors.includes('white') ? i : -1))
  .filter((i): i is number => i !== -1)

/**
 * The single side face (F/R/B/L) that is "home" for a white-cross edge
 * identity — the non-U face of that identity's own home slot. Target
 * identities are their own home-slot indices by this codebase's existing
 * convention (identity numbering matches `EDGE_FACELETS` slot numbering,
 * since `SOLVED_EDGE_COLORS[j]` is derived by reading the solved cube at
 * `EDGE_FACELETS[j]`) — so this reads `EDGE_FACELETS[identity]` directly
 * rather than maintaining a second, separate identity-to-face table.
 */
export function ownFaceOf(identity: number): Face {
  const [faceA, faceB] = facesOfSlot(identity)
  return faceA === 'U' ? faceB : faceA
}

/**
 * The 2 side faces adjacent to a given face — derived by scanning every
 * E-layer edge slot for one touching `face` and recording the other side
 * of it, rather than hand-typing a ring order (F-R-B-L) that would be easy
 * to get backwards and hard to notice.
 */
export function ringNeighborsOf(face: Face): [Face, Face] {
  const neighbors: Face[] = []
  for (let slot = 0; slot < 12; slot++) {
    if (layerOfSlot(slot) !== 'E') continue
    const [faceA, faceB] = facesOfSlot(slot)
    if (faceA === face) neighbors.push(faceB)
    else if (faceB === face) neighbors.push(faceA)
  }
  if (neighbors.length !== 2) {
    throw new Error(`ringNeighborsOf(${face}): expected exactly 2 neighbors, found ${neighbors.length}`)
  }
  return [neighbors[0]!, neighbors[1]!]
}

/** Which of the 12 slots currently holds the piece with this identity. */
export function currentSlotOf(state: CubeState, identity: number): number {
  const colorsBySlot = readEdgeColors(state)
  for (let slot = 0; slot < 12; slot++) {
    if (identifyEdge(colorsBySlot[slot]!) === identity) return slot
  }
  throw new Error(`currentSlotOf: no edge with identity ${identity} found (colorsBySlot may be malformed)`)
}

/** Which face currently shows the white facelet of whatever piece sits at `slot`. */
export function whiteFacingFaceOfSlot(state: CubeState, slot: number): Face {
  const [faceA, faceB] = facesOfSlot(slot)
  const colors = readEdgeColors(state)[slot]!
  return colors[0] === 'white' ? faceA : faceB
}

export function isWhiteCrossEdgeSolved(state: CubeState, identity: number): boolean {
  const slot = currentSlotOf(state, identity)
  if (slot !== identity) return false // target identities are their own home slot
  return whiteFacingFaceOfSlot(state, slot) === 'U'
}
