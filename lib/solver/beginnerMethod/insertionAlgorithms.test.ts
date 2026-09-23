import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, ownFaceOf, ringNeighborsOf, currentSlotOf, whiteFacingFaceOfSlot, layerOfSlot, facesOfSlot } from './geometry'
import { facingDownInsertion, facingSideInsertion } from './insertionAlgorithms'

describe('facingDownInsertion', () => {
  it('a single half-turn solves every identity from D-layer-aligned-facing-down', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const ownFace = ownFaceOf(identity)
      const solved = createSolvedCube()
      // Reach D-layer-aligned-facing-down via a half turn of own face (this
      // itself is the geometric fact confirmed during investigation).
      const setup = applyMoves(solved, [{ face: ownFace, turns: 2 }])
      const slot = currentSlotOf(setup, identity)
      expect(layerOfSlot(slot)).toBe('D')
      expect(whiteFacingFaceOfSlot(setup, slot)).toBe('D')

      const result = applyMoves(setup, facingDownInsertion(ownFace))
      expect(currentSlotOf(result, identity)).toBe(identity)
      expect(whiteFacingFaceOfSlot(result, identity)).toBe('U')
    }
  })
})

describe('facingSideInsertion', () => {
  it('module loads without throwing (all 8 own/neighbor combinations self-verify at load time)', () => {
    // Import already happened; if derivation had failed, the whole test
    // file would have failed to load. This test exists to make that
    // guarantee explicit and visible in the test report.
    expect(true).toBe(true)
  })

  it('solves every (own face, neighbor face) combination from a real facing-side state', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const ownFace = ownFaceOf(identity)
      for (const neighborFace of ringNeighborsOf(ownFace)) {
        // Independently re-derive a facing-side setup state via a full,
        // unrestricted search (not the {ownFace,2},{neighbor,turns} shape
        // used earlier, since that construction was shown not to work in
        // general) to cross-check the production module's own derivation.
        const solved = createSolvedCube()
        let frontier = [solved]
        const seen = new Set<string>([JSON.stringify(solved.facelets)])
        let setupState: typeof solved | null = null
        for (let depth = 0; depth < 4 && !setupState; depth++) {
          for (const s of frontier) {
            const slot = currentSlotOf(s, identity)
            const touchesOwn = layerOfSlot(slot) === 'D' && facesOfSlot(slot).includes(ownFace)
            if (touchesOwn && whiteFacingFaceOfSlot(s, slot) !== 'D') {
              setupState = s
              break
            }
          }
          if (setupState) break
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
        expect(setupState).not.toBeNull()

        const result = applyMoves(setupState!, facingSideInsertion(ownFace, neighborFace))
        expect(currentSlotOf(result, identity)).toBe(identity)
        expect(whiteFacingFaceOfSlot(result, identity)).toBe('U')
      }
    }
  })

  it('confirms the {own face, D}-only impossibility this design relies on: applying only own-face and D moves to a facing-side state never solves it within a generous move budget', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES.find((id) => ownFaceOf(id) === 'F')!
    const ownFace = ownFaceOf(identity)
    const solved = createSolvedCube()

    // Construct a genuine ALIGNED facing-side state via unrestricted search.
    let frontier = [solved]
    const seen0 = new Set<string>([JSON.stringify(solved.facelets)])
    let facingSideState: typeof solved | null = null
    for (let depth = 0; depth < 4 && !facingSideState; depth++) {
      for (const s of frontier) {
        const slot = currentSlotOf(s, identity)
        const aligned = layerOfSlot(slot) === 'D' && facesOfSlot(slot).includes(ownFace)
        if (aligned && whiteFacingFaceOfSlot(s, slot) !== 'D') { facingSideState = s; break }
      }
      if (facingSideState) break
      const next: typeof frontier = []
      for (const s of frontier) {
        for (const face of ['U', 'D', 'L', 'R', 'F', 'B'] as const) {
          for (const turns of [1, 2, 3] as const) {
            const ns = applyMoves(s, [{ face, turns }])
            const key = JSON.stringify(ns.facelets)
            if (seen0.has(key)) continue
            seen0.add(key)
            next.push(ns)
          }
        }
      }
      frontier = next
    }
    expect(facingSideState).not.toBeNull()

    // Exhaustively expand the {ownFace, D} orbit from this state (reduced
    // to just this identity's slot+facing) and confirm "solved" is never
    // reached -- proving the impossibility mechanically, not by assertion.
    function reducedKey(state: ReturnType<typeof applyMoves>): string {
      const slot = currentSlotOf(state, identity)
      return `${slot}:${whiteFacingFaceOfSlot(state, slot)}`
    }
    const fdMoves = [
      { face: ownFace, turns: 1 as const }, { face: ownFace, turns: 2 as const }, { face: ownFace, turns: 3 as const },
      { face: 'D' as const, turns: 1 as const }, { face: 'D' as const, turns: 2 as const }, { face: 'D' as const, turns: 3 as const },
    ]
    let orbitFrontier = [facingSideState!]
    const seen = new Set<string>([reducedKey(facingSideState!)])
    let solvedReached = false
    for (let depth = 0; depth < 10 && orbitFrontier.length > 0; depth++) {
      const next: typeof orbitFrontier = []
      for (const s of orbitFrontier) {
        if (currentSlotOf(s, identity) === identity && whiteFacingFaceOfSlot(s, identity) === 'U') solvedReached = true
        for (const m of fdMoves) {
          const ns = applyMoves(s, [m])
          const key = reducedKey(ns)
          if (seen.has(key)) continue
          seen.add(key)
          next.push(ns)
        }
      }
      orbitFrontier = next
    }
    expect(solvedReached).toBe(false)
    expect(seen.size).toBeLessThan(24) // proper subset of the 24 possible states -- orbit genuinely restricted
  })
})
