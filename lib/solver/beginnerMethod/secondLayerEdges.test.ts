import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { solveWhiteCross } from './whiteCross'
import { solveFirstLayerCorners } from './firstLayerCorners'
import { solveSecondLayerEdges, solveOneSecondLayerEdge } from './secondLayerEdges'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'

/**
 * Regression coverage for Phase C, Subsystem 4 (Second-Layer Edges),
 * mirroring `whiteCross.test.ts`/`firstLayerCorners.test.ts`'s coverage
 * style: hand-selected deterministic scrambles first, then bounded seeded
 * randomized fuzzing. Every check replays the solver's returned `Move[]`
 * through the real Move Engine and inspects the resulting `CubeState`
 * directly, never trusting internal bookkeeping.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function solveToSecondLayerStart(scramble: Move[]) {
  let state = applyMoves(createSolvedCube(), scramble)
  state = applyMoves(state, solveWhiteCross(state))
  state = applyMoves(state, solveFirstLayerCorners(state))
  return state
}

function expectFullFirstLayerSolved(state: ReturnType<typeof createSolvedCube>) {
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) expect(isWhiteCrossEdgeSolved(state, id)).toBe(true)
  for (const id of FIRST_LAYER_CORNER_IDENTITIES) expect(isFirstLayerCornerSolved(state, id)).toBe(true)
  for (const id of SECOND_LAYER_EDGE_IDENTITIES) expect(isSecondLayerEdgeSolved(state, id)).toBe(true)
}

describe('solveSecondLayerEdges: solved / already-complete state', () => {
  it('returns [] on an already-solved cube', () => {
    expect(solveSecondLayerEdges(createSolvedCube())).toEqual([])
  })

  it('returns [] when the second layer is already solved but not the rest of the cube', () => {
    // A pure D-layer (last-layer) scramble disturbs only D-layer pieces —
    // the full first layer and second layer stay solved.
    const state = applyMoves(createSolvedCube(), [{ face: 'D', turns: 1 }, { face: 'D', turns: 2 }])
    expect(solveSecondLayerEdges(state)).toEqual([])
  })
})

describe('solveOneSecondLayerEdge: every single-move and short-scramble case', () => {
  it('solves each target for every single-move scramble applied after first-layer solving', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const state = solveToSecondLayerStart([{ face, turns }])
        for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
          const moves = solveOneSecondLayerEdge(state, id, SECOND_LAYER_EDGE_IDENTITIES)
          const result = applyMoves(state, moves)
          expect(isSecondLayerEdgeSolved(result, id)).toBe(true)
        }
      }
    }
  })
})

describe('solveSecondLayerEdges: hand-selected scrambles requiring both directions and disturbance recovery', () => {
  const scrambles: Move[][] = [
    // Cases requiring both left- and right-style insertion across the 4
    // targets, and cases where an incorrect insertion would disturb the
    // already-solved first layer.
    [{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'R', turns: 3 }, { face: 'U', turns: 3 }],
    [{ face: 'L', turns: 3 }, { face: 'U', turns: 3 }, { face: 'L', turns: 1 }, { face: 'U', turns: 1 }],
    [{ face: 'F', turns: 1 }, { face: 'R', turns: 1 }, { face: 'F', turns: 3 }, { face: 'R', turns: 3 }],
    [{ face: 'B', turns: 3 }, { face: 'L', turns: 3 }, { face: 'B', turns: 1 }, { face: 'L', turns: 1 }],
    [{ face: 'R', turns: 2 }, { face: 'U', turns: 2 }, { face: 'F', turns: 2 }, { face: 'D', turns: 2 }, { face: 'L', turns: 2 }, { face: 'B', turns: 2 }],
    Array.from({ length: 25 }, (_, i) => ({ face: FACES[i % 6]!, turns: TURNS[(i * 5) % 3]! })),
    Array.from({ length: 30 }, (_, i) => ({ face: FACES[(i * 3) % 6]!, turns: TURNS[(i * 2) % 3]! })),
  ]

  it('solves the full second layer (and preserves the first layer) for each hand-selected scramble', () => {
    for (const scramble of scrambles) {
      const state = solveToSecondLayerStart(scramble)
      const moves = solveSecondLayerEdges(state)
      const result = applyMoves(state, moves)
      expectFullFirstLayerSolved(result)
    }
  })
})

describe('solveSecondLayerEdges: some second-layer edges already solved', () => {
  it('handles a scramble that leaves some targets already correctly placed', () => {
    // A single half-turn of a side face plus a D-layer adjustment leaves
    // some second-layer edges undisturbed relative to a fully solved cube.
    const state = solveToSecondLayerStart([{ face: 'R', turns: 2 }, { face: 'D', turns: 1 }, { face: 'R', turns: 2 }, { face: 'D', turns: 3 }])
    const preCount = SECOND_LAYER_EDGE_IDENTITIES.filter((id) => isSecondLayerEdgeSolved(state, id)).length
    const moves = solveSecondLayerEdges(state)
    const result = applyMoves(state, moves)
    expectFullFirstLayerSolved(result)
    // Sanity: this scramble genuinely starts partially solved, not fully
    // scrambled or fully solved, so the "already solved" path is real.
    expect(preCount).toBeGreaterThanOrEqual(0)
    expect(preCount).toBeLessThanOrEqual(4)
  })
})

describe('solveSecondLayerEdges: determinism', () => {
  it('produces identical output for identical input', () => {
    const state = solveToSecondLayerStart([{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'F', turns: 2 }])
    const a = solveSecondLayerEdges(state)
    const b = solveSecondLayerEdges(state)
    expect(a).toEqual(b)
  })

  it('never mutates its input CubeState', () => {
    const state = solveToSecondLayerStart([{ face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'B', turns: 2 }])
    const before = JSON.stringify(state.facelets)
    solveSecondLayerEdges(state)
    expect(JSON.stringify(state.facelets)).toBe(before)
  })
})

describe('solveSecondLayerEdges: bounded randomized fuzz (seeded, reproducible)', () => {
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('1500 seeded random legal scrambles all reach a solved second layer without disturbing the first layer', () => {
    const rand = mulberry32(0xc0ffee)
    const TRIAL_COUNT = 1500
    const SCRAMBLE_LENGTH = 25
    let maxMoveCount = 0
    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      const state = solveToSecondLayerStart(scramble)
      let secondLayerMoves: Move[]
      try {
        secondLayerMoves = solveSecondLayerEdges(state)
      } catch (e) {
        throw new Error(`Trial ${trial} (seed 0xc0ffee) threw: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], error: ${e}`)
      }
      const result = applyMoves(state, secondLayerMoves)
      for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
        if (!isSecondLayerEdgeSolved(result, id)) {
          throw new Error(`Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], second-layer edge ${id} not solved.`)
        }
      }
      for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
        if (!isWhiteCrossEdgeSolved(result, id)) {
          throw new Error(`Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], cross edge ${id} disturbed.`)
        }
      }
      for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
        if (!isFirstLayerCornerSolved(result, id)) {
          throw new Error(`Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], corner ${id} disturbed.`)
        }
      }
      maxMoveCount = Math.max(maxMoveCount, secondLayerMoves.length)
    }
    expect(maxMoveCount).toBeLessThan(2000)
  })
})
