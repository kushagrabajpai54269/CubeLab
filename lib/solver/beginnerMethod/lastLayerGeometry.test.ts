import { describe, it, expect } from 'vitest'
import { createSolvedCube, flattenFacelets, unflattenFacelets } from '../../cube/state'
import { EDGE_FACELETS } from '../../cube/tables'
import {
  LAST_LAYER_COLOR,
  LAST_LAYER_EDGE_SLOTS,
  LAST_LAYER_CORNER_SLOTS,
  LAST_LAYER_EDGE_SLOT_OF_FACE,
  isLastLayerEdgeOriented,
  isLastLayerCornerOriented,
  areAllLastLayerEdgesOriented,
  areAllLastLayerCornersOriented,
  isLastLayerOriented,
  sideFaceOfEdgeSlot,
  sideFacesOfCornerSlot,
  oppositeSideFaceOf,
} from './lastLayerGeometry'

describe('LAST_LAYER_COLOR', () => {
  it('is yellow (D face solved color)', () => {
    expect(LAST_LAYER_COLOR).toBe('yellow')
  })
})

describe('LAST_LAYER_EDGE_SLOTS / LAST_LAYER_CORNER_SLOTS', () => {
  it('finds exactly 4 D-layer edge slots and 4 D-layer corner slots', () => {
    expect(LAST_LAYER_EDGE_SLOTS).toHaveLength(4)
    expect(new Set(LAST_LAYER_EDGE_SLOTS).size).toBe(4)
    expect(LAST_LAYER_CORNER_SLOTS).toHaveLength(4)
    expect(new Set(LAST_LAYER_CORNER_SLOTS).size).toBe(4)
  })
})

describe('LAST_LAYER_EDGE_SLOT_OF_FACE', () => {
  it('maps all 4 side faces to distinct D-layer edge slots', () => {
    expect(LAST_LAYER_EDGE_SLOT_OF_FACE.size).toBe(4)
    for (const face of ['F', 'R', 'B', 'L'] as const) {
      expect(LAST_LAYER_EDGE_SLOT_OF_FACE.has(face)).toBe(true)
    }
    const slots = new Set(LAST_LAYER_EDGE_SLOT_OF_FACE.values())
    expect(slots.size).toBe(4)
  })
})

describe('sideFaceOfEdgeSlot / sideFacesOfCornerSlot', () => {
  it('every D-layer edge slot has exactly one non-D side face', () => {
    for (const slot of LAST_LAYER_EDGE_SLOTS) {
      const face = sideFaceOfEdgeSlot(slot)
      expect(['F', 'R', 'B', 'L']).toContain(face)
    }
  })

  it('every D-layer corner slot has exactly 2 distinct non-D side faces', () => {
    for (const slot of LAST_LAYER_CORNER_SLOTS) {
      const [a, b] = sideFacesOfCornerSlot(slot)
      expect(a).not.toBe('D')
      expect(b).not.toBe('D')
      expect(a).not.toBe(b)
    }
  })
})

describe('oppositeSideFaceOf', () => {
  it('is its own inverse and never maps a face to itself', () => {
    for (const face of ['F', 'R', 'B', 'L'] as const) {
      const opposite = oppositeSideFaceOf(face)
      expect(opposite).not.toBe(face)
      expect(oppositeSideFaceOf(opposite)).toBe(face)
    }
  })

  it('produces exactly 2 opposite pairs covering all 4 side faces', () => {
    const faces = ['F', 'R', 'B', 'L'] as const
    const pairs = new Set(faces.map((f) => [f, oppositeSideFaceOf(f)].sort().join('-')))
    expect(pairs.size).toBe(2)
  })
})

describe('orientation predicates on the solved cube', () => {
  it('every D-layer edge and corner is oriented, and the aggregate predicates agree', () => {
    const solved = createSolvedCube()
    for (const slot of LAST_LAYER_EDGE_SLOTS) expect(isLastLayerEdgeOriented(solved, slot)).toBe(true)
    for (const slot of LAST_LAYER_CORNER_SLOTS) expect(isLastLayerCornerOriented(solved, slot)).toBe(true)
    expect(areAllLastLayerEdgesOriented(solved)).toBe(true)
    expect(areAllLastLayerCornersOriented(solved)).toBe(true)
    expect(isLastLayerOriented(solved)).toBe(true)
  })
})

describe('orientation predicates on a constructed flipped-edge fixture', () => {
  it('detects a single flipped D-layer edge (an illegal-parity fixture, used only to check the predicate itself)', () => {
    const solved = createSolvedCube()
    const flat = flattenFacelets(solved)
    const slot = LAST_LAYER_EDGE_SLOTS[0]!
    const [p0, p1] = EDGE_FACELETS[slot]!
    const tmp = flat[p0]!
    flat[p0] = flat[p1]!
    flat[p1] = tmp
    const state = unflattenFacelets(flat, 3)
    expect(isLastLayerEdgeOriented(state, slot)).toBe(false)
    expect(areAllLastLayerEdgesOriented(state)).toBe(false)
    expect(isLastLayerOriented(state)).toBe(false)
    // Other 3 D-layer edges are untouched.
    for (const other of LAST_LAYER_EDGE_SLOTS.filter((s) => s !== slot)) {
      expect(isLastLayerEdgeOriented(state, other)).toBe(true)
    }
  })
})
