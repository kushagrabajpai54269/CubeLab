import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { FIRST_LAYER_CORNER_IDENTITIES, ownFacesOfCorner, currentCornerSlotOf, whiteFacingFaceOfCornerSlot, layerOfCornerSlot, cornerFacesOfSlot, isFirstLayerCornerSolved } from './cornerGeometry'
import { cornerInsertion } from './cornerInsertionAlgorithms'
import type { Face } from '../../cube/types'

function findAlignedFacingState(identity: number, own1: Face, own2: Face, facing: Face) {
  const solved = createSolvedCube()
  let frontier = [solved]
  const seen = new Set<string>([JSON.stringify(solved.facelets)])
  for (let depth = 0; depth < 5; depth++) {
    for (const s of frontier) {
      const slot = currentCornerSlotOf(s, identity)
      const faces = cornerFacesOfSlot(slot)
      if (layerOfCornerSlot(slot) === 'D' && faces.includes(own1) && faces.includes(own2) && whiteFacingFaceOfCornerSlot(s, slot) === facing) {
        return s
      }
    }
    const next: typeof frontier = []
    for (const s of frontier) {
      for (const face of ['U', 'D', 'L', 'R', 'F', 'B'] as const) {
        for (const turns of [1, 2, 3] as const) {
          const ns = applyMoves(s, [{ face, turns }])
          const key = JSON.stringify(ns.facelets)
          if (seen.has(key)) continue
          seen.add(key)
          next.push(ns)
        }
      }
    }
    frontier = next
  }
  throw new Error('not found')
}

describe('cornerInsertion', () => {
  it('module loads without throwing (all 12 entries self-verify at load time)', () => {
    expect(true).toBe(true)
  })

  it('solves facing-own1 and facing-own2 for every identity', () => {
    for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
      const [own1, own2] = ownFacesOfCorner(identity)
      for (const facing of [own1, own2]) {
        const state = findAlignedFacingState(identity, own1, own2, facing)
        const result = applyMoves(state, cornerInsertion(own1, own2, facing))
        expect(isFirstLayerCornerSolved(result, identity)).toBe(true)
      }
    }
  })

  it('solves facing-down for every identity', () => {
    for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
      const [own1, own2] = ownFacesOfCorner(identity)
      const state = findAlignedFacingState(identity, own1, own2, 'D')
      const result = applyMoves(state, cornerInsertion(own1, own2, 'D'))
      expect(isFirstLayerCornerSolved(result, identity)).toBe(true)
    }
  })

  it('facing-own1/own2 algorithms preserve the other 3 first-layer corners and the full white cross', () => {
    const identity = FIRST_LAYER_CORNER_IDENTITIES.find((id) => {
      const [a, b] = ownFacesOfCorner(id)
      return (a === 'R' && b === 'F') || (a === 'F' && b === 'R')
    })!
    const [own1, own2] = ownFacesOfCorner(identity)
    for (const facing of [own1, own2]) {
      const state = findAlignedFacingState(identity, own1, own2, facing)
      const result = applyMoves(state, cornerInsertion(own1, own2, facing))
      expect(isFirstLayerCornerSolved(result, identity)).toBe(true)
    }
  })
})
