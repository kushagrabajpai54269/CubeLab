import type { CubeState } from '../../cube/types'
import { flattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import {
  countHomeLastLayerCorners,
  countHomeLastLayerEdges,
  isLastLayerPermuted
} from './lastLayerPermutationGeometry'
import { cornerPermutationStepMoves, edgePermutationStepMoves } from './lastLayerPermutationAlgorithms'

/**
 * Last-Layer Permutation / PLL (Phase C, Subsystem 6) — the fifth and final
 * Beginner Method solving stage. 
 *
 * Runs after Last-Layer Orientation (Subsystem 5). Solves the permutation
 * of the 4 D-layer corners, then the 4 D-layer edges, bringing the cube to
 * a fully solved state.
 *
 * Like Subsystem 5, this stage uses a "general step + search" approach
 * rather than hand-classifying the 21 standard PLL cases.
 * 
 * 1. Corner Permutation: Uses the `cornerPermutationStepMoves` (an A-perm
 *    analogue) inside a bounded round-level search over D-rotation offsets.
 *    At most 2 applications are required to permute all 4 corners relative
 *    to each other.
 * 
 * 2. Edge Permutation: Uses the `edgePermutationStepMoves` (a U-perm
 *    analogue) inside a similar bounded round-level search. At most 2
 *    applications are required to permute all 4 edges.
 * 
 * Finally, a single D rotation aligns the last layer with the first two
 * layers, completing the solve.
 */

const PLL_ROUND_SEARCH_DEPTH = 3

function stateKey(state: CubeState): string {
  return flattenFacelets(state).join(',')
}

function isCornerPermutedRelative(state: CubeState): boolean {
  for (const turns of [0, 1, 2, 3] as const) {
    const rotated = turns === 0 ? state : applyMoves(state, [{ face: 'D', turns }])
    if (countHomeLastLayerCorners(rotated) === 4) return true
  }
  return false
}

function isLastLayerPermutedRelative(state: CubeState): boolean {
  for (const turns of [0, 1, 2, 3] as const) {
    const rotated = turns === 0 ? state : applyMoves(state, [{ face: 'D', turns }])
    if (isLastLayerPermuted(rotated)) return true
  }
  return false
}

export function solveLastLayerCornerPermutation(state: CubeState): Move[] {
  if (isCornerPermutedRelative(state)) return []

  const step = cornerPermutationStepMoves()

  type Node = { state: CubeState; path: readonly (0 | 1 | 2 | 3)[] }
  let frontier: Node[] = [{ state, path: [] }]
  const seen = new Set<string>([stateKey(state)])

  for (let depth = 0; depth < PLL_ROUND_SEARCH_DEPTH; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (const turns of [0, 1, 2, 3] as const) {
        const rotated = turns === 0 ? node.state : applyMoves(node.state, [{ face: 'D', turns }])
        const applied = applyMoves(rotated, step)
        if (isCornerPermutedRelative(applied)) {
          const path = [...node.path, turns]
          let moves: Move[] = []
          for (const t of path) {
            if (t !== 0) moves.push({ face: 'D', turns: t })
            moves = moves.concat(step)
          }
          return moves
        }
        const key = stateKey(applied)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ state: applied, path: [...node.path, turns] })
      }
    }
    frontier = next
  }

  throw new Error(
    `solveLastLayerCornerPermutation: no converging sequence found within ${PLL_ROUND_SEARCH_DEPTH} rounds -- ` +
      'this indicates a genuine defect, not a slow-but-eventual case.'
  )
}

export function solveLastLayerEdgePermutation(state: CubeState): Move[] {
  if (isLastLayerPermutedRelative(state)) return []

  const step = edgePermutationStepMoves()

  type Node = { state: CubeState; path: readonly (0 | 1 | 2 | 3)[] }
  let frontier: Node[] = [{ state, path: [] }]
  const seen = new Set<string>([stateKey(state)])

  for (let depth = 0; depth < PLL_ROUND_SEARCH_DEPTH; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (const turns of [0, 1, 2, 3] as const) {
        const rotated = turns === 0 ? node.state : applyMoves(node.state, [{ face: 'D', turns }])
        const applied = applyMoves(rotated, step)
        if (isLastLayerPermutedRelative(applied)) {
          const path = [...node.path, turns]
          let moves: Move[] = []
          for (const t of path) {
            if (t !== 0) moves.push({ face: 'D', turns: t })
            moves = moves.concat(step)
          }
          return moves
        }
        const key = stateKey(applied)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ state: applied, path: [...node.path, turns] })
      }
    }
    frontier = next
  }

  throw new Error(
    `solveLastLayerEdgePermutation: no converging sequence found within ${PLL_ROUND_SEARCH_DEPTH} rounds -- ` +
      'this indicates a genuine defect, not a slow-but-eventual case.'
  )
}

export function solveLastLayerAlignment(state: CubeState): Move[] {
  for (const turns of [0, 1, 2, 3] as const) {
    const rotated = turns === 0 ? state : applyMoves(state, [{ face: 'D', turns }])
    if (isLastLayerPermuted(rotated)) {
      return turns === 0 ? [] : [{ face: 'D', turns }]
    }
  }
  throw new Error('solveLastLayerAlignment: no D rotation fully solved the cube, permutation is broken.')
}

export function solveLastLayerPermutation(state: CubeState): Move[] {
  if (isLastLayerPermuted(state)) return []

  let moves: Move[] = []
  let current = state

  const cornerMoves = solveLastLayerCornerPermutation(current)
  moves = moves.concat(cornerMoves)
  current = applyMoves(current, cornerMoves)

  const edgeMoves = solveLastLayerEdgePermutation(current)
  moves = moves.concat(edgeMoves)
  current = applyMoves(current, edgeMoves)

  const alignMoves = solveLastLayerAlignment(current)
  moves = moves.concat(alignMoves)
  current = applyMoves(current, alignMoves)

  if (!isLastLayerPermuted(current)) {
    throw new Error(
      'solveLastLayerPermutation: last layer not fully permuted after corner, edge, and alignment steps.'
    )
  }

  return moves
}
