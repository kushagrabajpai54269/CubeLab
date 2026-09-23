import type { CubeState } from '../../cube/types'
import { LAST_LAYER_CORNER_SLOTS, LAST_LAYER_EDGE_SLOTS } from './lastLayerGeometry'
import { currentSlotOf } from './geometry'
import { currentCornerSlotOf } from './cornerGeometry'

/**
 * Last-Layer Permutation geometry (Phase C, Subsystem 6).
 * 
 * Reintroduces piece-identity tracking for the D layer. Unlike Subsystem 5 (OLL)
 * which only cared that *some* piece in a slot had its D facelet colored yellow,
 * this stage cares exactly *which* piece is in which slot.
 * 
 * A piece's identity is its home slot index (0-11 for edges, 0-7 for corners).
 * For the last layer (D layer), the home slots are exactly those in 
 * `LAST_LAYER_EDGE_SLOTS` and `LAST_LAYER_CORNER_SLOTS`.
 */

/** Returns true if the corner with the given identity is currently sitting in its home slot. */
export function isLastLayerCornerInHomeSlot(state: CubeState, identity: number): boolean {
  if (!LAST_LAYER_CORNER_SLOTS.includes(identity)) {
    throw new Error(`Identity ${identity} is not a last-layer corner`)
  }
  return currentCornerSlotOf(state, identity) === identity
}

/** Returns true if the edge with the given identity is currently sitting in its home slot. */
export function isLastLayerEdgeInHomeSlot(state: CubeState, identity: number): boolean {
  if (!LAST_LAYER_EDGE_SLOTS.includes(identity)) {
    throw new Error(`Identity ${identity} is not a last-layer edge`)
  }
  return currentSlotOf(state, identity) === identity
}

/** 
 * Returns the number of last-layer corners that are currently in their exact home slots.
 * Useful for evaluating permutation state (e.g., seeing if a D alignment solves corners).
 */
export function countHomeLastLayerCorners(state: CubeState): number {
  return LAST_LAYER_CORNER_SLOTS.filter(identity => isLastLayerCornerInHomeSlot(state, identity)).length
}

/** 
 * Returns the number of last-layer edges that are currently in their exact home slots.
 */
export function countHomeLastLayerEdges(state: CubeState): number {
  return LAST_LAYER_EDGE_SLOTS.filter(identity => isLastLayerEdgeInHomeSlot(state, identity)).length
}

/** 
 * Returns true if all 4 last-layer corners are in their exact home slots. 
 * (This means corner permutation is fully solved and correctly aligned with the rest of the cube).
 */
export function areLastLayerCornersPermuted(state: CubeState): boolean {
  return countHomeLastLayerCorners(state) === 4
}

/** 
 * Returns true if all 4 last-layer edges are in their exact home slots. 
 */
export function areLastLayerEdgesPermuted(state: CubeState): boolean {
  return countHomeLastLayerEdges(state) === 4
}

/** 
 * The full PLL goal: every D-layer corner AND edge is in its own home slot.
 * If OLL is also solved (which is guaranteed not to be broken by PLL), the cube is fully solved.
 */
export function isLastLayerPermuted(state: CubeState): boolean {
  return areLastLayerCornersPermuted(state) && areLastLayerEdgesPermuted(state)
}
