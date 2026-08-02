import { describe, it, expect } from 'vitest'
import {
  cubeToFaceletString,
  validateFaceletString,
  faceletStringFromInput,
  cubeFromAlgorithm,
} from './serialization'
import { createSolvedCube, areCubeStatesEqual } from './state'
import { applyMoves, type Move } from './moves'
import { formatAlgorithm } from './notation'

describe('cubeToFaceletString / faceletStringFromInput round trip', () => {
  it('round-trips a solved cube', () => {
    const cube = createSolvedCube(3)
    const str = cubeToFaceletString(cube)
    const result = faceletStringFromInput(str, 3)
    expect(result.success).toBe(true)
    if (result.success) expect(areCubeStatesEqual(result.cube, cube)).toBe(true)
  })

  it('round-trips a scrambled cube', () => {
    const scramble: Move[] = [
      { face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 },
      { face: 'L', turns: 1 }, { face: 'B', turns: 2 },
    ]
    const cube = applyMoves(createSolvedCube(), scramble)
    const str = cubeToFaceletString(cube)
    const result = faceletStringFromInput(str, 3)
    expect(result.success).toBe(true)
    if (result.success) expect(areCubeStatesEqual(result.cube, cube)).toBe(true)
  })

  it('round-trips a size-2 cube (D-003)', () => {
    const cube = createSolvedCube(2)
    const str = cubeToFaceletString(cube)
    expect(str).toHaveLength(24)
    const result = faceletStringFromInput(str, 2)
    expect(result.success).toBe(true)
    if (result.success) expect(areCubeStatesEqual(result.cube, cube)).toBe(true)
  })

  it('is tolerant of whitespace in pasted input', () => {
    const str = cubeToFaceletString(createSolvedCube())
    const wrapped = `${str.slice(0, 20)}\n${str.slice(20, 40)}\n ${str.slice(40)} `
    const result = faceletStringFromInput(wrapped, 3)
    expect(result.success).toBe(true)
  })

  it('is case-insensitive', () => {
    const str = cubeToFaceletString(createSolvedCube()).toLowerCase()
    const result = faceletStringFromInput(str, 3)
    expect(result.success).toBe(true)
  })
})

describe('validateFaceletString', () => {
  it('accepts a well-formed string', () => {
    expect(validateFaceletString(cubeToFaceletString(createSolvedCube()), 3).valid).toBe(true)
  })

  it('rejects the wrong length', () => {
    const result = validateFaceletString('WWW', 3)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/54/)
  })

  it('rejects an unrecognized character', () => {
    const str = cubeToFaceletString(createSolvedCube())
    const bad = 'X' + str.slice(1)
    const result = validateFaceletString(bad, 3)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/"X"/)
  })
})

describe('faceletStringFromInput: invalid input', () => {
  it('fails on wrong length without throwing', () => {
    const result = faceletStringFromInput('WWWYYY', 3)
    expect(result.success).toBe(false)
  })

  it('fails on an unrecognized character without throwing', () => {
    const str = cubeToFaceletString(createSolvedCube())
    const bad = str.slice(0, -1) + 'Z'
    const result = faceletStringFromInput(bad, 3)
    expect(result.success).toBe(false)
  })

  it('fails on an empty string', () => {
    expect(faceletStringFromInput('', 3).success).toBe(false)
  })
})

describe('cubeFromAlgorithm', () => {
  it('applies a valid algorithm to a solved cube by default', () => {
    const result = cubeFromAlgorithm("R U R' U'")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(areCubeStatesEqual(result.cube, applyMoves(createSolvedCube(), result.moves))).toBe(true)
      expect(result.moves).toHaveLength(4)
    }
  })

  it('applies a valid algorithm to an arbitrary base cube', () => {
    const base = applyMoves(createSolvedCube(), [{ face: 'R', turns: 1 }])
    const result = cubeFromAlgorithm('U', base)
    expect(result.success).toBe(true)
    if (result.success) {
      const expected = applyMoves(base, [{ face: 'U', turns: 1 }])
      expect(areCubeStatesEqual(result.cube, expected)).toBe(true)
    }
  })

  it('forwards the exact ParseFailure for an invalid token, without throwing', () => {
    const result = cubeFromAlgorithm('R U x')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.token).toBe('x')
      expect(result.error).toMatch(/rotation/i)
    }
  })

  it('fails cleanly on an empty algorithm', () => {
    const result = cubeFromAlgorithm('')
    expect(result.success).toBe(false)
  })

  it('always produces a legal cube (moves preserve legality)', () => {
    const result = cubeFromAlgorithm("R U2 F' L B2")
    expect(result.success).toBe(true)
  })

  it('round-trips through formatAlgorithm', () => {
    const original = "R U R' U' F2"
    const result = cubeFromAlgorithm(original)
    expect(result.success).toBe(true)
    if (result.success) expect(formatAlgorithm(result.moves)).toBe(original)
  })
})
