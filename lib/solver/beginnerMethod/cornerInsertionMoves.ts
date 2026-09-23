import type { CubeState } from '../../cube/types'
import type { Move } from '../../cube/moves'
import { ownFacesOfCorner, currentCornerSlotOf, whiteFacingFaceOfCornerSlot } from './cornerGeometry'
import { cornerInsertion } from './cornerInsertionAlgorithms'

/**
 * Inserts `identity` home. Precondition: already in the D-layer, aligned
 * under its own column (call after `ejectCornerMoves` + `alignCornerMoves`).
 *
 * Unlike White Cross's facing-side edge case, every corner insertion case
 * (facing-own1, facing-own2, and facing-down) has a verified, fully
 * cross-and-sibling-preserving algorithm (`cornerInsertionAlgorithms.ts`,
 * D-047/D-048) — so no placed-aware preference is needed here the way
 * `insertionMoves.ts` needs one for edges. Facing-down has two equally
 * safe mirror algorithms (via own1 or own2); own1 is used deterministically
 * since neither disturbs anything.
 */
export function cornerInsertionMoves(state: CubeState, identity: number): Move[] {
  const [own1, own2] = ownFacesOfCorner(identity)
  const slot = currentCornerSlotOf(state, identity)
  const facing = whiteFacingFaceOfCornerSlot(state, slot)
  if (facing === own1) return cornerInsertion(own1, own2, own1)
  if (facing === own2) return cornerInsertion(own1, own2, own2)
  return cornerInsertion(own1, own2, 'D') // facing D (down)
}
