import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCubeState, areCubeStatesEqual, isSolvedState } from '../cube/state'
import { applyMoves, type Move } from '../cube/moves'
import { formatAlgorithm } from '../cube/notation'
import type { CubeState } from '../cube/types'
import type { StageSpec } from './types'
import {
  rejectIfInvalid,
  runStages,
  solveWithStages,
  aggregateMoves,
  deriveStageSnapshots,
} from './stageRunner'

const U: Move = { face: 'U', turns: 1 }
const R: Move = { face: 'R', turns: 1 }
const F: Move = { face: 'F', turns: 1 }

/** A stage spec that always returns the same fixed moves, ignoring state. */
function fixedStage(id: string, moves: Move[]): StageSpec {
  return { id, label: id, solve: () => moves }
}

/** An illegal cube: a real corner given a duplicate color (D-029's own
 * surgical-construction pattern, reused here rather than reinvented). */
function withImpossibleCorner(): CubeState {
  const solved = createSolvedCube()
  const facelets = { ...solved.facelets, U: [...solved.facelets.U] }
  facelets.U[0] = 'red' // breaks corner integrity (and color count)
  return { size: 3, facelets }
}

describe('rejectIfInvalid', () => {
  it('accepts a legal, solvable cube', () => {
    expect(rejectIfInvalid(createSolvedCube())).toBeNull()
  })

  it('rejects an illegal cube via the existing Validator, carrying its ValidationResult', () => {
    const rejection = rejectIfInvalid(withImpossibleCorner())
    expect(rejection).not.toBeNull()
    expect(rejection?.success).toBe(false)
    expect(rejection?.reason).toBe('invalid-cube')
    expect(rejection?.validation?.valid).toBe(false)
  })

  it('rejects an unsupported cube size, distinctly from an illegal cube', () => {
    const rejection = rejectIfInvalid(createSolvedCube(2))
    expect(rejection?.reason).toBe('unsupported-size')
    expect(rejection?.validation).toBeUndefined()
  })
})

describe('runStages: sequencing', () => {
  it('never mutates the initial state', () => {
    const original = createSolvedCube()
    const before = cloneCubeState(original)
    runStages(original, [fixedStage('a', [U]), fixedStage('b', [R])])
    expect(areCubeStatesEqual(original, before)).toBe(true)
  })

  it('each stage receives exactly the state left by the previous stage', () => {
    const seenStates: CubeState[] = []
    const specs: StageSpec[] = [
      { id: 'a', label: 'a', solve: (state) => { seenStates.push(state); return [U] } },
      { id: 'b', label: 'b', solve: (state) => { seenStates.push(state); return [R] } },
      { id: 'c', label: 'c', solve: (state) => { seenStates.push(state); return [F] } },
    ]
    runStages(createSolvedCube(), specs)

    expect(seenStates).toHaveLength(3)
    expect(areCubeStatesEqual(seenStates[0]!, createSolvedCube())).toBe(true)
    expect(areCubeStatesEqual(seenStates[1]!, applyMoves(createSolvedCube(), [U]))).toBe(true)
    expect(areCubeStatesEqual(seenStates[2]!, applyMoves(createSolvedCube(), [U, R]))).toBe(true)
  })

  it('preserves stage order and each stage\'s own recorded moves', () => {
    const stages = runStages(createSolvedCube(), [
      fixedStage('white-cross', [U, R]),
      fixedStage('first-layer-corners', [F]),
    ])
    expect(stages.map((s) => s.id)).toEqual(['white-cross', 'first-layer-corners'])
    expect(stages[0]!.moves).toEqual([U, R])
    expect(stages[1]!.moves).toEqual([F])
  })

  it('a stage whose spec returns no moves is a well-defined no-op, not a special case', () => {
    const stages = runStages(createSolvedCube(), [
      fixedStage('already-solved-cross', []),
      fixedStage('rest', [U]),
    ])
    expect(stages[0]!.moves).toEqual([])
    // The no-op stage is still present in the output, not filtered out.
    expect(stages).toHaveLength(2)
    // And the cube it left behind (verified via snapshots) is unchanged by it.
    const snapshots = deriveStageSnapshots(createSolvedCube(), stages)
    expect(areCubeStatesEqual(snapshots[0]!, snapshots[1]!)).toBe(true)
  })

  it('a fully solved cube with no stages produces a well-defined empty solve', () => {
    const stages = runStages(createSolvedCube(), [])
    expect(stages).toEqual([])
    expect(aggregateMoves(stages)).toEqual([])
  })
})

