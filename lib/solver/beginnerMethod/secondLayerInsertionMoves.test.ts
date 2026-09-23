import { describe, it, expect } from 'vitest'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import { ejectSecondLayerEdgeMoves, alignSecondLayerEdgeMoves } from './secondLayerEjectAndAlign'
import { secondLayerInsertionMoves } from './secondLayerInsertionMoves'

/**
 * Regression coverage for the full eject -> align -> insert pipeline
 * (Phase C, Subsystem 4), exhaustive over every single-move scramble
 * applied to a solved cube, mirroring
 * `insertionMoves.test.ts`/`cornerInsertionMoves.test.ts`'s coverage
 * style for the earlier stages.
 */

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

describe('secondLayerInsertionMoves', () => {
  it('throws if the target is not matched', () => {
    const solved = createSolvedCube()
    expect(() => secondLayerInsertionMoves(solved, 8)).toThrow()
  })

  it('solves every target for every single-move scramble via eject -> align -> insert', () => {
    for (const face of FACES) {
      for (const turns of TURNS) {
        const scrambled = applyMoves(createSolvedCube(), [{ face, turns }])
        for (const id of SECOND_LAYER_EDGE_IDENTITIES) {
          if (isSecondLayerEdgeSolved(scrambled, id)) continue
          let state = scrambled
          const eject = ejectSecondLayerEdgeMoves(state, id, SECOND_LAYER_EDGE_IDENTITIES)
          state = applyMoves(state, eject)
          const align = alignSecondLayerEdgeMoves(state, id)
          state = applyMoves(state, align)
          const insert = secondLayerInsertionMoves(state, id)
          state = applyMoves(state, insert)
          expect(isSecondLayerEdgeSolved(state, id)).toBe(true)
        }
      }
    }
  })
})
