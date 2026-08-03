import type { CubeState } from '../cube/types'
import type { Move } from '../cube/moves'
import type { ValidationResult } from '../cube/validator'

/**
 * Shared, solving-method-agnostic contracts for Phase C (D-043). These
 * types describe cube-solving semantics only — nothing here knows about
 * React, Zustand, the DOM, Three.js, or animation timing, so Phase D's
 * interactive 3D experience (and, per D-011, Phase E's CFOP solver) can
 * both consume/implement this contract without Phase C depending on either.
 *
 * Deliberate omission, explained in full in D-043: a stage carries only its
 * `moves`, never a stored before/after CubeState and never a stored
 * formatted algorithm string. Both are always cheap to derive from `moves`
 * via the existing Move Engine (`applyMove`/`applyMoves`) and Notation
 * Parser (`formatAlgorithm`) — see `stageRunner.ts` — so there is exactly
 * one place a stage's effect is recorded, and nothing can drift out of
 * sync with it the way a separately-stored snapshot or string could.
 */

/**
 * One named step of a solve. `id` is a stable identifier (never a display
 * string — the same `id`-vs-`label` split the Validator already uses for
 * its checks, D-029) that a solving-method module defines for its own
 * stages; this shared contract doesn't hardcode what stages exist, since
 * Beginner Method and CFOP (D-011) have genuinely different stage
 * vocabularies.
 */
export interface SolveStage {
  id: string
  label: string
  moves: Move[]
  /** Optional instructional context for a future UI — e.g. "why this case". */
  explanation?: string
}

export interface SolveSuccess {
  success: true
  /**
   * The cube exactly as given to the solver — always a defensive clone
   * (see `solveWithStages` in stageRunner.ts), never the caller's own
   * object, so a consumer can hold onto this indefinitely without risking
   * it being mutated out from under them by anything else.
   */
  initialState: CubeState
  stages: SolveStage[]
}

export type SolveFailureReason = 'invalid-cube' | 'unsupported-size'

export interface SolveFailure {
  success: false
  reason: SolveFailureReason
  message: string
  /**
   * Present only for `reason: 'invalid-cube'` — the exact `validateCube()`
   * output, reused as-is (not re-summarized) so a caller can show
   * specifically what's wrong, the same way the Health Check UI already
   * does with this same type (D-032).
   */
  validation?: ValidationResult
}

/**
 * Never throws: a solve either succeeds or reports a specific, structured
 * failure. Mirrors the existing `ParseResult`/`FaceletParseResult` pattern
 * (`notation.ts`, `serialization.ts`) rather than inventing a new shape.
 */
export type SolveResult = SolveSuccess | SolveFailure

/**
 * One stage's solving logic, decoupled from where it runs in a larger
 * solve: given the cube as left by every earlier stage, return the moves
 * that complete this stage. The shared stage runner (`stageRunner.ts`) is
 * what sequences these — a `StageSpec` itself knows nothing about ordering,
 * so the same shape works for Beginner Method now and CFOP later (D-011).
 * A spec returning `[]` moves (this stage was already satisfied) is
 * well-defined, not an error case — see `runStages`.
 */
export interface StageSpec {
  id: string
  label: string
  explanation?: string
  solve: (state: CubeState) => Move[]
}

/**
 * A pluggable solving method (D-011) — `BeginnerMethodSolver` (Phase C)
 * and, later, `CfopSolver` (Phase E) both implement this same shape.
 * `solve` is expected to reject invalid/unsupported input via
 * `rejectIfInvalid` (stageRunner.ts) before running any stage-specific
 * logic, per the existing "Validator is the single source of truth for
 * legality" discipline (D-032).
 */
export interface SolverMethod {
  readonly id: string
  readonly label: string
  solve: (state: CubeState) => SolveResult
}