describe('aggregateMoves', () => {
  it('preserves stage order across the flattened move list', () => {
    const stages = runStages(createSolvedCube(), [
      fixedStage('a', [U, U]),
      fixedStage('b', []),
      fixedStage('c', [R, F]),
    ])
    expect(aggregateMoves(stages)).toEqual([U, U, R, F])
  })

  it('formatAlgorithm on the aggregate matches formatting each stage and joining — no drift possible since both derive from the same moves', () => {
    const stages = runStages(createSolvedCube(), [fixedStage('a', [U, R]), fixedStage('b', [F])])
    const viaAggregate = formatAlgorithm(aggregateMoves(stages))
    const viaPerStageJoin = stages.map((s) => formatAlgorithm(s.moves)).filter(Boolean).join(' ')
    expect(viaAggregate).toBe(viaPerStageJoin)
    expect(viaAggregate).toBe('U R F')
  })
})

describe('deriveStageSnapshots', () => {
  it('has stages.length + 1 entries, starting with the initial state', () => {
    const initial = createSolvedCube()
    const stages = runStages(initial, [fixedStage('a', [U]), fixedStage('b', [R])])
    const snapshots = deriveStageSnapshots(initial, stages)
    expect(snapshots).toHaveLength(3)
    expect(areCubeStatesEqual(snapshots[0]!, initial)).toBe(true)
  })

  it('each snapshot equals applying that stage\'s moves to the previous snapshot', () => {
    const initial = createSolvedCube()
    const stages = runStages(initial, [fixedStage('a', [U, R]), fixedStage('b', [F])])
    const snapshots = deriveStageSnapshots(initial, stages)
    expect(areCubeStatesEqual(snapshots[1]!, applyMoves(snapshots[0]!, stages[0]!.moves))).toBe(true)
    expect(areCubeStatesEqual(snapshots[2]!, applyMoves(snapshots[1]!, stages[1]!.moves))).toBe(true)
  })

  it('the final snapshot matches applying the full aggregate Move[] in one shot (stage-chunked replay agrees with a single replay)', () => {
    const initial = createSolvedCube()
    const stages = runStages(initial, [fixedStage('a', [U, R]), fixedStage('b', [F, U])])
    const snapshots = deriveStageSnapshots(initial, stages)
    const viaAggregate = applyMoves(initial, aggregateMoves(stages))
    expect(areCubeStatesEqual(snapshots[snapshots.length - 1]!, viaAggregate)).toBe(true)
  })
})

describe('solveWithStages: the full validate -> clone -> run sequence', () => {
  it('rejects an invalid cube without running any stage logic', () => {
    let ran = false
    const result = solveWithStages(withImpossibleCorner(), [
      { id: 'a', label: 'a', solve: () => { ran = true; return [] } },
    ])
    expect(result.success).toBe(false)
    expect(ran).toBe(false)
  })

  it('rejects an unsupported size without running any stage logic', () => {
    let ran = false
    const result = solveWithStages(createSolvedCube(4), [
      { id: 'a', label: 'a', solve: () => { ran = true; return [] } },
    ])
    expect(result.success).toBe(false)
    expect(result.success === false && result.reason).toBe('unsupported-size')
    expect(ran).toBe(false)
  })

  it('a legal scrambled cube passes the gate and does reach stage execution', () => {
    let ran = false
    let seenState: CubeState | null = null
    const scrambled = applyMoves(createSolvedCube(), [U, R, F])
    const result = solveWithStages(scrambled, [
      {
        id: 'a',
        label: 'a',
        solve: (state) => {
          ran = true
          seenState = state
          return []
        },
      },
    ])
    expect(result.success).toBe(true)
    expect(ran).toBe(true)
    expect(seenState).not.toBeNull()
    expect(areCubeStatesEqual(seenState!, scrambled)).toBe(true)
  })

  it('a valid cube (solved or legally scrambled) does execute every stage in the pipeline, not just some', () => {
    const calls: string[] = []
    const result = solveWithStages(createSolvedCube(), [
      { id: 'a', label: 'a', solve: () => { calls.push('a'); return [] } },
      { id: 'b', label: 'b', solve: () => { calls.push('b'); return [] } },
    ])
    expect(result.success).toBe(true)
    expect(calls).toEqual(['a', 'b'])
  })

  it('on success, returns a defensively cloned initialState, never the caller\'s own object', () => {
    const input = createSolvedCube()
    const result = solveWithStages(input, [])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.initialState).not.toBe(input)
      expect(areCubeStatesEqual(result.initialState, input)).toBe(true)
    }
  })

  it('never mutates the caller\'s input, including through stage-produced moves', () => {
    const input = createSolvedCube()
    const before = cloneCubeState(input)
    solveWithStages(input, [fixedStage('a', [U, R, F])])
    expect(areCubeStatesEqual(input, before)).toBe(true)
  })

  it('composes correctly end to end: applying the resulting aggregate moves to initialState reaches the same state runStages left the cube in', () => {
    const scrambled = applyMoves(createSolvedCube(), [U, R])
    const result = solveWithStages(scrambled, [
      fixedStage('undo-r', [{ face: 'R', turns: 3 }]),
      fixedStage('undo-u', [{ face: 'U', turns: 3 }]),
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      const final = applyMoves(result.initialState, aggregateMoves(result.stages))
      expect(isSolvedState(final)).toBe(true)
    }
  })
})
