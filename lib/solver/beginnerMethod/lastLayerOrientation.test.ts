import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { solveWhiteCross } from './whiteCross'
import { solveFirstLayerCorners } from './firstLayerCorners'
import { solveSecondLayerEdges } from './secondLayerEdges'
import {
  solveLastLayerEdgeOrientation,
  solveLastLayerCornerOrientation,
  solveLastLayerOrientation,
} from './lastLayerOrientation'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import { areAllLastLayerEdgesOriented, areAllLastLayerCornersOriented, isLastLayerOriented } from './lastLayerGeometry'

/**
 * Regression coverage for Phase C, Subsystem 5 (Last-Layer Orientation)
 * end-to-end, mirroring earlier subsystems' coverage style:
 * hand-selected deterministic scrambles first, then bounded seeded
 * randomized fuzzing. Every check replays the solver's returned `Move[]`
 * through the real Move Engine and inspects the resulting `CubeState`
 * directly, never trusting internal bookkeeping.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function solveToLastLayerStart(scramble: Move[]) {
  let state = applyMoves(createSolvedCube(), scramble)
  state = applyMoves(state, solveWhiteCross(state))
  state = applyMoves(state, solveFirstLayerCorners(state))
  state = applyMoves(state, solveSecondLayerEdges(state))
  return state
}

function expectFirstTwoLayersSolved(state: ReturnType<typeof createSolvedCube>) {
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) expect(isWhiteCrossEdgeSolved(state, id)).toBe(true)
  for (const id of FIRST_LAYER_CORNER_IDENTITIES) expect(isFirstLayerCornerSolved(state, id)).toBe(true)
  for (const id of SECOND_LAYER_EDGE_IDENTITIES) expect(isSecondLayerEdgeSolved(state, id)).toBe(true)
}

describe('solveLastLayerOrientation: solved / already-oriented state', () => {
  it('returns [] on an already-solved cube', () => {
    expect(solveLastLayerOrientation(createSolvedCube())).toEqual([])
  })

  it('returns [] when the last layer happens to already be oriented (e.g. a pure D scramble)', () => {
    const state = applyMoves(createSolvedCube(), [{ face: 'D', turns: 1 }, { face: 'D', turns: 2 }])
    expect(solveLastLayerOrientation(state)).toEqual([])
  })
})

describe('solveLastLayerEdgeOrientation / solveLastLayerCornerOrientation: individually', () => {
  it('edge-orientation step alone fully orients edges for every single-move scramble', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const state = solveToLastLayerStart([{ face, turns }])
        const moves = solveLastLayerEdgeOrientation(state)
        const result = applyMoves(state, moves)
        expect(areAllLastLayerEdgesOriented(result)).toBe(true)
        expectFirstTwoLayersSolved(result)
      }
    }
  })

  it('corner-orientation step alone fully orients corners when edges are already oriented', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const state = solveToLastLayerStart([{ face, turns }])
        const edgeMoves = solveLastLayerEdgeOrientation(state)
        const afterEdges = applyMoves(state, edgeMoves)
        const cornerMoves = solveLastLayerCornerOrientation(afterEdges)
        const result = applyMoves(afterEdges, cornerMoves)
        expect(areAllLastLayerCornersOriented(result)).toBe(true)
        expect(areAllLastLayerEdgesOriented(result)).toBe(true)
        expectFirstTwoLayersSolved(result)
      }
    }
  })
})

describe('solveLastLayerOrientation: hand-selected scrambles', () => {
  const scrambles: Move[][] = [
    [{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'R', turns: 3 }, { face: 'U', turns: 3 }],
    [{ face: 'F', turns: 1 }, { face: 'R', turns: 1 }, { face: 'F', turns: 3 }, { face: 'R', turns: 3 }],
    [{ face: 'R', turns: 2 }, { face: 'U', turns: 2 }, { face: 'F', turns: 2 }, { face: 'D', turns: 2 }, { face: 'L', turns: 2 }, { face: 'B', turns: 2 }],
    Array.from({ length: 25 }, (_, i) => ({ face: FACES[i % 6]!, turns: TURNS[(i * 5) % 3]! })),
    Array.from({ length: 30 }, (_, i) => ({ face: FACES[(i * 3) % 6]!, turns: TURNS[(i * 2) % 3]! })),
  ]

  it('fully orients the last layer (and preserves the first two layers) for each hand-selected scramble', () => {
    for (const scramble of scrambles) {
      const state = solveToLastLayerStart(scramble)
      const moves = solveLastLayerOrientation(state)
      const result = applyMoves(state, moves)
      expect(isLastLayerOriented(result)).toBe(true)
      expectFirstTwoLayersSolved(result)
    }
  })
})

describe('solveLastLayerOrientation: determinism', () => {
  it('produces identical output for identical input', () => {
    const state = solveToLastLayerStart([{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'F', turns: 2 }])
    const a = solveLastLayerOrientation(state)
    const b = solveLastLayerOrientation(state)
    expect(a).toEqual(b)
  })

  it('never mutates its input CubeState', () => {
    const state = solveToLastLayerStart([{ face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'B', turns: 2 }])
    const before = JSON.stringify(state.facelets)
    solveLastLayerOrientation(state)
    expect(JSON.stringify(state.facelets)).toBe(before)
  })
})

describe('solveLastLayerOrientation: bounded randomized fuzz (seeded, reproducible)', () => {
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('800 seeded random legal scrambles all reach a fully oriented last layer without disturbing the first two layers', () => {
    const rand = mulberry32(0x0115eed)
    const TRIAL_COUNT = 800
    const SCRAMBLE_LENGTH = 25
    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      const state = solveToLastLayerStart(scramble)
      let moves: Move[]
      try {
        moves = solveLastLayerOrientation(state)
      } catch (e) {
        throw new Error(`Trial ${trial}: threw: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], error: ${e}`)
      }
      const result = applyMoves(state, moves)
      if (!isLastLayerOriented(result)) {
        throw new Error(`Trial ${trial}: last layer not fully oriented. scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
      }
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
    }
  })
})
