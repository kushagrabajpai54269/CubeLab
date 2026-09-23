import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import {
  SECOND_LAYER_EDGE_IDENTITIES,
  ownFacesOfSecondLayerEdge,
  ownColorForFace,
  isSecondLayerEdgeSolved,
  matchedFaceAtSlot,
} from './secondLayerGeometry'
import { currentSlotOf } from './geometry'

describe('SECOND_LAYER_EDGE_IDENTITIES', () => {
  it('is exactly the 4 E-layer edge slots', () => {
    expect([...SECOND_LAYER_EDGE_IDENTITIES].sort((a, b) => a - b)).toEqual([8, 9, 10, 11])
  })
})

describe('ownFacesOfSecondLayerEdge', () => {
  it('returns the 2 side faces of each identity home slot', () => {
    expect(ownFacesOfSecondLayerEdge(8)).toEqual(['L', 'B'])
    expect(ownFacesOfSecondLayerEdge(9)).toEqual(['L', 'F'])
    expect(ownFacesOfSecondLayerEdge(10)).toEqual(['R', 'B'])
    expect(ownFacesOfSecondLayerEdge(11)).toEqual(['R', 'F'])
  })
})

describe('ownColorForFace', () => {
  it('returns the solved color for each own face and throws for a foreign one', () => {
    expect(ownColorForFace(8, 'L')).toBe('orange')
    expect(ownColorForFace(8, 'B')).toBe('blue')
    expect(() => ownColorForFace(8, 'R')).toThrow()
  })
})

describe('isSecondLayerEdgeSolved', () => {
  it('is true for every target on a solved cube', () => {
    const solved = createSolvedCube()
    for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
      expect(isSecondLayerEdgeSolved(solved, id)).toBe(true)
    }
  })

  it('is false when the piece is in its home slot but flipped', () => {
    // L U B (verified by BFS search, not assumed) returns identity 8 to
    // its own slot (8) but flipped.
    const solved = createSolvedCube()
    const s = applyMoves(solved, [{ face: 'L', turns: 1 }, { face: 'U', turns: 1 }, { face: 'B', turns: 1 }])
    expect(currentSlotOf(s, 8)).toBe(8)
    expect(isSecondLayerEdgeSolved(s, 8)).toBe(false)
  })
})

describe('matchedFaceAtSlot', () => {
  it('returns null for a non-D-layer slot', () => {
    const solved = createSolvedCube()
    expect(matchedFaceAtSlot(solved, 8, 8)).toBeNull() // slot 8 is E-layer, not D
  })

  it('returns the matched face for a piece freshly ejected via its own face, and null once misaligned', () => {
    // A single B turn sends identity 8 (home faces L,B) to D-layer slot 4
    // (D,B), still showing its own B color on the B facelet: matched at B.
    const solved = createSolvedCube()
    const afterB = applyMoves(solved, [{ face: 'B', turns: 1 }])
    const slot = currentSlotOf(afterB, 8)
    expect(slot).toBe(4)
    expect(matchedFaceAtSlot(afterB, 8, slot)).toBe('B')

    // Rotating D by one more quarter turn moves it to a D-layer slot that
    // touches neither of identity 8's own faces at all: not matched.
    const afterD = applyMoves(afterB, [{ face: 'D', turns: 1 }])
    const slotAfterD = currentSlotOf(afterD, 8)
    expect(matchedFaceAtSlot(afterD, 8, slotAfterD)).toBeNull()
  })
})
