import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { FIRST_LAYER_CORNER_IDENTITIES, ownFacesOfCorner, currentCornerSlotOf, layerOfCornerSlot, isFirstLayerCornerSolved, whiteFacingFaceOfCornerSlot, cornerFacesOfSlot } from './cornerGeometry'
import { cornerInsertionMoves } from './cornerInsertionMoves'

function findAlignedFacingState(identity: number, facing: 'own1' | 'own2' | 'D') {
  const solved = createSolvedCube()
  const [own1, own2] = ownFacesOfCorner(identity)
  const targetFace = facing === 'own1' ? own1 : facing === 'own2' ? own2 : 'D'
  let frontier = [solved]
  const seen = new Set<string>([JSON.stringify(solved.facelets)])
  for (let depth = 0; depth < 5; depth++) {
    for (const s of frontier) {
      const slot = currentCornerSlotOf(s, identity)
      const faces = cornerFacesOfSlot(slot)
      if (layerOfCornerSlot(slot) === 'D' && faces.includes(own1) && faces.includes(own2) && whiteFacingFaceOfCornerSlot(s, slot) === targetFace) {
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

describe('cornerInsertionMoves', () => {
  it('solves every identity from each of the 3 facing cases', () => {
    for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
      for (const facing of ['own1', 'own2', 'D'] as const) {
        const state = findAlignedFacingState(identity, facing)
        const result = applyMoves(state, cornerInsertionMoves(state, identity))
        expect(isFirstLayerCornerSolved(result, identity)).toBe(true)
      }
    }
  })

  it('never mutates the input state', () => {
    const identity = FIRST_LAYER_CORNER_IDENTITIES[0]!
    const state = findAlignedFacingState(identity, 'D')
    const before = JSON.stringify(state.facelets)
    cornerInsertionMoves(state, identity)
    expect(JSON.stringify(state.facelets)).toBe(before)
  })
})
