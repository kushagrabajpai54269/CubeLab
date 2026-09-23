import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCubeState, areCubeStatesEqual } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { solveWhiteCross } from './whiteCross'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { solveFirstLayerCorners } from './firstLayerCorners'

/**
 * Regression coverage for Phase C, Subsystem 3 (First-Layer Corners).
 * Every test solves the White Cross FIRST (the real pipeline order), then
 * First-Layer Corners, and verifies BOTH remain solved -- not just the
 * corners in isolation.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function allSingleMoves(): Move[] {
  return FACES.flatMap((face) => TURNS.map((turns) => ({ face, turns })))
}

function expectFirstLayerSolved(scramble: Move[]) {
  const scrambled = applyMoves(createSolvedCube(), scramble)
  const crossMoves = solveWhiteCross(scrambled)
  const afterCross = applyMoves(scrambled, crossMoves)
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
    if (!isWhiteCrossEdgeSolved(afterCross, id)) {
      throw new Error(`White Cross itself not solved after scramble [${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
    }
  }

  const before = cloneCubeState(afterCross)
  const cornerMoves = solveFirstLayerCorners(afterCross)
  // Non-mutation
  expect(areCubeStatesEqual(afterCross, before)).toBe(true)

  const result = applyMoves(afterCross, cornerMoves)
  for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
    if (!isFirstLayerCornerSolved(result, id)) {
      throw new Error(
        `Corners not solved after scramble [${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}] ` +
        `+ corner moves [${cornerMoves.map((m) => `${m.face}${m.turns}`).join(' ')}]: identity ${id} not home.`
      )
    }
  }
  // Critically: the White Cross must STILL be solved after corner insertion.
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
    if (!isWhiteCrossEdgeSolved(result, id)) {
      throw new Error(
        `White Cross was disturbed by corner insertion after scramble [${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}] ` +
        `+ corner moves [${cornerMoves.map((m) => `${m.face}${m.turns}`).join(' ')}]: cross identity ${id} no longer home.`
      )
    }
  }
}

describe('solveFirstLayerCorners: solved cube', () => {
  it('returns no moves for an already-solved cube', () => {
    expect(solveFirstLayerCorners(createSolvedCube())).toEqual([])
  })
})

describe('solveFirstLayerCorners: every single move from solved (18 cases)', () => {
  it('solves the full first layer after every single move', () => {
    for (const move of allSingleMoves()) expectFirstLayerSolved([move])
  })
})

describe('solveFirstLayerCorners: every pair of moves from solved (324 cases)', () => {
  it('solves the full first layer after every pair of moves', () => {
    const singles = allSingleMoves()
    for (const first of singles) {
      for (const second of singles) {
        expectFirstLayerSolved([first, second])
      }
    }
  })
})

describe('solveFirstLayerCorners: regression for the U-turn cross-disturbance bug found during development', () => {
  it('U1 (and U2, U3) previously caused corner insertion to disturb the already-solved White Cross (a diagonal-slot eject via a foreign face) — now repaired by the round-robin cross-recheck', () => {
    expectFirstLayerSolved([{ face: 'U', turns: 1 }])
    expectFirstLayerSolved([{ face: 'U', turns: 2 }])
    expectFirstLayerSolved([{ face: 'U', turns: 3 }])
  })
})

describe('solveFirstLayerCorners: longer, varied deterministic scrambles', () => {
  const scrambles: Move[][] = [
    [{ face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 }, { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 3 }],
    [{ face: 'U', turns: 1 }, { face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'R', turns: 3 }, { face: 'F', turns: 1 }, { face: 'B', turns: 3 }, { face: 'L', turns: 2 }],
    [{ face: 'D', turns: 2 }, { face: 'L', turns: 3 }, { face: 'R', turns: 2 }, { face: 'F', turns: 2 }, { face: 'B', turns: 1 }, { face: 'U', turns: 1 }, { face: 'D', turns: 3 }, { face: 'L', turns: 1 }],
    [{ face: 'F', turns: 1 }, { face: 'F', turns: 1 }, { face: 'R', turns: 1 }, { face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'U', turns: 1 }, { face: 'B', turns: 1 }, { face: 'B', turns: 1 }],
    [{ face: 'L', turns: 1 }, { face: 'D', turns: 1 }, { face: 'B', turns: 3 }, { face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'F', turns: 1 }, { face: 'D', turns: 1 }, { face: 'L', turns: 3 }, { face: 'B', turns: 1 }],
    Array.from({ length: 25 }, (_, i) => ({ face: FACES[i % 6]!, turns: TURNS[(i * 5) % 3]! })),
    Array.from({ length: 30 }, (_, i) => ({ face: FACES[(i * 3) % 6]!, turns: TURNS[(i * 2) % 3]! })),
  ]
  it('solves the full first layer for each hand-selected longer scramble', () => {
    for (const scramble of scrambles) expectFirstLayerSolved(scramble)
  })
})

describe('solveFirstLayerCorners: determinism', () => {
  it('produces identical output for identical input', () => {
    const scrambled = applyMoves(createSolvedCube(), [{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'F', turns: 2 }])
    const afterCross = applyMoves(scrambled, solveWhiteCross(scrambled))
    const a = solveFirstLayerCorners(afterCross)
    const b = solveFirstLayerCorners(afterCross)
    expect(a).toEqual(b)
  })
})

describe('solveFirstLayerCorners: bounded randomized fuzz (seeded, reproducible)', () => {
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('1500 seeded random legal scrambles all reach a solved first layer without disturbing the cross', () => {
    const rand = mulberry32(0xc0ffee)
    const TRIAL_COUNT = 1500
    const SCRAMBLE_LENGTH = 25
    let maxMoveCount = 0
    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      const scrambled = applyMoves(createSolvedCube(), scramble)
      const afterCross = applyMoves(scrambled, solveWhiteCross(scrambled))
      const cornerMoves = solveFirstLayerCorners(afterCross)
      const result = applyMoves(afterCross, cornerMoves)
      for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
        if (!isFirstLayerCornerSolved(result, id)) {
          throw new Error(`Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], corner identity ${id} not solved.`)
        }
      }
      for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
        if (!isWhiteCrossEdgeSolved(result, id)) {
          throw new Error(`Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], cross edge ${id} disturbed by corner insertion.`)
        }
      }
      maxMoveCount = Math.max(maxMoveCount, cornerMoves.length)
    }
    expect(maxMoveCount).toBeLessThan(300)
  })
})
