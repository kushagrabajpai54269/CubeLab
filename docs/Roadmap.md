# CubeLab — Roadmap

## Completed
- Phase 1 (v1 + v2): Requirements analysis complete, including full-SRS deep pass (D-009–D-020)
- Command palette scope and Learn content strategy resolved (D-021, D-022)
- D-013 and D-015 amended per feedback (D-023, D-024)
- D-011 shared-infrastructure design finalized and approved
- Architecture reviewed and approved — frozen unless a critical issue is discovered
- **Phase 0: Full site skeleton implemented and approved.**
- **Phase A, step 1 (CubeState): implemented and approved.**
- **Phase A, step 2 (Move Engine): implemented and approved.**
- **Phase A, step 3 (Notation Parser): implemented and approved.**
- **Phase A, step 4 (Validator): implemented and approved. Phase A is complete** — `lib/cube/pieces.ts`, `lib/cube/validator.ts`, 7 named invariant checks, 66 tests passing via real `npm install`/`npm test` in the user's own environment.
- **Phase B: complete and manually accepted** (2026-07-31). All five subsystems shipped, tested, and confirmed via the user's own manual acceptance testing across two rounds. **145 tests passing across 13 files** (up from Phase A's 66) — see Testing Log for the full breakdown:
  - Subsystem 1 — 2D Cube Net Input & Cube Health Check (D-030–D-032)
  - Subsystem 2 — Undo / Redo / Reset (D-033, D-034)
  - Subsystem 3 — Problem-Sticker Highlighting (D-035)
  - Subsystem 4 — Import / Export Cube State (D-036–D-038)
  - Stabilization pass — the D-039 corner-orientation chirality bug (found, root-caused, and permanently regression-tested) plus six manual-testing UX findings (D-040–D-042): Solver navigation, cube-entry orientation labeling, dark-mode flash on refresh, white-sticker visibility in light mode, Import/Export discoverability, general first-time-user pass
  - **The 2D net (`/solver/health`) is a permanent alternative input/diagnostic interface — it is explicitly not removed or deprecated once Phase D's 3D interface ships.**
- All 7 knowledge-base documents current as of the Phase B handoff pass (2026-08-02)
- **Phase C technical-debt gate: `noUncheckedIndexedAccess` cleanup — complete (2026-08-03).** Behavior-preserving, 145/145 tests still passing, `npm run typecheck` now 0 errors, lint clean. Full breakdown in Known Issues / Refactoring Log.
- **Phase C architecture (subsystem breakdown, orientation handling, Beginner Method vs. CFOP scope boundary) reviewed and approved (2026-08-03).**
- **Phase C, Subsystem 0: Solver Contract & Shared Infrastructure — complete (2026-08-03).** New `lib/solver/` module (`types.ts`, `stageRunner.ts`, `index.ts`): the `SolveStage`/`SolveSuccess`/`SolveFailure`/`SolveResult` contract, the `StageSpec`/`SolverMethod` pluggable-method interfaces (D-011), and the shared Case-Solving Stage Runner (`runStages`, `solveWithStages`, `aggregateMoves`, `deriveStageSnapshots`). Recorded as D-043. No solving logic of any kind — no case tables, no White Cross, nothing method-specific. **163 tests passing across 14 files** (up from 145 across 13), `npm run typecheck` 0 errors, lint clean.

## Current Sprint
Phase C, Subsystem 1 (White Cross) — starting next.

## Next Sprint
- **Phase C, Subsystems 2–6** (First-Layer Corners, Middle-Layer Edges, Last-Layer Cross, Last-Layer Face, Last-Layer Corner/Edge Position) — each a `StageSpec[]` plugged into Subsystem 0's `runStages`, per the approved sequencing (small reviewable subsystems, not one large pass).

## Future Features
- **Phase D: 3D renderer + interactive 3D Solver + solution animation.** This is the intended **final primary Solver interface**, per explicit product direction (confirmed 2026-08-02). Scope:
  - A large interactive 3D Rubik's Cube (Three.js via `@react-three/fiber`, per D-007), freely rotatable with mouse/touch.
  - Direct sticker selection on the 3D cube with color assignment — a second way to populate the same `CubeState` the 2D net already populates (D-026), sharing the same `validateCube` output and the same problem-sticker highlighting bridge (`lib/cube/highlight.ts`, D-035) rather than a parallel implementation.
  - A visible Solve control, enabled once `validateCube(cube).valid` is true (reusing the enablement rule already established for the Health Check, not reinvented).
  - Once Phase C exists: clicking Solve requests a solution and **animates it step-by-step** on the 3D cube, with previous/next and play/pause controls. The animation engine already takes a `playbackSpeed` parameter internally per D-024, fixed at 1.0× in the UI — this is exactly the kind of playback control D-024 anticipated.
  - **Architectural requirement:** the 3D renderer must be its own reusable system (its own component namespace, parameterized by `CubeState` and a move/animation queue), not coupled specifically to the Solver page — Phase D2 (Sandbox) is required to reuse it directly, without forking.
  - The 2D net (Phase B) remains available as a permanent alternative input/diagnostic tool.
