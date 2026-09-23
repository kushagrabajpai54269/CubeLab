export * from './types'
export { rejectIfInvalid, solveWithStages, aggregateMoves, deriveStageSnapshots } from './stageRunner'

// `runStages` is deliberately NOT re-exported here. It has no validity
// gate of its own — `solveWithStages` (validate -> clone -> run) is meant
// to be the only way anything outside `lib/solver/` can execute
// stage-specific solving logic, so that no future SolverMethod
// implementation (Beginner Method, later CFOP) or Phase D code can
// accidentally bypass the input-validity gate by calling the runner
// directly (Subsystem 1, D-044). `runStages` remains exported directly
// from `./stageRunner` for this module's own tests, which legitimately
// need to exercise the runner's sequencing in isolation from the gate.
