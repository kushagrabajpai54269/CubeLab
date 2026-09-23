import { describe, it, expect } from 'vitest'
import { secondLayerInsertion } from './secondLayerInsertionAlgorithms'
import { createSolvedCube } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { isSecondLayerEdgeSolved, SECOND_LAYER_EDGE_IDENTITIES } from './secondLayerGeometry'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { ejectSecondLayerEdgeMoves, alignSecondLayerEdgeMoves } from './secondLayerEjectAndAlign'
import { matchedFaceAtSlot } from './secondLayerGeometry'
import { currentSlotOf } from './geometry'
import type { Face } from '../../cube/types'

/**
 * Regression coverage for the derived second-layer insertion algorithm
 * table (Phase C, Subsystem 4). The table self-verifies at module load
 * (throws if a derivation isn't fully preserving) — this file re-checks
 * that from the outside for every (matchedFace, otherFace) pair actually
 * used by the 4 second-layer targets, and separately exercises each
 * algorithm against a real, independently-scrambled starting state (not
 * just the module's own isolated construction), matching this codebase's
 * "replay through the real Move Engine, don't trust internal bookkeeping"
 * verification discipline.
 */

const PAIRS: [number, Face, Face][] = [
  [8, 'L', 'B'], [8, 'B', 'L'],
  [9, 'L', 'F'], [9, 'F', 'L'],
  [10, 'R', 'B'], [10, 'B', 'R'],
  [11, 'R', 'F'], [11, 'F', 'R'],
]

describe('secondLayerInsertion', () => {
  it('every derived algorithm is non-empty and made only of matchedFace/otherFace/D moves', () => {
    for (const [, matchedFace, otherFace] of PAIRS) {
      const moves = secondLayerInsertion(matchedFace, otherFace)
      expect(moves.length).toBeGreaterThan(0)
      for (const m of moves) {
        expect([matchedFace, otherFace, 'D']).toContain(m.face)
      }
    }
  })

  it('throws for a face pair with no derived entry', () => {
    expect(() => secondLayerInsertion('U', 'D')).toThrow()
  })

  it('solves the target and preserves siblings + full first layer from a real, independently reached matched state', () => {
    // Independently reach a genuine "matched at matchedFace" D-layer state
    // for each identity via the already-tested eject/align pipeline,
    // starting from a real (non-trivial) scramble rather than the
    // derivation module's own isolated construction, then confirm the
    // table's algorithm for that exact (matchedFace, otherFace) actually
    // solves it in place when replayed through the real Move Engine.
    const allFaces: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
    const allTurns = [1, 2, 3] as const
    const scrambles: { face: Face; turns: 1 | 2 | 3 }[][] = []
    for (const f1 of allFaces) {
      for (const t1 of allTurns) {
        for (const f2 of allFaces) {
          for (const t2 of allTurns) {
            scrambles.push([{ face: f1, turns: t1 }, { face: f2, turns: t2 }])
          }
        }
      }
    }

    for (const [identity, matchedFace] of PAIRS) {
      let reached: ReturnType<typeof createSolvedCube> | null = null
      for (const scramble of scrambles) {
        const scrambled = applyMoves(createSolvedCube(), [...scramble])
        const eject = ejectSecondLayerEdgeMoves(scrambled, identity, SECOND_LAYER_EDGE_IDENTITIES)
        const afterEject = applyMoves(scrambled, eject)
        const align = alignSecondLayerEdgeMoves(afterEject, identity)
        const afterAlign = applyMoves(afterEject, align)
        const slot = currentSlotOf(afterAlign, identity)
        if (matchedFaceAtSlot(afterAlign, identity, slot) === matchedFace) {
          reached = afterAlign
          break
        }
      }
      expect(reached).not.toBeNull()

      const own2 = PAIRS.find(([id, mf]) => id === identity && mf === matchedFace)![2]
      const moves = secondLayerInsertion(matchedFace, own2)
      const result = applyMoves(reached!, moves)
      expect(isSecondLayerEdgeSolved(result, identity)).toBe(true)
      // The scrambles used to reach this fixture don't guarantee siblings
      // or the full first layer were solved beforehand (unlike the
      // derivation module's own isolated construction) — so this checks
      // the real preservation property that actually matters: whatever
      // was already solved before the algorithm ran is still solved after.
      for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
        if (id === identity) continue
        if (isSecondLayerEdgeSolved(reached!, id)) {
          expect(isSecondLayerEdgeSolved(result, id)).toBe(true)
        }
      }
      for (const id of WHITE_CROSS_EDGE_IDENTITIES) {
        if (isWhiteCrossEdgeSolved(reached!, id)) {
          expect(isWhiteCrossEdgeSolved(result, id)).toBe(true)
        }
      }
      for (const id of FIRST_LAYER_CORNER_IDENTITIES) {
        if (isFirstLayerCornerSolved(reached!, id)) {
          expect(isFirstLayerCornerSolved(result, id)).toBe(true)
        }
      }
    }
  })
})
