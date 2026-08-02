import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCubeState, areCubeStatesEqual, isSolvedState, flattenFacelets, faceletAt } from './state'
import { FACES } from './types'

describe('createSolvedCube', () => {
  it('gives every face size*size facelets, all the same color', () => {
    const cube = createSolvedCube(3)
    for (const face of FACES) {
      expect(cube.facelets[face]).toHaveLength(9)
      expect(new Set(cube.facelets[face]).size).toBe(1)
    }
  })

  it('uses the standard WCA color scheme', () => {
    const cube = createSolvedCube()
    expect(cube.facelets.U[0]).toBe('white')
    expect(cube.facelets.D[0]).toBe('yellow')
    expect(cube.facelets.F[0]).toBe('green')
    expect(cube.facelets.B[0]).toBe('blue')
    expect(cube.facelets.L[0]).toBe('orange')
    expect(cube.facelets.R[0]).toBe('red')
  })

  it('supports other sizes for future puzzle types (D-003)', () => {
    const cube = createSolvedCube(2)
    expect(cube.facelets.U).toHaveLength(4)
  })

  it('is reported as solved', () => {
    expect(isSolvedState(createSolvedCube())).toBe(true)
  })
})

describe('cloneCubeState', () => {
  it('produces an equal but independent copy', () => {
    const original = createSolvedCube()
    const clone = cloneCubeState(original)
    expect(areCubeStatesEqual(original, clone)).toBe(true)

    clone.facelets.U[0] = 'red'
    expect(original.facelets.U[0]).toBe('white') // original must be untouched
    expect(areCubeStatesEqual(original, clone)).toBe(false)
  })
})

describe('isSolvedState', () => {
  it('returns false once a single facelet differs from the rest of its face', () => {
    const cube = createSolvedCube()
    cube.facelets.F[3] = 'red'
    expect(isSolvedState(cube)).toBe(false)
  })
})

describe('faceletAt', () => {
  it('is the exact reverse of flattenFacelets for every index', () => {
    const cube = createSolvedCube(3)
    const flat = flattenFacelets(cube)
    flat.forEach((_, i) => {
      const { face, facelet } = faceletAt(i, 3)
      expect(cube.facelets[face][facelet]).toBe(flat[i])
    })
  })

  it('maps index 0 to U face, facelet 0', () => {
    expect(faceletAt(0, 3)).toEqual({ face: 'U', facelet: 0 })
  })

  it('maps the first index of each face correctly (FACES order: U,D,L,R,F,B)', () => {
    expect(faceletAt(9, 3)).toEqual({ face: 'D', facelet: 0 })
    expect(faceletAt(18, 3)).toEqual({ face: 'L', facelet: 0 })
    expect(faceletAt(27, 3)).toEqual({ face: 'R', facelet: 0 })
    expect(faceletAt(36, 3)).toEqual({ face: 'F', facelet: 0 })
    expect(faceletAt(45, 3)).toEqual({ face: 'B', facelet: 0 })
  })

  it('supports other sizes for future puzzle types (D-003)', () => {
    expect(faceletAt(4, 2)).toEqual({ face: 'D', facelet: 0 })
  })
})
