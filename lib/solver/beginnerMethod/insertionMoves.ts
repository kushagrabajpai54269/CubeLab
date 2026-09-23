import type { CubeState } from '../../cube/types'
import type { Move } from '../../cube/moves'
import { ownFaceOf, ringNeighborsOf, currentSlotOf, whiteFacingFaceOfSlot } from './geometry'
import { facingDownInsertion, facingSideInsertion } from './insertionAlgorithms'
import { isFaceHomeSolved } from './ejectAndAlign'

/**
 * Inserts `identity` home. Precondition: already in the D-layer, aligned
 * under its own column (call after `ejectMoves` + `alignmentMoves`).
 *
 * Facing down needs no choice (own face only, D-027-style verified
 * algorithm). Facing side unavoidably needs one of the 2 ring-neighbor
 * faces (proven in `insertionAlgorithms.ts`) — when both are valid,
 * prefer whichever is not a currently-solved edge's home face. This
 * preference is not optional polish: without it, two edges can
 * deterministically keep re-disturbing each other forever (found and
 * fixed during this subsystem's design investigation). `solveWhiteCross`'s
 * cycle detector is the hard backstop if this preference is ever
 * insufficient for some case this design didn't anticipate.
 */
export function insertionMoves(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  const own = ownFaceOf(identity)
  const slot = currentSlotOf(state, identity)
  const facing = whiteFacingFaceOfSlot(state, slot)
  if (facing === 'D') return facingDownInsertion(own)

  const [a, b] = ringNeighborsOf(own)
  const preferred = !isFaceHomeSolved(state, a, allTargets) ? a
    : !isFaceHomeSolved(state, b, allTargets) ? b
    : a
  return facingSideInsertion(own, preferred)
}
