import type { CubeState } from '../../cube/types'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import { isLastLayerOriented } from './lastLayerGeometry'
import { areLastLayerCornersPermuted, areLastLayerEdgesPermuted } from './lastLayerPermutationGeometry'

/**
 * Last-Layer Permutation algorithms (Phase C, Subsystem 6).
 * 
 * Instead of deriving 9+ move algorithms at module load via BFS (which is
 * computationally prohibitive in JavaScript at this depth), this module
 * *selects* standard PLL algorithms, translates them to the D layer, and
 * self-verifies them immediately on module load. This perfectly upholds the
 * D-039 / D-045 / D-046 project discipline: no algorithm is trusted blindly;
 * it must prove it preserves the First Two Layers (F2L) and the required
 * last-layer invariants when applied to a real CubeState.
 * 
 * The translations below were created by reflecting standard U-layer A-perm
 * and U-perm across the E-plane (swapping U/D and inverting F/B/R/L turn
 * direction) to avoid the chirality bugs caught during Subsystem 5's OLL
 * development.
 */

function verifyF2lPreserved(state: CubeState): void {
  if (!WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id))) throw new Error("F2L broken: White Cross")
  if (!FIRST_LAYER_CORNER_IDENTITIES.every((id) => isFirstLayerCornerSolved(state, id))) throw new Error("F2L broken: First Layer Corners")
  if (!SECOND_LAYER_EDGE_IDENTITIES.every((id) => isSecondLayerEdgeSolved(state, id))) throw new Error("F2L broken: Second Layer Edges")
}

// ---------------------------------------------------------
// Corner Permutation
// ---------------------------------------------------------

/**
 * A standard A-perm (swaps 3 corners), mirrored to the D layer.
 * U-layer equivalent: R' F R' B2 R F' R' B2 R2
 * Mirrored: R F' R B2 R' F R B2 R2
 */
const CORNER_PERMUTATION_STEP_MOVES: Move[] = [
  { face: 'R', turns: 1 },
  { face: 'F', turns: 3 },
  { face: 'R', turns: 1 },
  { face: 'B', turns: 2 },
  { face: 'R', turns: 3 },
  { face: 'F', turns: 1 },
  { face: 'R', turns: 1 },
  { face: 'B', turns: 2 },
  { face: 'R', turns: 2 },
]

// Self-verify the corner permutation step on load
;(() => {
  const solved = createSolvedCube()
  const result = applyMoves(solved, CORNER_PERMUTATION_STEP_MOVES)
  
  verifyF2lPreserved(result)
  
  if (!isLastLayerOriented(result)) {
    throw new Error('PLL corner step disturbed last-layer orientation')
  }
  
  if (!areLastLayerEdgesPermuted(result)) {
    throw new Error('PLL corner step disturbed last-layer edge permutation')
  }
  
  if (areLastLayerCornersPermuted(result)) {
    throw new Error('PLL corner step failed to disturb last-layer corner permutation')
  }
})()

export function cornerPermutationStepMoves(): Move[] {
  return [...CORNER_PERMUTATION_STEP_MOVES]
}

// ---------------------------------------------------------
// Edge Permutation
// ---------------------------------------------------------

/**
 * A standard U-perm (swaps 3 edges), mirrored to the D layer.
 * U-layer equivalent: R U' R U R U R U' R' U' R2
 * Mirrored: R' D R' D' R' D' R' D R D R2
 */
const EDGE_PERMUTATION_STEP_MOVES: Move[] = [
  { face: 'R', turns: 3 },
  { face: 'D', turns: 1 },
  { face: 'R', turns: 3 },
  { face: 'D', turns: 3 },
  { face: 'R', turns: 3 },
  { face: 'D', turns: 3 },
  { face: 'R', turns: 3 },
  { face: 'D', turns: 1 },
  { face: 'R', turns: 1 },
  { face: 'D', turns: 1 },
  { face: 'R', turns: 2 },
]

// Self-verify the edge permutation step on load
;(() => {
  const solved = createSolvedCube()
  const result = applyMoves(solved, EDGE_PERMUTATION_STEP_MOVES)
  
  verifyF2lPreserved(result)
  
  if (!isLastLayerOriented(result)) {
    throw new Error('PLL edge step disturbed last-layer orientation')
  }
  
  if (!areLastLayerCornersPermuted(result)) {
    throw new Error('PLL edge step disturbed last-layer corner permutation')
  }
  
  if (areLastLayerEdgesPermuted(result)) {
    throw new Error('PLL edge step failed to disturb last-layer edge permutation')
  }
})()

export function edgePermutationStepMoves(): Move[] {
  return [...EDGE_PERMUTATION_STEP_MOVES]
}
