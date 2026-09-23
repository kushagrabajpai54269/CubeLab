import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { solveWhiteCross } from './whiteCross'
import { solveFirstLayerCorners } from './firstLayerCorners'
import { solveSecondLayerEdges } from './secondLayerEdges'
import { solveLastLayerOrientation } from './lastLayerOrientation'
import {
  solveLastLayerCornerPermutation,
  solveLastLayerEdgePermutation,
  solveLastLayerAlignment,
  solveLastLayerPermutation
} from './lastLayerPermutation'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import { isLastLayerOriented } from './lastLayerGeometry'
import { areLastLayerCornersPermuted, areLastLayerEdgesPermuted, isLastLayerPermuted } from './lastLayerPermutationGeometry'

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function solveToLastLayerPermutationStart(scramble: Move[]) {
  let state = applyMoves(createSolvedCube(), scramble)
  state = applyMoves(state, solveWhiteCross(state))
  state = applyMoves(state, solveFirstLayerCorners(state))
  state = applyMoves(state, solveSecondLayerEdges(state))
  state = applyMoves(state, solveLastLayerOrientation(state))
  return state
}

function expectF2LAndOLLSolved(state: ReturnType<typeof createSolvedCube>) {
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) expect(isWhiteCrossEdgeSolved(state, id)).toBe(true)
  for (const id of FIRST_LAYER_CORNER_IDENTITIES) expect(isFirstLayerCornerSolved(state, id)).toBe(true)
  for (const id of SECOND_LAYER_EDGE_IDENTITIES) expect(isSecondLayerEdgeSolved(state, id)).toBe(true)
  expect(isLastLayerOriented(state)).toBe(true)
}

describe('solveLastLayerPermutation: solved / already-permuted state', () => {
  it('returns [] on an already-solved cube', () => {
    expect(solveLastLayerPermutation(createSolvedCube())).toEqual([])
  })
})

describe('solveLastLayerCornerPermutation / solveLastLayerEdgePermutation / solveLastLayerAlignment', () => {
  it('corner-permutation step permutes corners relative to each other', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const state = solveToLastLayerPermutationStart([{ face, turns }])
        const moves = solveLastLayerCornerPermutation(state)
        const result = applyMoves(state, moves)
        
        let foundAlignedCorners = false
        for (const alignTurns of [0, 1, 2, 3] as const) {
          const aligned = alignTurns === 0 ? result : applyMoves(result, [{face: 'D', turns: alignTurns}])
          if (areLastLayerCornersPermuted(aligned)) {
             foundAlignedCorners = true
             break
          }
        }
        expect(foundAlignedCorners).toBe(true)
        expectF2LAndOLLSolved(result)
      }
    }
  })

  it('edge-permutation step permutes edges when corners are already permuted relatively', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const state = solveToLastLayerPermutationStart([{ face, turns }])
        const cpMoves = solveLastLayerCornerPermutation(state)
        const afterCp = applyMoves(state, cpMoves)
        const epMoves = solveLastLayerEdgePermutation(afterCp)
        const result = applyMoves(afterCp, epMoves)

        let foundAlignedEdges = false
        for (const alignTurns of [0, 1, 2, 3] as const) {
          const aligned = alignTurns === 0 ? result : applyMoves(result, [{face: 'D', turns: alignTurns}])
          if (areLastLayerEdgesPermuted(aligned)) {
             foundAlignedEdges = true
             break
          }
        }
        expect(foundAlignedEdges).toBe(true)
        expectF2LAndOLLSolved(result)
      }
    }
  })
})

describe('solveLastLayerPermutation: hand-selected scrambles', () => {
  const scrambles: Move[][] = [
    [{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'R', turns: 3 }, { face: 'U', turns: 3 }],
    [{ face: 'F', turns: 1 }, { face: 'R', turns: 1 }, { face: 'F', turns: 3 }, { face: 'R', turns: 3 }],
    [{ face: 'R', turns: 2 }, { face: 'U', turns: 2 }, { face: 'F', turns: 2 }, { face: 'D', turns: 2 }, { face: 'L', turns: 2 }, { face: 'B', turns: 2 }],
    Array.from({ length: 25 }, (_, i) => ({ face: FACES[i % 6]!, turns: TURNS[(i * 5) % 3]! })),
    Array.from({ length: 30 }, (_, i) => ({ face: FACES[(i * 3) % 6]!, turns: TURNS[(i * 2) % 3]! })),
  ]

  it('fully permutes the last layer (and preserves F2L + OLL) for each hand-selected scramble', () => {
    for (const scramble of scrambles) {
      const state = solveToLastLayerPermutationStart(scramble)
      const moves = solveLastLayerPermutation(state)
      const result = applyMoves(state, moves)
      expect(isLastLayerPermuted(result)).toBe(true)
      expectF2LAndOLLSolved(result)
    }
  })
})

describe('solveLastLayerPermutation: bounded randomized fuzz (seeded, reproducible)', () => {
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('800 seeded random legal scrambles all reach a fully permuted (solved) state', () => {
    const rand = mulberry32(0x0115eed)
    const TRIAL_COUNT = 800
    const SCRAMBLE_LENGTH = 25
    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      const state = solveToLastLayerPermutationStart(scramble)
      let moves: Move[]
      try {
        moves = solveLastLayerPermutation(state)
      } catch (e) {
        throw new Error(`Trial ${trial}: threw: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], error: ${e}`)
      }
      const result = applyMoves(state, moves)
      
      if (!isLastLayerPermuted(result)) {
        throw new Error(`Trial ${trial}: last layer not fully permuted. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
      }
      
      // Since OLL and PLL are solved, and F2L is preserved, the entire cube MUST be solved here.
      // But we check F2L just to be verbose about failure modes.
      for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
        if (!isWhiteCrossEdgeSolved(result, id)) {
          throw new Error(`Trial ${trial}: cross edge ${id} disturbed. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
        }
      }
      for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
        if (!isFirstLayerCornerSolved(result, id)) {
          throw new Error(`Trial ${trial}: first-layer corner ${id} disturbed. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
        }
      }
      for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
        if (!isSecondLayerEdgeSolved(result, id)) {
          throw new Error(`Trial ${trial}: second-layer edge ${id} disturbed. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
        }
      }
      if (!isLastLayerOriented(result)) {
        throw new Error(`Trial ${trial}: last-layer orientation disturbed. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
      }
    }
  })
})
