import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCubeState, areCubeStatesEqual, isSolvedState } from './state'
import { applyMove, applyMoves, inverseMove, type Move } from './moves'
import { FACES } from './types'

const ALL_FACES = FACES as readonly (typeof FACES)[number][]

describe('applyMove: group-theoretic properties', () => {
  it('never mutates the input state', () => {
    const original = createSolvedCube()
    const before = cloneCubeState(original)
    applyMove(original, { face: 'U', turns: 1 })
    expect(areCubeStatesEqual(original, before)).toBe(true)
  })

  it('every base move, applied 4 times, returns to solved', () => {
    for (const face of ALL_FACES) {
      let state = createSolvedCube()
      for (let i = 0; i < 4; i++) state = applyMove(state, { face, turns: 1 })
      expect(isSolvedState(state)).toBe(true)
    }
  })

  it('turns:2 equals applying turns:1 twice', () => {
    const viaDouble = applyMove(createSolvedCube(), { face: 'R', turns: 2 })
    const viaTwice = applyMoves(createSolvedCube(), [
      { face: 'R', turns: 1 },
      { face: 'R', turns: 1 },
    ])
    expect(areCubeStatesEqual(viaDouble, viaTwice)).toBe(true)
  })

  it('a move never changes the opposite face', () => {
    const OPPOSITE: Record<string, string> = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' }
    for (const face of ALL_FACES) {
      const before = createSolvedCube()
      const after = applyMove(before, { face, turns: 1 })
      const opp = OPPOSITE[face] as (typeof FACES)[number]
      expect(after.facelets[opp]).toEqual(before.facelets[opp])
    }
  })

  it('inverseMove exactly undoes a move', () => {
    for (const face of ALL_FACES) {
      for (const turns of [1, 2, 3] as const) {
        const move: Move = { face, turns }
        const solved = createSolvedCube()
        const turned = applyMove(solved, move)
        const back = applyMove(turned, inverseMove(move))
        expect(areCubeStatesEqual(back, solved)).toBe(true)
      }
    }
  })

  it('preserves the color count invariant (9 of each color) through a scramble', () => {
    const scramble: Move[] = [
      { face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 },
      { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 1 },
    ]
    const state = applyMoves(createSolvedCube(), scramble)
    const counts: Record<string, number> = {}
    for (const face of ALL_FACES) {
      for (const color of state.facelets[face]) counts[color] = (counts[color] ?? 0) + 1
    }
    expect(Object.values(counts).sort()).toEqual([9, 9, 9, 9, 9, 9])
  })
})

describe('applyMove: known cube behavior (chirality)', () => {
  it("U move: F's entire top row becomes R's color (R->F->L->B->R content flow)", () => {
    const solved = createSolvedCube()
    const after = applyMove(solved, { face: 'U', turns: 1 })
    expect(after.facelets.F.slice(0, 3)).toEqual(['red', 'red', 'red'])
  })

  it("U move: L's entire top row becomes F's color", () => {
    const after = applyMove(createSolvedCube(), { face: 'U', turns: 1 })
    expect(after.facelets.L.slice(0, 3)).toEqual(['green', 'green', 'green'])
  })

  it("U move: B's entire top row becomes L's color", () => {
    const after = applyMove(createSolvedCube(), { face: 'U', turns: 1 })
    expect(after.facelets.B.slice(0, 3)).toEqual(['orange', 'orange', 'orange'])
  })

  it("U move: R's entire top row becomes B's color", () => {
    const after = applyMove(createSolvedCube(), { face: 'U', turns: 1 })
    expect(after.facelets.R.slice(0, 3)).toEqual(['blue', 'blue', 'blue'])
  })

  it('the "sexy move" (R U R\' U\') has order 6 — a well-known cube fact', () => {
    const sexyMove: Move[] = [
      { face: 'R', turns: 1 },
      { face: 'U', turns: 1 },
      { face: 'R', turns: 3 },
      { face: 'U', turns: 3 },
    ]
    let state = createSolvedCube()
    for (let i = 0; i < 6; i++) state = applyMoves(state, sexyMove)
    expect(isSolvedState(state)).toBe(true)
  })

  it('the sexy move does NOT return to solved before 6 repetitions (sanity check on the test above)', () => {
    const sexyMove: Move[] = [
      { face: 'R', turns: 1 },
      { face: 'U', turns: 1 },
      { face: 'R', turns: 3 },
      { face: 'U', turns: 3 },
    ]
    let state = createSolvedCube()
    for (let i = 0; i < 5; i++) {
      state = applyMoves(state, sexyMove)
      expect(isSolvedState(state)).toBe(false)
    }
  })
})
