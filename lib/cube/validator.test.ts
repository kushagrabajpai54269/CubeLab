import { describe, it, expect } from 'vitest'
import { createSolvedCube, flattenFacelets, unflattenFacelets } from './state'
import { applyMoves, type Move } from './moves'
import { CORNER_FACELETS, EDGE_FACELETS } from './tables'
import { validateCube } from './validator'
import type { CubeState } from './types'

// --- helpers: construct states directly, bypassing the Move Engine on
// purpose — these states are illegal precisely because no move sequence
// can produce them.

function withOneFaceletChanged(mutate: (flat: string[]) => void): CubeState {
  const flat = flattenFacelets(createSolvedCube()) as string[]
  mutate(flat)
  return unflattenFacelets(flat as CubeState['facelets']['U'], 3)
}

function withCornersSwapped(slotA: number, slotB: number): CubeState {
  return withOneFaceletChanged((flat) => {
    const a = CORNER_FACELETS[slotA]
    const b = CORNER_FACELETS[slotB]
    for (let k = 0; k < 3; k++) {
      ;[flat[a[k]], flat[b[k]]] = [flat[b[k]], flat[a[k]]]
    }
  })
}

function withEdgesSwapped(slotA: number, slotB: number): CubeState {
  return withOneFaceletChanged((flat) => {
    const a = EDGE_FACELETS[slotA]
    const b = EDGE_FACELETS[slotB]
    for (let k = 0; k < 2; k++) {
      ;[flat[a[k]], flat[b[k]]] = [flat[b[k]], flat[a[k]]]
    }
  })
}

function withCornerTwisted(slot: number, turns: 1 | 2): CubeState {
  return withOneFaceletChanged((flat) => {
    const [p0, p1, p2] = CORNER_FACELETS[slot]
    const c = [flat[p0], flat[p1], flat[p2]]
    const rotated = turns === 1 ? [c[2], c[0], c[1]] : [c[1], c[2], c[0]]
    ;[flat[p0], flat[p1], flat[p2]] = rotated
  })
}

function withEdgeFlipped(slot: number): CubeState {
  return withOneFaceletChanged((flat) => {
    const [p0, p1] = EDGE_FACELETS[slot]
    ;[flat[p0], flat[p1]] = [flat[p1], flat[p0]]
  })
}

function withImpossibleCorner(slot: number): CubeState {
  // Force a duplicate color onto one corner — guaranteed impossible (no
  // real corner repeats a color). This also breaks the color-count
  // invariant, which is realistic: a user mis-painting a corner this way
  // would trip both checks, not just one.
  return withOneFaceletChanged((flat) => {
    const [p0, p1] = CORNER_FACELETS[slot]
    flat[p1] = flat[p0]
  })
}

function withImpossibleEdge(slot: number): CubeState {
  return withOneFaceletChanged((flat) => {
    const [p0, p1] = EDGE_FACELETS[slot]
    flat[p1] = flat[p0]
  })
}

function getCheck(result: ReturnType<typeof validateCube>, id: string) {
  const check = result.checks.find((c) => c.id === id)
  if (!check) throw new Error(`No check with id ${id}`)
  return check
}

describe('validateCube: solved and legally-scrambled cubes', () => {
  it('a solved cube passes every check', () => {
    const result = validateCube(createSolvedCube())
    expect(result.valid).toBe(true)
    expect(result.checks.every((c) => c.valid)).toBe(true)
  })

  it('a cube scrambled by real moves still passes every check', () => {
    const scramble: Move[] = [
      { face: 'R', turns: 1 }, { face: 'U', turns: 2 }, { face: 'F', turns: 3 },
      { face: 'L', turns: 1 }, { face: 'B', turns: 2 }, { face: 'D', turns: 1 },
      { face: 'R', turns: 3 }, { face: 'F', turns: 1 },
    ]
    const state = applyMoves(createSolvedCube(), scramble)
    const result = validateCube(state)
    expect(result.valid).toBe(true)
  })
})

describe('validateCube: color count', () => {
  it('fails when a color count is wrong', () => {
    const state = withOneFaceletChanged((flat) => {
      flat[0] = 'red' // U's first facelet, solid white on a solved cube -> now an extra red, one fewer white
    })
    const result = validateCube(state)
    expect(result.valid).toBe(false)
    expect(getCheck(result, 'colorCount').valid).toBe(false)
  })

  it('never attaches affected entities — color count is inherently global', () => {
    const state = withOneFaceletChanged((flat) => {
      flat[0] = 'red'
    })
    const result = validateCube(state)
    expect(getCheck(result, 'colorCount').affected).toBeUndefined()
  })
})

describe('validateCube: centers', () => {
  it('fails when a center is wrong', () => {
    const state = withOneFaceletChanged((flat) => {
      flat[4] = 'red' // U's center (index 4 of 9) changed from white to red
    })
    const result = validateCube(state)
    expect(getCheck(result, 'centers').valid).toBe(false)
  })

  it('reports exactly which face(s) have the wrong center', () => {
    const state = withOneFaceletChanged((flat) => {
      flat[4] = 'red' // U's center
    })
    const result = validateCube(state)
    expect(getCheck(result, 'centers').affected).toEqual({ kind: 'centers', faces: ['U'] })
  })

  it('is not applicable (but not failed) for an even-sized cube', () => {
    const result = validateCube(createSolvedCube(2))
    expect(getCheck(result, 'centers').valid).toBe(true)
    expect(result.checks).toHaveLength(2) // only colorCount + centers apply
  })
})

