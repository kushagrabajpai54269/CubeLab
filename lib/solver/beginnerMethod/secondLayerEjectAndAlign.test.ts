import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { SECOND_LAYER_EDGE_IDENTITIES } from './secondLayerGeometry'
import { layerOfSlot, currentSlotOf } from './geometry'
import { ejectSecondLayerEdgeMoves, alignSecondLayerEdgeMoves } from './secondLayerEjectAndAlign'
import { matchedFaceAtSlot } from './secondLayerGeometry'

/**
 * Regression coverage for Phase C, Subsystem 4's eject/align step. Follows
 * the same exhaustive-deterministic-coverage style as
 * `firstLayerCorners.test.ts`/`whiteCross.test.ts` rather than unseeded
 * fuzzing.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

function allSingleMoves(): Move[] {
  return FACES.flatMap((face) => TURNS.map((turns) => ({ face, turns })))
}

describe('ejectSecondLayerEdgeMoves + alignSecondLayerEdgeMoves', () => {
  it('returns [] to eject when already in the D-layer', () => {
    const solved = createSolvedCube()
    const afterB = applyMoves(solved, [{ face: 'B', turns: 1 }])
    expect(ejectSecondLayerEdgeMoves(afterB, 8, SECOND_LAYER_EDGE_IDENTITIES)).toEqual([])
  })

  it('reaches the D-layer and then a matched alignment for every single move applied to a solved cube', () => {
    for (const move of allSingleMoves()) {
      const scrambled = applyMoves(createSolvedCube(), [move])
      for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
        const eject = ejectSecondLayerEdgeMoves(scrambled, id, SECOND_LAYER_EDGE_IDENTITIES)
        const afterEject = applyMoves(scrambled, eject)
        expect(layerOfSlot(currentSlotOf(afterEject, id))).toBe('D')

        const align = alignSecondLayerEdgeMoves(afterEject, id)
        const afterAlign = applyMoves(afterEject, align)
        const slot = currentSlotOf(afterAlign, id)
        expect(matchedFaceAtSlot(afterAlign, id, slot)).not.toBeNull()
      }
    }
  })

  it('reaches a matched D-layer alignment for every target after every 2-move scramble', () => {
    const singles = allSingleMoves()
    for (const m1 of singles) {
      for (const m2 of singles) {
        const scrambled = applyMoves(createSolvedCube(), [m1, m2])
        for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
          const eject = ejectSecondLayerEdgeMoves(scrambled, id, SECOND_LAYER_EDGE_IDENTITIES)
          const afterEject = applyMoves(scrambled, eject)
          expect(layerOfSlot(currentSlotOf(afterEject, id))).toBe('D')

          const align = alignSecondLayerEdgeMoves(afterEject, id)
          const afterAlign = applyMoves(afterEject, align)
          const slot = currentSlotOf(afterAlign, id)
          expect(matchedFaceAtSlot(afterAlign, id, slot)).not.toBeNull()
        }
      }
    }
  })

  it('picks the placed-aware preferred face when a genuine 2-way eject choice exists', () => {
    // Construct a state where identity 8 sits at the E-layer slot touching
    // neither of its own faces (slot 11, R/F) while identity 10 (own faces
    // R,B) is already correctly solved — ejecting via R would disturb it,
    // so F should be preferred.
    const solved = createSolvedCube()
    // R U R' U' style setup verified empirically is unnecessary here: build
    // directly by checking which single move sends 8 to slot 11 while
    // leaving 10 solved, discovered via the existing move engine.
    let found: Move[] | null = null
    outer: for (const m1 of allSingleMoves()) {
      const s1 = applyMoves(solved, [m1])
      for (const m2 of allSingleMoves()) {
        const s2 = applyMoves(s1, [m2])
        if (currentSlotOf(s2, 8) === 11 && currentSlotOf(s2, 10) === 10) {
          found = [m1, m2]
          break outer
        }
      }
    }
    expect(found).not.toBeNull()
    const state = applyMoves(solved, found!)
    const eject = ejectSecondLayerEdgeMoves(state, 8, SECOND_LAYER_EDGE_IDENTITIES)
    const afterEject = applyMoves(state, eject)
    // The preference should avoid disturbing identity 10's solved slot
    // when a real alternative exists.
    expect(currentSlotOf(afterEject, 10)).toBe(10)
  })
})