- **Phase D2: Sandbox mode.** Depends on Phase D's 3D renderer (and, for algorithm execution, the existing Notation Parser + Move Engine — D-027/D-028 — already partially exercised by `cubeFromAlgorithm` in D-038, though Sandbox likely wants to *animate* each move rather than jump to the end state, which Phase D's animation queue should be designed generally enough to support). Scope:
  - Enter an algorithm/move sequence and execute it step-by-step on the interactive 3D cube.
  - Later: additional cube sizes/types — `CubeState`'s size-generality (D-003) and the facelet-primary model (D-026) were designed with this in mind from Phase A; the two currently 3×3-specific tables (`CORNER_FACELETS`/`EDGE_FACELETS`, D-029) are the known, already-logged gap to close when this lands.
  - Inserted as "D2" (mirroring the existing F/F2 pattern below) specifically so it doesn't require reletting Phases E onward — Sandbox's only real dependency is Phase D, not Phase C or E.
- Phase E: CFOP solver — reuses the same shared infrastructure as Beginner Method; new work is primarily F2L/OLL/PLL case-table data (D-011). Also the trigger point for extending the Notation Parser/Move Engine to `M`/`E`/`S` slice moves (D-028's logged future-revisit condition).
- Phase F: Algorithms encyclopedia (search/filter/categorize) + Practice/Trainer mode (D-012)
- Phase F2: **Learn section content authoring** — writing original, technically accurate, beginner-friendly, concise educational copy into the already-scaffolded framework (D-021); About/FAQ/Contact/Privacy real copy also lands around here
- Phase G: Progress tracking, Achievements, onboarding flow, Settings (theme + sound toggle D-016, analytics opt-out D-023)
- Phase H: Auth (mocked, D-006), SEO, anonymous analytics wiring (decoupled D-013, opt-out D-023)
- Phase I: Accessibility + performance QA pass, documentation finalization

## Long-Term Ideas
- Additional puzzles: 2×2, 4×4, 5×5, Pyraminx, Megaminx, Mirror Cube
- Additional solving methods: Roux, ZZ — plug into the same `SolverMethod` shared infrastructure (D-011)
- Cloud sync via Supabase; real OAuth credentials (post-migration to Claude Code)
- PWA, multiplayer/online practice, AI-assisted learning
- Camera-based cube scanning — explicitly deferred (D-018)
- Algorithm bookmarking; resume download on About page
- Adjustable animation playback speed — UI-only change if ever added, since the engine already supports it (D-024)
- Kociemba/URFDLB facelet-string format interop, for sharing cube states with external cuber tools (D-036, deferred)
- Shareable compact URL encoding for a cube state (noted during Phase B Subsystem 4 design, deferred)

## Technical Debt
- ~~`noUncheckedIndexedAccess` TypeScript strictness gap~~ — **resolved 2026-08-03**, before Phase C as recommended. `npm run typecheck` now reaches 0 errors; `npm test` (145/145) and `npm run lint` remain unchanged. Full breakdown in Known Issues / Refactoring Log.
- No component-level (React Testing Library) UI tests exist anywhere in the project yet — all UI correctness has been verified by manual testing so far. Flagged as a real gap to close before Phase D's 3D interactions (click-to-select on a mesh, drag-to-rotate) become much harder to verify by code review alone than 2D DOM clicks have been.
- `CORNER_FACELETS`/`EDGE_FACELETS` remain 3×3-specific (D-029); Phase D2 (additional puzzle sizes) is the logged trigger to address this. **Related, not resolved:** Phase C's `rejectIfInvalid` (D-043) now explicitly rejects non-3×3 input at the solver boundary with a distinct `'unsupported-size'` reason, so this limitation fails loudly and specifically rather than the solver silently misbehaving on a 2×2/4×4 input — a mitigation, not a fix; the underlying 3×3-specificity itself is unchanged.
