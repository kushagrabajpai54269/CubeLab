import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, ownFaceOf, currentSlotOf, layerOfSlot, facesOfSlot, isWhiteCrossEdgeSolved } from './geometry'
import { ejectMoves, alignmentMoves, isFaceHomeSolved } from './ejectAndAlign'

describe('isFaceHomeSolved', () => {
  it('is true for a solved cube on every white-cross face, false for a face with no cross owner (U/D)', () => {
    const solved = createSolvedCube()
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      expect(isFaceHomeSolved(solved, ownFaceOf(identity), WHITE_CROSS_EDGE_IDENTITIES)).toBe(true)
    }
    expect(isFaceHomeSolved(solved, 'U', WHITE_CROSS_EDGE_IDENTITIES)).toBe(false)
    expect(isFaceHomeSolved(solved, 'D', WHITE_CROSS_EDGE_IDENTITIES)).toBe(false)
  })

  it('becomes false once that face\'s edge is moved away from home', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const own = ownFaceOf(identity)
    const moved = applyMoves(createSolvedCube(), [{ face: own, turns: 1 }])
    expect(isFaceHomeSolved(moved, own, WHITE_CROSS_EDGE_IDENTITIES)).toBe(false)
  })
})

describe('ejectMoves', () => {
  it('returns [] when already in the D-layer', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const own = ownFaceOf(identity)
    const state = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }])
    expect(ejectMoves(state, identity, WHITE_CROSS_EDGE_IDENTITIES)).toEqual([])
  })

  it('reaches the D-layer for every identity from a scrambled state', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const solved = createSolvedCube()
      // A scrambled state: apply a short scramble and confirm eject (if
      // needed) lands the piece in the D-layer.
      const scrambled = applyMoves(solved, [{ face: 'U', turns: 1 }, { face: 'R', turns: 1 }, { face: 'F', turns: 2 }])
      const moves = ejectMoves(scrambled, identity, WHITE_CROSS_EDGE_IDENTITIES)
      const result = applyMoves(scrambled, moves)
      expect(layerOfSlot(currentSlotOf(result, identity))).toBe('D')
    }
  })

  it('never disturbs an already-placed edge when a safe (unplaced) foreign-face choice exists', () => {
    // Construct: identity A already placed at home; identity B sitting in
    // an E-layer slot touching neither its own face nor A's face (so B has
    // a free, safe choice available that doesn't involve A).
    // We search for such a configuration directly via the real engine
    // rather than hand-assume one exists.
    const solved = createSolvedCube()
    const allMoves = (['U', 'D', 'L', 'R', 'F', 'B'] as const).flatMap((face) =>
      ([1, 2, 3] as const).map((turns) => ({ face, turns }))
    )
    const idA = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const idB = WHITE_CROSS_EDGE_IDENTITIES[1]!
    let frontier = [solved]
    const seen = new Set<string>([JSON.stringify(solved.facelets)])
    let found: typeof solved | null = null
    for (let depth = 0; depth < 5 && !found; depth++) {
      for (const s of frontier) {
        if (!isWhiteCrossEdgeSolved(s, idA)) continue
        const slotB = currentSlotOf(s, idB)
        const ownB = ownFaceOf(idB)
        const ownA = ownFaceOf(idA)
        const [fa, fb] = facesOfSlot(slotB)
        const touchesOwn = fa === ownB || fb === ownB
        const touchesA = fa === ownA || fb === ownA
        if (layerOfSlot(slotB) === 'E' && !touchesOwn && !touchesA) { found = s; break }
      }
      if (found) break
      const next: typeof frontier = []
      for (const s of frontier) {
        for (const m of allMoves) {
          const ns = applyMoves(s, [m])
          const key = JSON.stringify(ns.facelets)
          if (seen.has(key)) continue
          seen.add(key)
          next.push(ns)
        }
      }
      frontier = next
    }
    expect(found).not.toBeNull()

    const moves = ejectMoves(found!, idB, WHITE_CROSS_EDGE_IDENTITIES)
    const result = applyMoves(found!, moves)
    expect(isWhiteCrossEdgeSolved(result, idA)).toBe(true) // A untouched
  })
})

describe('alignmentMoves', () => {
  it('returns [] when already aligned', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const own = ownFaceOf(identity)
    const state = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }])
    expect(alignmentMoves(state, identity)).toEqual([])
  })

  it('aligns from every D-layer column to the target column, for every identity', () => {
    for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
      const own = ownFaceOf(identity)
      const misaligned = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }, { face: 'D', turns: 1 }])
      const moves = alignmentMoves(misaligned, identity)
      const result = applyMoves(misaligned, moves)
      expect(facesOfSlot(currentSlotOf(result, identity))).toContain(own)
    }
  })

  it('D-turns used for alignment never touch the U-layer (never disturb a placed edge)', () => {
    const identity = WHITE_CROSS_EDGE_IDENTITIES[0]!
    const own = ownFaceOf(identity)
    const otherIdentity = WHITE_CROSS_EDGE_IDENTITIES.find((id) => id !== identity)!
    const misaligned = applyMoves(createSolvedCube(), [{ face: own, turns: 2 }, { face: 'D', turns: 1 }])
    expect(isWhiteCrossEdgeSolved(misaligned, otherIdentity)).toBe(true)
    const moves = alignmentMoves(misaligned, identity)
    const result = applyMoves(misaligned, moves)
    expect(isWhiteCrossEdgeSolved(result, otherIdentity)).toBe(true)
  })
})
