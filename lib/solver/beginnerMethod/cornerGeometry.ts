import type { CubeState, Face } from '../../cube/types'
import { faceletAt } from '../../cube/state'
import { CORNER_FACELETS } from '../../cube/tables'
import { SOLVED_CORNER_COLORS, identifyCorner, readCornerColors } from '../../cube/pieces'

/**
 * First-Layer Corner geometry (Phase C, Subsystem 3). Mirrors
 * `geometry.ts`'s approach exactly: everything derived from the existing,
 * already-verified `CORNER_FACELETS`/`SOLVED_CORNER_COLORS` tables (D-027),
 * nothing hand-typed.
 *
 * Corners are structurally simpler than edges in one respect: every corner
 * slot touches either U or D (never neither), so there is no third "E-layer"
 * case the way edges have — only two layers, 4 slots each.
 */

export type CornerLayer = 'U' | 'D'

export function cornerFacesOfSlot(slot: number): [Face, Face, Face] {
  const [a, b, c] = CORNER_FACELETS[slot]!
  return [faceletAt(a, 3).face, faceletAt(b, 3).face, faceletAt(c, 3).face]
}

export function layerOfCornerSlot(slot: number): CornerLayer {
  return cornerFacesOfSlot(slot).includes('U') ? 'U' : 'D'
}

/**
 * The 4 first-layer target identities — derived by scanning
 * `SOLVED_CORNER_COLORS` for entries containing white, exactly mirroring
 * `WHITE_CROSS_EDGE_IDENTITIES`'s derivation.
 */
export const FIRST_LAYER_CORNER_IDENTITIES: readonly number[] = SOLVED_CORNER_COLORS
  .map((colors, i) => (colors.includes('white') ? i : -1))
  .filter((i): i is number => i !== -1)

/**
 * The 2 side faces (never U/D) of a first-layer corner identity's home
 * slot. Target identities are their own home-slot indices, by the same
 * existing convention `ownFaceOf` (edges) relies on.
 */
export function ownFacesOfCorner(identity: number): [Face, Face] {
  return cornerFacesOfSlot(identity).filter((f): f is Face => f !== 'U') as [Face, Face]
}

export function currentCornerSlotOf(state: CubeState, identity: number): number {
  const colorsBySlot = readCornerColors(state)
  for (let slot = 0; slot < 8; slot++) {
    if (identifyCorner(colorsBySlot[slot]!) === identity) return slot
  }
  throw new Error(`currentCornerSlotOf: no corner with identity ${identity} found`)
}

export function whiteFacingFaceOfCornerSlot(state: CubeState, slot: number): Face {
  const faces = cornerFacesOfSlot(slot)
  const colors = readCornerColors(state)[slot]!
  return faces[colors.indexOf('white')]!
}

export function isFirstLayerCornerSolved(state: CubeState, identity: number): boolean {
  const slot = currentCornerSlotOf(state, identity)
  if (slot !== identity) return false
  return whiteFacingFaceOfCornerSlot(state, slot) === 'U'
}
