import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMove } from '../../cube/moves'
import {
  layerOfSlot,
  WHITE_CROSS_EDGE_IDENTITIES,
  ownFaceOf,
  ringNeighborsOf,
  currentSlotOf,
  whiteFacingFaceOfSlot,
  isWhiteCrossEdgeSolved,
} from './geometry'

describe('WHITE_CROSS_EDGE_IDENTITIES', () => {
  it('derives exactly 4 identities, one per side color', () => {
    expect(WHITE_CROSS_EDGE_IDENTITIES).toHaveLength(4)
    expect(new Set(WHITE_CROSS_EDGE_IDENTITIES).size).toBe(4)
  })
})

describe('layerOfSlot', () => {
  it('classifies all 12 slots into U (4), D (4), E (4)', () => {
    const counts = { U: 0, D: 0, E: 0 }
    for (let slot = 0; slot < 12; slot++) counts[layerOfSlot(slot)]++
    expect(counts).toEqual({ U: 4, D: 4, E: 4 })
  })
})

describe('ownFaceOf', () => {
  it('assigns each white-cross identity a distinct side face', () => {
    const faces = WHITE_CROSS_EDGE_IDENTITIES.map(ownFaceOf)
    expect(new Set(faces).size).toBe(4)
    for (const f of faces) expect(['F', 'R', 'B', 'L']).toContain(f)
  })

  it('own face matches the home slot geometry: applying it a solved cube keeps identity at its own U-slot', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const solved = createSolvedCube()
      expect(currentSlotOf(solved, identity)).toBe(identity)
      expect(isWhiteCrossEdgeSolved(solved, identity)).toBe(true)
    }
  })
})

describe('ringNeighborsOf', () => {
  it('returns exactly 2 distinct side faces for each of F/R/B/L, never including the face itself or U/D', () => {
    for (const face of ['F', 'R', 'B', 'L'] as const) {
      const [a, b] = ringNeighborsOf(face)
      expect(a).not.toBe(face)
      expect(b).not.toBe(face)
      expect(a).not.toBe(b)
      expect(['F', 'R', 'B', 'L']).toContain(a)
      expect(['F', 'R', 'B', 'L']).toContain(b)
    }
  })

  it('neighbor relationship is symmetric (if B is a neighbor of A, A is a neighbor of B)', () => {
    for (const face of ['F', 'R', 'B', 'L'] as const) {
      const neighbors = ringNeighborsOf(face)
      for (const n of neighbors) {
        expect(ringNeighborsOf(n)).toContain(face)
      }
    }
  })
})

describe('currentSlotOf / whiteFacingFaceOfSlot / isWhiteCrossEdgeSolved', () => {
  it('tracks an edge through a move: F takes the green edge from UF to a new slot, no longer solved', () => {
    const solved = createSolvedCube()
    const greenIdentity = WHITE_CROSS_EDGE_IDENTITIES.find((id) => ownFaceOf(id) === 'F')!
    expect(isWhiteCrossEdgeSolved(solved, greenIdentity)).toBe(true)
    const afterF = applyMove(solved, { face: 'F', turns: 1 })
    expect(isWhiteCrossEdgeSolved(afterF, greenIdentity)).toBe(false)
    expect(currentSlotOf(afterF, greenIdentity)).not.toBe(greenIdentity)
  })

  it('F2 returns the green edge to the D-layer, white facing down', () => {
    const solved = createSolvedCube()
    const greenIdentity = WHITE_CROSS_EDGE_IDENTITIES.find((id) => ownFaceOf(id) === 'F')!
    const afterF2 = applyMove(solved, { face: 'F', turns: 2 })
    const slot = currentSlotOf(afterF2, greenIdentity)
    expect(layerOfSlot(slot)).toBe('D')
    expect(whiteFacingFaceOfSlot(afterF2, slot)).toBe('D')
  })
})