describe('validateCube: piece integrity', () => {
  it('fails corner integrity when a corner has a duplicate color', () => {
    const result = validateCube(withImpossibleCorner(0))
    expect(getCheck(result, 'cornerIntegrity').valid).toBe(false)
  })

  it('reports exactly which corner slot is bad', () => {
    const result = validateCube(withImpossibleCorner(3))
    expect(getCheck(result, 'cornerIntegrity').affected).toEqual({ kind: 'corners', slots: [3] })
  })

  it('fails edge integrity when an edge has a duplicate color', () => {
    const result = validateCube(withImpossibleEdge(0))
    expect(getCheck(result, 'edgeIntegrity').valid).toBe(false)
  })

  it('reports exactly which edge slot is bad', () => {
    const result = validateCube(withImpossibleEdge(5))
    expect(getCheck(result, 'edgeIntegrity').affected).toEqual({ kind: 'edges', slots: [5] })
  })

  it('skips (does not silently pass) deep checks when corner integrity fails', () => {
    const result = validateCube(withImpossibleCorner(0))
    expect(getCheck(result, 'permutationParity').valid).toBe(false)
    expect(getCheck(result, 'permutationParity').message).toMatch(/can't be determined/i)
    expect(getCheck(result, 'cornerOrientation').valid).toBe(false)
    expect(getCheck(result, 'edgeOrientation').valid).toBe(false)
  })

  it('attaches no affected entities on the skipped deep checks (nothing is identifiable yet)', () => {
    const result = validateCube(withImpossibleCorner(0))
    expect(getCheck(result, 'permutationParity').affected).toBeUndefined()
    expect(getCheck(result, 'cornerOrientation').affected).toBeUndefined()
    expect(getCheck(result, 'edgeOrientation').affected).toBeUndefined()
  })
})

describe('validateCube: permutation parity (the "two pieces swapped" case)', () => {
  it('fails only permutationParity when two whole corners are swapped', () => {
    const state = withCornersSwapped(0, 1)
    const result = validateCube(state)
    expect(getCheck(result, 'colorCount').valid).toBe(true)
    expect(getCheck(result, 'cornerIntegrity').valid).toBe(true)
    expect(getCheck(result, 'edgeIntegrity').valid).toBe(true)
    expect(getCheck(result, 'permutationParity').valid).toBe(false)
    expect(getCheck(result, 'cornerOrientation').valid).toBe(true)
    expect(getCheck(result, 'edgeOrientation').valid).toBe(true)
  })

  it('fails only permutationParity when two whole edges are swapped', () => {
    const state = withEdgesSwapped(0, 1)
    const result = validateCube(state)
    expect(getCheck(result, 'edgeIntegrity').valid).toBe(true)
    expect(getCheck(result, 'permutationParity').valid).toBe(false)
    expect(getCheck(result, 'edgeOrientation').valid).toBe(true)
  })

  it('never attaches affected entities — which pair is swapped is not uniquely determined', () => {
    const result = validateCube(withCornersSwapped(0, 1))
    expect(getCheck(result, 'permutationParity').affected).toBeUndefined()
  })
})

describe('validateCube: orientation sums (the "twisted/flipped in place" cases)', () => {
  it('fails only cornerOrientation when a single corner is twisted', () => {
    const state = withCornerTwisted(0, 1)
    const result = validateCube(state)
    expect(getCheck(result, 'cornerIntegrity').valid).toBe(true)
    expect(getCheck(result, 'permutationParity').valid).toBe(true)
    expect(getCheck(result, 'cornerOrientation').valid).toBe(false)
    expect(getCheck(result, 'edgeOrientation').valid).toBe(true)
  })

  it('identifies exactly the twisted corner slot (a direct per-piece fact, not a guess)', () => {
    const result = validateCube(withCornerTwisted(2, 1))
    expect(getCheck(result, 'cornerOrientation').affected).toEqual({ kind: 'corners', slots: [2] })
  })

  it('fails only edgeOrientation when a single edge is flipped', () => {
    const state = withEdgeFlipped(0)
    const result = validateCube(state)
    expect(getCheck(result, 'edgeIntegrity').valid).toBe(true)
    expect(getCheck(result, 'permutationParity').valid).toBe(true)
    expect(getCheck(result, 'cornerOrientation').valid).toBe(true)
    expect(getCheck(result, 'edgeOrientation').valid).toBe(false)
  })

  it('identifies exactly the flipped edge slot', () => {
    const result = validateCube(withEdgeFlipped(7))
    expect(getCheck(result, 'edgeOrientation').affected).toEqual({ kind: 'edges', slots: [7] })
  })

  it('a passing orientation check attaches no affected entities', () => {
    const result = validateCube(createSolvedCube())
    expect(getCheck(result, 'cornerOrientation').affected).toBeUndefined()
    expect(getCheck(result, 'edgeOrientation').affected).toBeUndefined()
  })
})
