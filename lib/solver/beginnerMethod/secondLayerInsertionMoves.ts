import type { CubeState } from '../../cube/types'
import type { Move } from '../../cube/moves'
import { currentSlotOf } from './geometry'
import { ownFacesOfSecondLayerEdge, matchedFaceAtSlot } from './secondLayerGeometry'
import { secondLayerInsertion } from './secondLayerInsertionAlgorithms'

/**
 * Inserts `identity` home. Precondition: already in the D-layer, matched
 * (call after `ejectSecondLayerEdgeMoves` + `alignSecondLayerEdgeMoves`).
 * Every matched configuration has a fully-preserving derived algorithm
 * (`secondLayerInsertionAlgorithms.ts`) — no placed-aware preference is
 * needed here, the same reasoning `cornerInsertionMoves.ts` documents for
 * why it doesn't need one either.
 */
export function secondLayerInsertionMoves(state: CubeState, identity: number): Move[] {
  const [own1, own2] = ownFacesOfSecondLayerEdge(identity)
  const slot = currentSlotOf(state, identity)
  const matchedFace = matchedFaceAtSlot(state, identity, slot)
  if (!matchedFace) {
    throw new Error(`secondLayerInsertionMoves: identity ${identity} at slot ${slot} is not matched`)
  }
  const otherFace = matchedFace === own1 ? own2 : own1
  return secondLayerInsertion(matchedFace, otherFace)
}
