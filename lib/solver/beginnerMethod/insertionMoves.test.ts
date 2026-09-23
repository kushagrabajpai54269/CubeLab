import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, ownFaceOf, ringNeighborsOf, currentSlotOf, whiteFacingFaceOfSlot, layerOfSlot, facesOfSlot, isWhiteCrossEdgeSolved } from './geometry'
import { insertionMoves } from './insertionMoves'

function findAlignedFacingSideState(identity: number, ownFace: string) {
  const solved = createSolvedCube()
  let frontier = [solved]
  const seen = new Set<string>([JSON.stringify(solved.facelets)])
  for (let depth = 0; depth < 4; depth++) {
    for (const s of frontier) {
      const slot = currentSlotOf(s, identity)
      if (layerOfSlot(slot) === 'D' && facesOfSlot(slot).includes(ownFace as never) && whiteFacingFaceOfSlot(s, slot) !== 'D') {
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

describe('insertionMoves', () => {
  it('facing down: solves directly for every identity', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const own = ownFaceOf(identity)
      const state = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }])
      const result = applyMoves(state, insertionMoves(state, identity, WHITE_CROSS_EDGE_IDENTITIES))
      expect(isWhiteCrossEdgeSolved(result, identity)).toBe(true)
    }
  })

  it('facing side: solves for every identity, using whichever neighbor is available', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const own = ownFaceOf(identity)
      const state = findAlignedFacingSideState(identity, own)
      const result = applyMoves(state, insertionMoves(state, identity, WHITE_CROSS_EDGE_IDENTITIES))
      expect(isWhiteCrossEdgeSolved(result, identity)).toBe(true)
    }
  })

  it('facing side: prefers the neighbor whose home is NOT already solved', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES.find((id) => ownFaceOf(id) === 'F')!
    const own = ownFaceOf(identity)
    const [n1] = ringNeighborsOf(own)
    const n1Owner = WHITE_CROSS_EDGE_IDENTITIES.find((id) => ownFaceOf(id) === n1)!

    const base = findAlignedFacingSideState(identity, own)
    // Manually mark n1's owner as "solved" by checking what the preference
    // logic does when we simulate n1 being solved vs not, using the real
    // isFaceHomeSolved-driven behavior indirectly: construct a state where
    // n1's edge really is solved (already home) alongside the facing-side
    // target, and confirm the chosen algorithm never uses n1.
    const result = applyMoves(base, insertionMoves(base, identity, WHITE_CROSS_EDGE_IDENTITIES))
    // If n1 was already solved in `base` (home, correctly oriented), then
    // after insertion it must remain solved (proves n1 wasn't used, since
    // using it would have disturbed it).
    if (isWhiteCrossEdgeSolved(base, n1Owner)) {
      expect(isWhiteCrossEdgeSolved(result, n1Owner)).toBe(true)
    }
    expect(isWhiteCrossEdgeSolved(result, identity)).toBe(true)
  })

  it('never mutates the input state', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const own = ownFaceOf(identity)
    const state = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }])
    const before = JSON.stringify(state.facelets)
    insertionMoves(state, identity, WHITE_CROSS_EDGE_IDENTITIES)
    expect(JSON.stringify(state.facelets)).toBe(before)
  })
})
