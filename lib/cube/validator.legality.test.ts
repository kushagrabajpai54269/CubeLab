import { describe, it, expect } from 'vitest'
import { createSolvedCube } from './state'
import { applyMoves, type Move } from './moves'
import { validateCube } from './validator'

/**
 * Regression coverage for D-039: a corner/edge-orientation bug that made
 * roughly half of all legally-reached cubes fail the Health Check with a
 * false "corner appears twisted" report. The root cause was in how
 * CORNER_FACELETS ordered each slot's 3 facelets (an arbitrary flat-index
 * sort, not a chirality-consistent one) — nothing about the Move Engine
 * itself was wrong. This suite exhaustively covers every single move and
 * every pair of moves (deterministic, not randomized, so failures are
 * always reproducible), which is exactly the depth the bug lived at.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function allSingleMoves(): Move[] {
  return FACES.flatMap((face) => TURNS.map((turns) => ({ face, turns })))
}

function expectLegal(moves: Move[]) {
  const cube = applyMoves(createSolvedCube(), moves)
  const result = validateCube(cube)
  if (!result.valid) {
    const failing = result.checks.filter((c) => !c.valid).map((c) => c.id)
    throw new Error(
      `Legal moves [${moves.map((m) => `${m.face}${m.turns}`).join(' ')}] were reported invalid: ${failing.join(', ')}`
    )
  }
  expect(result.valid).toBe(true)
}

describe('validateCube: every legally-reached cube must validate as legal', () => {
  it('every single move from solved', () => {
    for (const move of allSingleMoves()) expectLegal([move])
  })

  it('every pair of moves from solved (324 combinations — exactly the depth D-039 lived at)', () => {
    const singles = allSingleMoves()
    for (const first of singles) {
      for (const second of singles) {
        expectLegal([first, second])
      }
    }
  })

  it('the originally reported repro: R U R\' U\' from solved', () => {
    const cube = applyMoves(createSolvedCube(), [
      { face: 'R', turns: 1 },
      { face: 'U', turns: 1 },
      { face: 'R', turns: 3 },
      { face: 'U', turns: 3 },
    ])
    expect(validateCube(cube).valid).toBe(true)
  })

  it('a long, varied algorithm stays legal', () => {
    const alg: Move[] = [
      { face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 },
      { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 3 },
      { face: 'R', turns: 3 }, { face: 'F', turns: 1 }, { face: 'U', turns: 1 },
      { face: 'L', turns: 2 }, { face: 'B', turns: 1 }, { face: 'D', turns: 2 },
    ]
    expectLegal(alg)
  })
})
