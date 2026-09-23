import type { CubeState, Face, FaceletColor } from '../../cube/types'
import { SOLVED_EDGE_COLORS, readEdgeColors, edgeOrientation } from '../../cube/pieces'
import { facesOfSlot, layerOfSlot, currentSlotOf } from './geometry'

/**
 * Second-Layer Edge geometry (Phase C, Subsystem 4). Reuses `geometry.ts`'s
 * generic, already-verified slot/face/identity plumbing directly rather
 * than duplicating it — `facesOfSlot`, `layerOfSlot`, and `currentSlotOf`
 * were written generically over any edge identity/slot from the start
 * (Subsystem 2's own docstrings say so explicitly), so nothing here needs
 * a second copy of that logic. Only what's genuinely new for this stage
 * lives in this module: which 4 identities are second-layer targets, and
 * what "solved" and "aligned/matched" mean for them.
 *
 * Second-layer edges are structurally closer to first-layer corners than
 * to the white cross: each has 2 own faces (both side faces, never U/D),
 * not 1. Unlike corners, though, an edge only has 2 facelets total, so a
 * D-layer edge slot touches D plus exactly one side face — there is no
 * slot touching both own faces at once the way a corner's D-layer column
 * does. This is why alignment for this stage means something different
 * from Subsystems 2/3's "rotate D until the column touches the own
 * face(s)": here it means rotating D until the piece's side facelet is
 * showing the color that actually belongs to that side face (the
 * "matched" face) — see `matchedFaceAtSlot`.
 */

/**
 * The 4 second-layer target identities — derived by scanning every edge
 * slot for `layerOfSlot(slot) === 'E'`, exactly mirroring how
 * `WHITE_CROSS_EDGE_IDENTITIES` scans for slots touching white. Identity
 * numbering matches home-slot numbering by this codebase's existing
 * convention (D-045), so this is a direct filter over slot indices, not a
 * hand-typed `[8, 9, 10, 11]`.
 */
export const SECOND_LAYER_EDGE_IDENTITIES: readonly number[] = Array.from({ length: 12 }, (_, i) => i).filter(
  (i) => layerOfSlot(i) === 'E'
)

/** The 2 own (side) faces of a second-layer edge identity's home slot. */
export function ownFacesOfSecondLayerEdge(identity: number): [Face, Face] {
  return facesOfSlot(identity)
}

/**
 * The color, per the solved cube, that belongs to `identity` on `face` —
 * read directly from `SOLVED_EDGE_COLORS`/`facesOfSlot` rather than a
 * second hand-typed color table, the same derivation discipline every
 * other geometry module in this stage follows.
 */
export function ownColorForFace(identity: number, face: Face): FaceletColor {
  const faces = facesOfSlot(identity)
  const idx = faces.indexOf(face)
  if (idx === -1) {
    throw new Error(`ownColorForFace: identity ${identity} does not own face ${face}`)
  }
  return SOLVED_EDGE_COLORS[identity]![idx]!
}

export function isSecondLayerEdgeSolved(state: CubeState, identity: number): boolean {
  const slot = currentSlotOf(state, identity)
  if (slot !== identity) return false
  const colors = readEdgeColors(state)[slot]!
  return edgeOrientation(identity, colors) === 0
}

/**
 * Whether `identity`, currently sitting at `slot`, is "matched" there:
 * `slot` touches D plus one of `identity`'s own faces, AND the facelet on
 * that side face is showing the color that actually belongs to it (not
 * the other own color). A D-layer edge only has 2 possible own-face
 * adjacencies (own1's D-slot, own2's D-slot) and, for a fixed physical
 * orientation, exactly one of those two adjacencies can be matched — the
 * other necessarily shows the *other* own color on the side facelet
 * instead (D turns move a piece between adjacencies without changing
 * which color sits on which of its 2 facelets). Returns the matched face,
 * or `null` if `slot` isn't a D-layer slot touching an own face at all,
 * or touches one but isn't matched there.
 */
export function matchedFaceAtSlot(state: CubeState, identity: number, slot: number): Face | null {
  if (layerOfSlot(slot) !== 'D') return null
  const faces = facesOfSlot(slot)
  const sideFace = faces.find((f) => f !== 'D')
  if (!sideFace) return null
  const [own1, own2] = ownFacesOfSecondLayerEdge(identity)
  if (sideFace !== own1 && sideFace !== own2) return null
  const colors = readEdgeColors(state)[slot]!
  const idx = faces.indexOf(sideFace)
  return colors[idx] === ownColorForFace(identity, sideFace) ? sideFace : null
}
