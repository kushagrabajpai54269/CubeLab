import { describe, it, expect } from 'vitest'
import { createSolvedCube, flattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { aggregateMoves } from '../stageRunner'
import { beginnerMethod } from './index'

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const TURNS: Move['turns'][] = [1, 2, 3]

describe('Beginner Method: End-to-End Full Solve Correctness Harness', () => {
  function mulberry32(seed: number) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const SOLVED_KEY = flattenFacelets(createSolvedCube()).join(',')

  it('1000 seeded random legal scrambles are successfully solved end-to-end', () => {
    const rand = mulberry32(0x0115eed)
    const TRIAL_COUNT = 1000
    const SCRAMBLE_LENGTH = 30
    let totalMoves = 0

    for (let trial = 0; trial < TRIAL_COUNT; trial++) {
      const scramble: Move[] = Array.from({ length: SCRAMBLE_LENGTH }, () => ({
        face: FACES[Math.floor(rand() * 6)]!,
        turns: TURNS[Math.floor(rand() * 3)]!,
      }))
      
      const state = applyMoves(createSolvedCube(), scramble)
      
      // We use beginnerMethod.solve as required by Subsystem 1 (Input Validity Gate)
      // This validates the cube and executes the method.
      let resultMoves: Move[]
      try {
        const result = beginnerMethod.solve(state)
        if (!result.success) {
          throw new Error(`Solve failed. Reason: ${result.reason}, Message: ${result.message}`)
        }
        resultMoves = aggregateMoves(result.stages)
      } catch (e) {
        throw new Error(`Trial ${trial}: threw: scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}], error: ${e}`)
      }
      
      // Validate against the REAL move engine.
      const solvedState = applyMoves(state, resultMoves)
      const solvedKey = flattenFacelets(solvedState).join(',')
      
      if (solvedKey !== SOLVED_KEY) {
         throw new Error(`Trial ${trial}: cube not fully solved! scramble=[${scramble.map((m) => `${m.face}${m.turns}`).join(' ')}]`)
      }

      totalMoves += resultMoves.length
    }

    console.log(`Successfully solved ${TRIAL_COUNT} random scrambles. Average move count: ${Math.round(totalMoves / TRIAL_COUNT)}`)
  })
})
