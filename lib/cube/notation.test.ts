import { describe, it, expect } from 'vitest'
import { parseMove, parseAlgorithm, formatMove, formatAlgorithm } from './notation'
import { applyMoves, type Move } from './moves'
import { createSolvedCube, isSolvedState } from './state'
import { FACES } from './types'

describe('parseMove', () => {
  it('parses a bare face letter as a clockwise quarter turn', () => {
    for (const face of FACES) {
      expect(parseMove(face)).toEqual({ face, turns: 1 })
    }
  })

  it("parses ' as three turns (counterclockwise)", () => {
    expect(parseMove("R'")).toEqual({ face: 'R', turns: 3 })
  })

  it('parses 2 as a double turn', () => {
    expect(parseMove('R2')).toEqual({ face: 'R', turns: 2 })
  })

  it('normalizes a typographic smart-quote apostrophe', () => {
    expect(parseMove('R’')).toEqual({ face: 'R', turns: 3 })
  })

  it('rejects lowercase (wide moves)', () => {
    expect(parseMove('r')).toBeNull()
  })

  it('rejects slice moves', () => {
    expect(parseMove('M')).toBeNull()
    expect(parseMove('E')).toBeNull()
    expect(parseMove('S')).toBeNull()
  })

  it('rejects whole-cube rotations', () => {
    expect(parseMove('x')).toBeNull()
    expect(parseMove('y')).toBeNull()
    expect(parseMove('z')).toBeNull()
  })

  it('rejects an unknown face letter', () => {
    expect(parseMove('Q')).toBeNull()
  })

  it('rejects a double modifier', () => {
    expect(parseMove("R'2")).toBeNull()
    expect(parseMove("R2'")).toBeNull()
  })

  it('rejects an empty token', () => {
    expect(parseMove('')).toBeNull()
  })
})

describe('parseAlgorithm', () => {
  it('parses a full algorithm', () => {
    const result = parseAlgorithm("R U R' U'")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.moves).toEqual([
        { face: 'R', turns: 1 },
        { face: 'U', turns: 1 },
        { face: 'R', turns: 3 },
        { face: 'U', turns: 3 },
      ])
    }
  })

  it('tolerates extra whitespace, tabs, and newlines between moves', () => {
    const result = parseAlgorithm("  R\t U'\n\n  F2  ")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.moves).toEqual([
        { face: 'R', turns: 1 },
        { face: 'U', turns: 3 },
        { face: 'F', turns: 2 },
      ])
    }
  })

  it('fails on an empty string', () => {
    expect(parseAlgorithm('').success).toBe(false)
  })

  it('fails on a whitespace-only string', () => {
    expect(parseAlgorithm('   ').success).toBe(false)
  })

  it('reports which token was invalid, with a specific message', () => {
    const result = parseAlgorithm("R U r F'")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.token).toBe('r')
      expect(result.error).toMatch(/wide move/)
    }
  })

  it('gives a specific message for slice moves', () => {
    const result = parseAlgorithm('M2')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/slice move/)
  })

  it('gives a specific message for whole-cube rotations', () => {
    const result = parseAlgorithm('y')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/rotation/)
  })
})

describe('formatMove / formatAlgorithm', () => {
  it('formats each turn count correctly', () => {
    expect(formatMove({ face: 'R', turns: 1 })).toBe('R')
    expect(formatMove({ face: 'R', turns: 2 })).toBe('R2')
    expect(formatMove({ face: 'R', turns: 3 })).toBe("R'")
  })

  it('formats a full algorithm', () => {
    const moves: Move[] = [
      { face: 'R', turns: 1 },
      { face: 'U', turns: 1 },
      { face: 'R', turns: 3 },
      { face: 'U', turns: 3 },
    ]
    expect(formatAlgorithm(moves)).toBe("R U R' U'")
  })
})

describe('parseAlgorithm / formatAlgorithm round-trip', () => {
  it('parsing then formatting reproduces the algorithm (normalizing whitespace)', () => {
    const input = "R  U R'\tU'  F2 B"
    const result = parseAlgorithm(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(formatAlgorithm(result.moves)).toBe("R U R' U' F2 B")
    }
  })

  it('formatting then parsing reproduces the original moves', () => {
    const moves: Move[] = [
      { face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 },
      { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 3 },
    ]
    const result = parseAlgorithm(formatAlgorithm(moves))
    expect(result.success).toBe(true)
    if (result.success) expect(result.moves).toEqual(moves)
  })
})

describe('integration with the Move Engine', () => {
  it('parsing "R U R\' U\'" and applying it 6 times solves the cube (same fact as Phase A step 2)', () => {
    const result = parseAlgorithm("R U R' U'")
    expect(result.success).toBe(true)
    if (!result.success) return
    let state = createSolvedCube()
    for (let i = 0; i < 6; i++) state = applyMoves(state, result.moves)
    expect(isSolvedState(state)).toBe(true)
  })
})
