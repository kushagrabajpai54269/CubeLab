import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCubeState, areCubeStatesEqual } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved, ownFaceOf, currentSlotOf, layerOfSlot } from './geometry'
import { solveWhiteCross } from './whiteCross'

/**
 * Regression coverage for Phase C, Subsystem 2 (White Cross). Follows the
 * same exhaustive-deterministic-coverage style as validator.legality.test.ts
 * (D-039) rather than unseeded random fuzzing, so any failure is always
 * reproducible from the test file alone.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function allSingleMoves(): Move[] {
  return FACES.flatMap((face) => TURNS.map((turns) => ({ face, turns })))
}

function expectCrossSolved(scramble: Move[]) {
  const scrambled = applyMoves(createSolvedCube(), scramble)
  const before = cloneCubeState(scrambled)
  const moves = solveWhiteCross(scrambled)
  // Non-mutation: the input to solveWhiteCross is untouched.
  expect(areCubeStatesEqual(scrambled, before)).toBe(true)
  // Replay verification: apply the returned moves via the real Move
  // Engine and inspect the result directly -- never trust internal
  // bookkeeping.
  const result = applyMoves(scrambled, moves)
  for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
    if (!isWhiteCrossEdgeSolved(result, id)) {
      throw new Error(
        `Cross not solved after scramble [${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}] ` +
        `+ solver moves [${moves.map((m) => `${m.face}${m.turns}`).join(' ')}]: identity ${id} (own face ${ownFaceOf(id)}) not home.`
      )
    }
  }
}

describe('solveWhiteCross: solved cube', () => {
  it('returns no moves for an already-solved cube', () => {
    expect(solveWhiteCross(createSolvedCube())).toEqual([])
  })
})

describe('solveWhiteCross: every single move from solved (18 cases)', () => {
  it('solves the cross after every single move', () => {
    for (const move of allSingleMoves()) expectCrossSolved([move])
  })
})

describe('solveWhiteCross: every pair of moves from solved (324 cases)', () => {
  it('solves the cross after every pair of moves', () => {
    const singles = allSingleMoves()
    for (const first of singles) {
      for (const second of singles) {
        expectCrossSolved([first, second])
      }
    }
  })
})

describe('solveWhiteCross: longer, varied deterministic scrambles', () => {
  const scrambles: Move[][] = [
    [{ face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 }, { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 3 }],
    [{ face: 'U', turns: 1 }, { face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'R', turns: 3 }, { face: 'F', turns: 1 }, { face: 'B', turns: 3 }, { face: 'L', turns: 2 }],
    [{ face: 'D', turns: 2 }, { face: 'L', turns: 3 }, { face: 'R', turns: 2 }, { face: 'F', turns: 2 }, { face: 'B', turns: 1 }, { face: 'U', turns: 1 }, { face: 'D', turns: 3 }, { face: 'L', turns: 1 }],
    [{ face: 'F', turns: 1 }, { face: 'F', turns: 1 }, { face: 'R', turns: 1 }, { face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'U', turns: 1 }, { face: 'B', turns: 1 }, { face: 'B', turns: 1 }],
    [{ face: 'L', turns: 1 }, { face: 'D', turns: 1 }, { face: 'B', turns: 3 }, { face: 'R', turns: 1 }, { face: 'U', turns: 3 }, { face: 'F', turns: 1 }, { face: 'D', turns: 1 }, { face: 'L', turns: 3 }, { face: 'B', turns: 1 }],
    Array.from({ length: 25 }, (_, i) => ({ face: FACES[i % 6]!, turns: TURNS[(i * 5) % 3]! })), // deterministic, non-repeating pattern
  ]
  it('solves the cross for each hand-selected longer scramble', () => {
    for (const scramble of scrambles) expectCrossSolved(scramble)
  })
})

describe('solveWhiteCross: partial cross already solved is preserved where possible, and always converges', () => {
  it('one edge already solved, rest scrambled', () => {
    // U2 D2 F2 leaves the white-blue (UB) edge in place while scrambling elsewhere.
    expectCrossSolved([{ face: 'D', turns: 2 }, { face: 'F', turns: 2 }, { face: 'R', turns: 1 }])
  })

  it('the exact scramble that originally caused an infinite oscillation between two edges (regression)', () => {
    // Found during Subsystem 2's design investigation: insertionMoves used
    // to deterministically prefer one foreign face with no regard for
    // which edges were already placed, causing blue and red to
    // repeatedly re-disturb each other forever. Locked in here permanently.
    const scramble: Move[] = [
      { face: 'U', turns: 3 }, { face: 'L', turns: 2 }, { face: 'R', turns: 3 }, { face: 'L', turns: 3 },
      { face: 'R', turns: 1 }, { face: 'L', turns: 3 }, { face: 'D', turns: 3 }, { face: 'R', turns: 3 },
      { face: 'U', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 1 }, { face: 'U', turns: 2 },
      { face: 'U', turns: 1 }, { face: 'U', turns: 2 }, { face: 'R', turns: 2 }, { face: 'R', turns: 2 },
      { face: 'B', turns: 2 }, { face: 'F', turns: 3 }, { face: 'U', turns: 1 }, { face: 'U', turns: 3 },
    ]
    expectCrossSolved(scramble)
  })

  it('adversarial: all 4 white edges simultaneously in the E-layer, discovered via search rather than assumed', () => {
    // Reduced-key BFS (dedup on just the 4 target edges' slots, not the
    // full 54-facelet cube state -- the full-state version is intractably
    // large, as discovered during investigation) to find a scramble that
    // puts every target edge in the E-layer simultaneously: the
    // structurally worst case this design identified, since it forces
    // every edge through some kind of non-trivial eject/insert in the
    // same round.
    const solved = createSolvedCube()
    const allMoves = allSingleMoves()
    type Node = { state: ReturnType<typeof applyMoves>; path: Move[] }
    let frontier: Node[] = [{ state: solved, path: [] }]
    const seen = new Set<string>()
    let found: Node | null = null
    for (let depth = 0; depth < 8 && !found; depth++) {
      const next: Node[] = []
      for (const node of frontier) {
        const allInE = WHITE_CROSS_EDGE_IDENTITIES.every(
          (id) => layerOfSlot(currentSlotOf(node.state, id)) === 'E'
        )
        if (allInE) { found = node; break }
        for (const m of allMoves) {
          const ns = applyMoves(node.state, [m])
          const key = WHITE_CROSS_EDGE_IDENTITIES.map((id) => `${id}:${currentSlotOf(ns, id)}`).join('|')
          if (seen.has(key)) continue
          seen.add(key)
          next.push({ state: ns, path: [...node.path, m] })
        }
      }
      if (found) break
      frontier = next
    }
    expect(found).not.toBeNull()
    expectCrossSolved(found!.path)
  })
})

describe('solveWhiteCross: determinism', () => {
  it('produces identical output for identical input', () => {
    const scrambled = applyMoves(createSolvedCube(), [{ face: 'R', turns: 1 }, { face: 'U', turns: 1 }, { face: 'F', turns: 2 }])
    const a = solveWhiteCross(scrambled)
    const b = solveWhiteCross(scrambled)
    expect(a).toEqual(b)
  })
})

describe('solveWhiteCross: bounded randomized fuzz (seeded, reproducible)', () => {
  // A tiny seeded PRNG (mulberry32) rather than Math.random(): any future
  // failure reported by this test is reproducible from the fixed seed
  // alone, not a one-off that can't be reliably re-triggered. Bounded by a
  // fixed trial count -- this test cannot hang, since solveWhiteCross
  // itself always either returns or throws within its own hard round cap.
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('2000 seeded random legal scrambles all reach a solved cross', () => {
    const rand = mulberry32(0xc0ffee)
    const TRIAL_COUNT = 2000
    const SCRAMBLE_LENGTH = 22
    let maxMoveCount = 0
    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      const scrambled = applyMoves(createSolvedCube(), scramble)
      const moves = solveWhiteCross(scrambled)
      const result = applyMoves(scrambled, moves)
      for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
        if (!isWhiteCrossEdgeSolved(result, id)) {
          throw new Error(
            `Trial ${trial} (seed 0xc0ffee) failed: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], identity ${id} not solved.`
          )
        }
      }
      maxMoveCount = Math.max(maxMoveCount, moves.length)
    }
    // Sanity bound on solution length -- not a tight optimality claim, just
    // a guard against a pathological blowup going unnoticed.
    expect(maxMoveCount).toBeLessThan(60)
  })
})
