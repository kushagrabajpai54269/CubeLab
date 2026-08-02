import { describe, it, expect } from 'vitest'
import { createSolvedCube } from './state'
import {
  readCornerColors,
  readEdgeColors,
  identifyCorner,
  identifyEdge,
  cornerOrientation,
  edgeOrientation,
  permutationParity,
  SOLVED_CORNER_COLORS,
  SOLVED_EDGE_COLORS,
} from './pieces'

describe('piece decomposition on a solved cube', () => {
  it('reads back exactly the solved corner/edge colors', () => {
    const state = createSolvedCube()
    expect(readCornerColors(state)).toEqual(SOLVED_CORNER_COLORS)
    expect(readEdgeColors(state)).toEqual(SOLVED_EDGE_COLORS)
  })

  it('identifies every corner as its own home slot', () => {
    SOLVED_CORNER_COLORS.forEach((colors, i) => expect(identifyCorner(colors)).toBe(i))
  })

  it('identifies every edge as its own home slot', () => {
    SOLVED_EDGE_COLORS.forEach((colors, i) => expect(identifyEdge(colors)).toBe(i))
  })

  it('reports orientation 0 for every solved corner and edge', () => {
    SOLVED_CORNER_COLORS.forEach((colors, i) => expect(cornerOrientation(i, colors)).toBe(0))
    SOLVED_EDGE_COLORS.forEach((colors, i) => expect(edgeOrientation(i, colors)).toBe(0))
  })

  it('identifyCorner/identifyEdge return null for an impossible color combination', () => {
    expect(identifyCorner(['white', 'white', 'red'])).toBeNull()
    expect(identifyEdge(['white', 'white'])).toBeNull()
  })
})

describe('permutationParity', () => {
  it('the identity permutation is even', () => {
    expect(permutationParity([0, 1, 2, 3, 4, 5, 6, 7])).toBe(0)
  })

  it('a single transposition is odd', () => {
    expect(permutationParity([1, 0, 2, 3, 4, 5, 6, 7])).toBe(1)
  })

  it('a 3-cycle is even (two transpositions)', () => {
    expect(permutationParity([1, 2, 0, 3, 4, 5, 6, 7])).toBe(0)
  })

  it('a 4-cycle is odd (three transpositions) — matches what a single quarter-turn does', () => {
    expect(permutationParity([1, 2, 3, 0, 4, 5, 6, 7])).toBe(1)
  })
})
