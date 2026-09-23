import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import {
  layerOfCornerSlot,
  FIRST_LAYER_CORNER_IDENTITIES,
  ownFacesOfCorner,
  currentCornerSlotOf,
  isFirstLayerCornerSolved,
} from './cornerGeometry'

describe('FIRST_LAYER_CORNER_IDENTITIES', () => {
  it('derives exactly 4 identities, one per corner touching white', () => {
    expect(FIRST_LAYER_CORNER_IDENTITIES).toHaveLength(4)
    expect(new Set(FIRST_LAYER_CORNER_IDENTITIES).size).toBe(4)
  })
})

describe('layerOfCornerSlot', () => {
  it('classifies all 8 slots into U (4) and D (4) -- no third layer for corners', () => {
    const counts = { U: 0, D: 0 }
    for (let slot = 0; slot < 8; slot++) counts[layerOfCornerSlot(slot)]++
    expect(counts).toEqual({ U: 4, D: 4 })
  })
})

describe('ownFacesOfCorner', () => {
  it('assigns each identity exactly 2 distinct non-U/D side faces', () => {
    for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
      const [a, b] = ownFacesOfCorner(identity)
      expect(a).not.toBe(b)
      expect(['L', 'R', 'F', 'B']).toContain(a)
      expect(['L', 'R', 'F', 'B']).toContain(b)
    }
  })

  it('own faces match home slot geometry: identity starts solved at its own U-slot', () => {
    for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
      const solved = createSolvedCube()
      expect(currentCornerSlotOf(solved, identity)).toBe(identity)
      expect(isFirstLayerCornerSolved(solved, identity)).toBe(true)
    }
  })
})

describe('currentCornerSlotOf / whiteFacingFaceOfCornerSlot / isFirstLayerCornerSolved', () => {
  it('tracks a corner through a move: R takes URF corner off its slot, no longer solved', () => {
    const solved = createSolvedCube()
    const urfIdentity = FIRST_LAYER_CORNER_IDENTITIES.find(
      (id) => ownFacesOfCorner(id).includes('R') && ownFacesOfCorner(id).includes('F')
    )!
    expect(isFirstLayerCornerSolved(solved, urfIdentity)).toBe(true)
    const afterR = applyMoves(solved, [{ face: 'R', turns: 1 }])
    expect(isFirstLayerCornerSolved(afterR, urfIdentity)).toBe(false)
  })

  it('a single R\' turn moves the URF corner directly to the D-layer', () => {
    const solved = createSolvedCube()
    const urfIdentity = FIRST_LAYER_CORNER_IDENTITIES.find(
      (id) => ownFacesOfCorner(id).includes('R') && ownFacesOfCorner(id).includes('F')
    )!
    const afterRPrime = applyMoves(solved, [{ face: 'R', turns: 3 }])
    const slot = currentCornerSlotOf(afterRPrime, urfIdentity)
    expect(layerOfCornerSlot(slot)).toBe('D')
  })
})
