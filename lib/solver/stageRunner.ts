import type { CubeState } from '../cube/types'
import type { Move } from '../cube/moves'
import { applyMoves } from '../cube/moves'
import { cloneCubeState } from '../cube/state'
import { validateCube } from '../cube/validator'
import type { SolveFailure, SolveStage, SolveSuccess, StageSpec } from './types'

/**
 * Shared Case-Solving Stage Runner (D-011, D-043) — the generic
 * orchestration every solving method (Beginner Method now, CFOP later)
 * reuses as-is. Contains no solving logic of its own: no case tables, no
 * algorithm choices, nothing specific to any one method. What differs
 * between methods is entirely the `StageSpec[]` they hand to `runStages`.
 */

/**
 * Rejects input a solver has no business trying to solve, before any
 * stage-specific logic runs — reuses the existing Validator rather than a
 * solver-specific re-check (D-032's "single source of truth for legality"
 * discipline, applied here to the solver boundary).
 *
 * Size is checked first and separately from legality: the piece-level
 * solving this contract is meant to support is inherently 3x3-specific
 * today (`CORNER_FACELETS`/`EDGE_FACELETS`, D-029), the same documented
 * boundary the Validator's own piece-level checks already have — a 2x2 or
 * 4x4 cube can be perfectly legal (`validateCube` only runs its 2 general
 * checks for non-3 sizes) while still being nothing this solver can act on.
 */
export function rejectIfInvalid(state: CubeState): SolveFailure | null {
  if (state.size !== 3) {
    return {
      success: false,
      reason: 'unsupported-size',
      message: `This solver only supports 3x3x3 cubes right now (got size ${state.size}).`,
    }
  }

  const validation = validateCube(state)
  if (validation.valid) return null

  return {
    success: false,
    reason: 'invalid-cube',
    message: "This cube isn't in a legal, solvable configuration.",
    validation,
  }
}

/**
 * Runs each stage's solving logic in order against the cube as left by the
 * previous stage. A spec whose `solve` returns `[]` produces a stage with
 * empty `moves` and leaves the cube unchanged — a well-defined no-op (e.g.
 * "this stage was already satisfied"), not a special case the runner has
 * to detect or filter out. Never mutates `initialState`: `applyMoves`
 * already guarantees a fresh CubeState per call (D-027), and this function
 * only ever reads from `initialState`, never writes to it.
 *
 * Not part of `lib/solver/index.ts`'s public barrel (D-044): this function
 * has no validity gate of its own, so `solveWithStages` below is the only
 * sanctioned entry point for code outside this module. Called directly
 * here (and by this file's own tests) only because both already know the
 * input has already passed `rejectIfInvalid`.
 */
export function runStages(initialState: CubeState, specs: StageSpec[]): SolveStage[] {
  let current = initialState
  const stages: SolveStage[] = []
  for (const spec of specs) {
    const moves = spec.solve(current)
    stages.push({ id: spec.id, label: spec.label, moves, explanation: spec.explanation })
    current = applyMoves(current, moves)
  }
  return stages
}

/**
 * The full validate -> clone -> run sequence every `SolverMethod`
 * implementation needs, in one place, so no concrete solver (Beginner
 * Method, later CFOP) has to repeat it. The clone is this module's one
 * mutation-safety boundary: whatever the caller passed in is never touched
 * or held onto — `initialState` on the returned `SolveSuccess` is always a
 * separate object.
 */
export function solveWithStages(state: CubeState, specs: StageSpec[]): SolveFailure | SolveSuccess {
  const rejection = rejectIfInvalid(state)
  if (rejection) return rejection

  const initialState = cloneCubeState(state)
  const stages = runStages(initialState, specs)
  return { success: true, initialState, stages }
}

/**
 * Every move across every stage, in stage order. Always derived, never
 * stored on `SolveSuccess` itself — storing it alongside `stages` would be
 * exactly the kind of duplicated, driftable data this contract is designed
 * to avoid (D-043).
 */
export function aggregateMoves(stages: SolveStage[]): Move[] {
  return stages.flatMap((stage) => stage.moves)
}

/**
 * The CubeState after each stage, including index 0 = the state before any
 * stage has run. Always has `stages.length + 1` entries. Derived by
 * replaying each stage's own recorded `moves` through the existing Move
 * Engine — never stored on the stage itself — so a snapshot can never
 * disagree with the moves that produced it; there is nothing else it could
 * be computed from. Cheap to call as often as needed (a beginner solve is
 * at most a few dozen moves).
 */
export function deriveStageSnapshots(initialState: CubeState, stages: SolveStage[]): CubeState[] {
  const snapshots: CubeState[] = [initialState]
  let current = initialState
  for (const stage of stages) {
    current = applyMoves(current, stage.moves)
    snapshots.push(current)
  }
  return snapshots
}
