import type { CubeState, Face, FaceletColor } from '../../cube/types'
import { createSolvedCube } from '../../cube/state'
import { readEdgeColors, readCornerColors } from '../../cube/pieces'
import { facesOfSlot, layerOfSlot, ringNeighborsOf } from './geometry'
import { cornerFacesOfSlot, layerOfCornerSlot } from './cornerGeometry'

/**
 * Last-Layer Orientation geometry (Phase C, Subsystem 5). Mirrors
 * `geometry.ts`/`cornerGeometry.ts` exactly: everything derived from the
 * already-verified per-slot face tables, nothing hand-typed.
 *
 * Unlike every earlier Beginner Method stage, this one deliberately does
 * NOT key off piece *identity* at all -- White Cross/First-Layer
 * Corners/Second-Layer Edges each track "does identity N sit in its own
 * home slot, correctly oriented", because Subsystems 2-4 solve both
 * position and orientation together. 2-look OLL solves orientation only;
 * permutation is Subsystem 6 (PLL)'s job. So "solved" here means "the
 * piece currently sitting in this D-layer slot has its D-facelet showing
 * D's own color", regardless of which piece that is or whether it's in
 * its ultimate home slot -- exactly the D-039 lesson applied in the
 * opposite direction: don't smuggle in a permutation assumption this
 * stage's actual goal doesn't need.
 *
 * D (yellow) is this codebase's last-layer face -- White Cross/First-Layer
 * Corners build on U, Second-Layer Edges on E, so D is left as the final
 * layer, mirroring the standard method's own "cross first, opposite face
 * last" order (D-045..D-049 all build this same way; nothing here departs
 * from that established convention).
 */

const SOLVED = createSolvedCube()
/** Center facelet index for a 3x3 face is 4 (row-major, middle cell). */
function solvedColorOf(face: Face): FaceletColor {
  return SOLVED.facelets[face][4]!
}

/** D's own solved color (yellow) -- read from the solved cube rather than
 * hardcoded, so this stays correct if the color scheme (D-010) ever
 * changes. */
export const LAST_LAYER_COLOR: FaceletColor = solvedColorOf('D')

/** The 4 edge slots in the D layer -- derived by scanning every edge slot
 * for `layerOfSlot(slot) === 'D'`, exactly mirroring how
 * `SECOND_LAYER_EDGE_IDENTITIES` scans for `'E'`. */
export const LAST_LAYER_EDGE_SLOTS: readonly number[] = Array.from({ length: 12 }, (_, i) => i).filter(
  (i) => layerOfSlot(i) === 'D'
)

/** The 4 corner slots in the D layer -- derived by scanning every corner
 * slot for `layerOfCornerSlot(slot) === 'D'`. */
export const LAST_LAYER_CORNER_SLOTS: readonly number[] = Array.from({ length: 8 }, (_, i) => i).filter(
  (i) => layerOfCornerSlot(i) === 'D'
)

/** The color currently showing on the D face at a given D-layer edge slot. */
export function dColorAtEdgeSlot(state: CubeState, slot: number): FaceletColor {
  const faces = facesOfSlot(slot)
  const idx = faces.indexOf('D')
  if (idx === -1) throw new Error(`dColorAtEdgeSlot: slot ${slot} does not touch D`)
  return readEdgeColors(state)[slot]![idx]!
}

/** The color currently showing on the D face at a given D-layer corner slot. */
export function dColorAtCornerSlot(state: CubeState, slot: number): FaceletColor {
  const faces = cornerFacesOfSlot(slot)
  const idx = faces.indexOf('D')
  if (idx === -1) throw new Error(`dColorAtCornerSlot: slot ${slot} does not touch D`)
  return readCornerColors(state)[slot]![idx]!
}

/** The single side face (F/R/B/L) of a D-layer edge slot -- the non-D
 * member of `facesOfSlot`. */
export function sideFaceOfEdgeSlot(slot: number): Face {
  const [a, b] = facesOfSlot(slot)
  return a === 'D' ? b : a
}

/** The 2 side faces (F/R/B/L) of a D-layer corner slot -- every member of
 * `cornerFacesOfSlot` other than D. */
export function sideFacesOfCornerSlot(slot: number): [Face, Face] {
  return cornerFacesOfSlot(slot).filter((f): f is Face => f !== 'D') as [Face, Face]
}

/** Whether the piece currently sitting at `slot` (a D-layer edge slot) is
 * correctly oriented -- its D-facelet shows D's own color. */
export function isLastLayerEdgeOriented(state: CubeState, slot: number): boolean {
  return dColorAtEdgeSlot(state, slot) === LAST_LAYER_COLOR
}

/** Whether the piece currently sitting at `slot` (a D-layer corner slot) is
 * correctly oriented -- its D-facelet shows D's own color. */
export function isLastLayerCornerOriented(state: CubeState, slot: number): boolean {
  return dColorAtCornerSlot(state, slot) === LAST_LAYER_COLOR
}

export function areAllLastLayerEdgesOriented(state: CubeState): boolean {
  return LAST_LAYER_EDGE_SLOTS.every((slot) => isLastLayerEdgeOriented(state, slot))
}

export function areAllLastLayerCornersOriented(state: CubeState): boolean {
  return LAST_LAYER_CORNER_SLOTS.every((slot) => isLastLayerCornerOriented(state, slot))
}

/** The full 2-look-OLL goal: every D-layer edge AND corner oriented. */
export function isLastLayerOriented(state: CubeState): boolean {
  return areAllLastLayerEdgesOriented(state) && areAllLastLayerCornersOriented(state)
}

/**
 * The side face diagonally opposite `face` among the 4 side faces
 * (F/R/B/L) -- derived as "whichever side face isn't `face` itself and
 * isn't one of `face`'s 2 ring-neighbors", not a hand-typed F<->B/L<->R
 * table, so this can't silently desync from `ringNeighborsOf`'s own
 * (already-verified) derivation.
 */
export function oppositeSideFaceOf(face: Face): Face {
  const neighbors = ringNeighborsOf(face)
  const sideFaces: Face[] = ['F', 'R', 'B', 'L']
  const opposite = sideFaces.find((f) => f !== face && !neighbors.includes(f))
  if (!opposite) throw new Error(`oppositeSideFaceOf: no opposite face found for ${face}`)
  return opposite
}

/** Map from side face (F/R/B/L) to its D-layer edge slot -- built once by
 * scanning `LAST_LAYER_EDGE_SLOTS`, not hand-typed. */
export const LAST_LAYER_EDGE_SLOT_OF_FACE: ReadonlyMap<Face, number> = new Map(
  LAST_LAYER_EDGE_SLOTS.map((slot) => [sideFaceOfEdgeSlot(slot), slot])
)
