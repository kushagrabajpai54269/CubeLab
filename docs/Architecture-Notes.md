# CubeLab — Architecture Notes

> **Provenance note (added 2026-08-02):** unlike this project's other five
> living documents, no prior authoritative version of this file was
> supplied during the Phase B documentation reconciliation pass — it exists
> only as a same-session draft written before that reconciliation began.
> Treat its Phase A content as a best-effort technical summary, not a
> preserved original. If a real prior version exists, supply it and this
> file will be reconciled the same rigorous way the other five were,
> instead of being trusted as-is.

## Layering

```
lib/cube/*             — pure, dependency-free cube logic (Phase A + Phase B additions)
lib/solver/*            — pure, dependency-free solving-method contract + shared runner (Phase C)
lib/history/*          — generic, cube-agnostic utilities
store/*                — Zustand: the only layer that knows about persistence/undo
components/*, app/*    — React UI
```

`lib/cube/` never imports from `store/` or `components/`. `lib/solver/` follows
the exact same rule, and additionally never imports from `store/`,
`components/`, or any rendering/animation concept — it imports only from
`lib/cube/` (`CubeState`, `Move`, `applyMoves`, `validateCube`, `ValidationResult`).
This is checked by convention/review today, not by lint rule — worth a
`no-restricted-imports` ESLint rule if this boundary ever needs enforcing
mechanically.

## Core cube library (`lib/cube/`)

- **`types.ts`** — `Face`, `FaceletColor`, `CubeState` (facelets-primary,
  D-026), size-general (D-003).
- **`state.ts`** — construction/clone/equality/solved-check, plus
  `flattenFacelets`/`faceletAt` (mutual inverses; the latter added in Phase
  B, Subsystem 3, for the highlighting bridge below).
- **`tables.ts`** — `BASE_PERMUTATIONS`, `CORNER_FACELETS`, `EDGE_FACELETS`,
  all derived (not hand-written) by `scripts/derive-move-tables.mjs`
  (D-027). **If this script ever needs changing again, re-read D-039 in
  `Decision-Log.md` first** — the corner facelet ordering has a real
  geometric correctness requirement (chirality consistency) that isn't
  obvious from the data alone, and a plausible-looking partial fix (a fixed
  axis order) was tried and disproved before the correct one was found.
- **`moves.ts`** — the Move Engine: `applyMove`, `applyMoves`, `inverseMove`.
  Unaffected by the D-039 bug or its fix — confirmed correct throughout that
  investigation.
- **`notation.ts`** — the Notation Parser: `parseMove`/`parseAlgorithm`/
  `formatMove`/`formatAlgorithm`, single-layer-turn scope only (D-028).
- **`pieces.ts`** — piece-level decomposition (corners/edges), always
  computed on demand from facelets (D-026), never stored. Logic unaffected
  by D-039 — the bug was in `tables.ts`'s geometry data, not here. Its
  `noUncheckedIndexedAccess` debt was cleaned up pre-Phase C (2026-08-03,
  see Refactoring Log) — no logic or public API change, only narrowing/
  assertions added at points tsc couldn't prove safe on its own.
- **`validator.ts`** — `validateCube`, returns `ValidationResult` /
  `ValidationCheck[]`, each with a stable `id` (never a display string), and
  an optional, strictly logical `affected: AffectedEntities` (D-035) — no
  facelet indices, no colors, no UI concepts of any kind.
- **`net.ts`** — derived 2D unfolded-cross layout (only the 6 face-block
  positions are hand-specified; all 54 cell positions are computed) (D-030).
- **`highlight.ts`** — `resolveAffectedFacelets`: the *only* place that
  converts a Validator's logical `AffectedEntities` into facelet
  coordinates. Still framework-agnostic (D-035) — this is the reuse seam a
  future 3D renderer calls into, exactly like the 2D net does.
- **`serialization.ts`** — facelet-string codec + algorithm-based
  construction (D-036–D-038), entirely free of store/React/persistence, so
  Sandbox/Trainer/a future 3D input surface can call it directly.

## Solver layer (`lib/solver/`)

New in Phase C, Subsystem 0 (D-043). Contains the solving-method-agnostic
contract and orchestration only — no case tables, no White-Cross/OLL/PLL
logic, nothing specific to Beginner Method or CFOP.

- **`types.ts`** — `SolveStage` (`{id, label, moves, explanation?}` —
  deliberately no stored `CubeState` snapshot, no stored formatted
  algorithm string, both always derived, D-043); the `SolveSuccess` /
  `SolveFailure` / `SolveResult` union (same never-throw pattern as
  `notation.ts`'s `ParseResult`); `StageSpec` (one stage's solving logic,
  decoupled from sequencing — the shape a concrete method implements per
  stage); `SolverMethod` (the pluggable per-method interface D-011
  anticipated — `BeginnerMethodSolver` now, `CfopSolver` later).
- **`stageRunner.ts`** — the shared Case-Solving Stage Runner: `rejectIfInvalid`
  (Validator-backed input gate, also rejecting non-3×3 input distinctly —
  the same 3×3-specificity `pieces.ts`'s `CORNER_FACELETS`/`EDGE_FACELETS`
  already have, D-029); `runStages` (sequences a `StageSpec[]` against a
  starting cube); `solveWithStages` (validate → clone → run, the one
  sequence every concrete `SolverMethod` needs); `aggregateMoves` /
  `deriveStageSnapshots` (derive a flattened `Move[]` / per-stage
  `CubeState[]` on demand from stage moves, via the existing Move Engine —
  never stored, so nothing can drift out of sync with the moves that
  produced it).

`lib/solver/` will remain the only shared code between Beginner Method
(Phase C, Subsystems 2–9) and CFOP (Phase E) — each method's actual
solving logic (case recognition, algorithm selection) lives in its own
module and plugs into `runStages` as a `StageSpec[]`, rather than either
method reimplementing sequencing or input-validation itself.

**Subsystem 1 (Input Validity Gate, D-044):** `runStages` is intentionally
excluded from `lib/solver/index.ts`'s public barrel — `solveWithStages`
(validate → clone → run) is the only way anything outside this module can
execute stage-specific solving logic, so no future `SolverMethod`
implementation can accidentally skip the gate. `runStages` remains
exported directly from `stageRunner.ts` for this module's own tests.

**Subsystem 2 (White Cross, D-045/D-046), `lib/solver/beginnerMethod/`:**
the first actual solving logic, and the first Beginner-Method-specific
module — deliberately separate from `lib/solver/`'s shared, method-agnostic
root. Not yet wired into a `StageSpec`/`SolverMethod` — that assembly
happens once more Beginner Method stages exist. Structure:
- `geometry.ts` — pure derived layer/face/slot helpers (`layerOfSlot`,
  `ownFaceOf`, `ringNeighborsOf`, `currentSlotOf`, `whiteFacingFaceOfSlot`),
  all computed from `EDGE_FACELETS`/`SOLVED_EDGE_COLORS`, nothing hardcoded.
- `insertionAlgorithms.ts` — the two terminal D-layer insertion algorithms
  (facing-down: one own-face half-turn; facing-side: a 3-move sequence
  through a ring-neighbor face), derived and self-checked against the real
  Move Engine at module load, D-027-style — not memorized cube notation.
  Facing-side needing a 3rd face was not assumed; it was proven necessary
  by full orbit exhaustion under {own face, D} before being accepted.
- `ejectAndAlign.ts` — gets a target edge to the D-layer (`ejectMoves`) and
  aligns its column (`alignmentMoves`); also `isFaceHomeSolved`, the shared
  placed-aware preference helper both this file and `insertionMoves.ts`
  use to avoid unnecessarily disturbing an already-solved edge.
- `insertionMoves.ts` — wires the D-045 algorithms together with the
  placed-aware preference from `ejectAndAlign.ts`.
- `whiteCross.ts` — `solveWhiteEdge` (eject → align → insert composition)
  and `solveWhiteCross` (round-robin over the 4 target edges with a
  mechanical, finite-state cycle-detection termination guarantee — not a
  hand-proved round count, which an early implementation's real infinite
  oscillation bug showed cannot be trusted on reasoning alone).

**Subsystem 3 (First-Layer Corners, D-047/D-048), same directory:** the
second stage, run after White Cross. Mirrors the edge module's shape:
- `cornerGeometry.ts` — corner analogue of `geometry.ts`. Structurally
  simpler than edges (only U/D layers, no third "E-layer" case) but with 3
  orientation states instead of 2.
- `cornerInsertionAlgorithms.ts` — the 3 terminal D-layer insertion
  algorithms (facing-own1, facing-own2, facing-down), derived and
  self-checked D-027-style. Unlike edges' facing-side, corners' facing-down
  turned out fully preservable (a 5-move algorithm) once the derivation's
  own goal test was corrected to require full preservation, not merely
  "target solved" — an earlier, weaker goal test caused a real corner
  oscillation once wired into the full solver, caught immediately by the
  exhaustive test suite. Test fixtures for this self-verification are
  built via direct facelet manipulation (the same surgical-construction
  pattern `validator.test.ts`'s helpers use), not a move-based search —
  this is a performance choice for the throwaway fixture only; the
  algorithm itself remains entirely search-derived and replay-verified.
- `cornerEjectAndAlign.ts` / `cornerInsertionMoves.ts` — eject, align, and
  the placed-aware preference for the one eject case needing a foreign
  face (the U-layer slot diagonally opposite a corner's home).
- `firstLayerCorners.ts` — `solveOneCorner` and `solveFirstLayerCorners`.
  The round-robin retry and cycle-detector (mirroring `whiteCross.ts`)
  track **both** corner state and white-cross-edge state together, not
  just corners: the diagonal-slot eject's foreign-face turn was found to
  disturb a cross edge, with no repair path in an earlier version that
  only tracked corners.

**Subsystem 4 (Second-Layer Edges, D-049), same directory:** the third
stage, run after White Cross and First-Layer Corners. Mirrors the earlier
modules' shape, with two things genuinely different for this target type
(only 2 facelets total, both own faces are side faces — no U/D own face
the way corners have):
- `secondLayerGeometry.ts` — `SECOND_LAYER_EDGE_IDENTITIES` (the 4 E-layer
  target slots, derived by filtering `layerOfSlot`, not hand-typed) and
  `matchedFaceAtSlot` — this stage's alignment concept: a D-layer edge only
  touches one side face at a time, so "aligned" means rotating D until that
  side facelet shows the color actually belonging to it, not "touches both
  own faces" the way a corner's D-layer column does.
- `secondLayerInsertionAlgorithms.ts` — a single derived, self-verified
  8-move `{matchedFace, otherOwnFace, D}` algorithm per matched face,
  D-027-style, full-preservation goal test (target + 2 siblings + full
  cross + full first-layer corners) per the D-047 lesson.
- `secondLayerEjectAndAlign.ts` / `secondLayerInsertionMoves.ts` — eject
  and align. Every E-layer eject branch, including the one sharing exactly
  one own face, is a genuine 2-way placed-aware choice between the slot's
  2 faces — an earlier version wrongly treated the shared-face branch as
  forced to a single candidate (mirroring D-048's corner design too
  literally), which produced a real deterministic cycle once the longer
  8-move insertion's higher collateral disturbance was in play (D-049).
- `secondLayerEdges.ts` — `solveOneSecondLayerEdge` and
  `solveSecondLayerEdges`. Unlike `whiteCross.ts`/`firstLayerCorners.ts`'s
  fixed-order round-robin, this stage's round-robin greedily solves
  whichever unsolved target currently causes the least collateral
  disturbance to already-solved pieces, re-evaluated after every move —
  fixed order (even rotated) was shown to hit a genuine period-4 cycle
  here, unlike the earlier two stages. The mechanical cycle-detector
  (tracking second-layer, cross, and corner state together) remains the
  actual termination guarantee regardless.

**Subsystem 5 (Last-Layer Orientation / 2-look OLL, D-050), same
directory:** the fourth stage, run after Second-Layer Edges. The first
stage to solve orientation only, not position — permutation is deferred to
Subsystem 6 (PLL) — so, unlike every earlier stage, "solved" is tracked
per D-layer slot rather than per piece identity (see `lastLayerGeometry
.ts`'s own docstring). Structure:
- `lastLayerGeometry.ts` — `LAST_LAYER_EDGE_SLOTS` / `LAST_LAYER_CORNER_
  SLOTS` (the 4 D-layer slots of each type, derived by filtering
  `layerOfSlot`/`layerOfCornerSlot`, not hand-typed), `isLastLayerEdge
  Oriented` / `isLastLayerCornerOriented` (D-facelet shows D's own color),
  and `oppositeSideFaceOf` (derived from `ringNeighborsOf`, not a
  hand-typed F/B, L/R table).
- `lastLayerEdgeOrientationAlgorithms.ts` — the edge-orientation parity
  invariant (0, 2, or 4 of the 4 D-layer edges oriented) reduces the
  problem to exactly 3 cases up to D rotation: Dot, Line, L-shape. Line
  and L-shape each get a derived, self-verified algorithm (D-027-style,
  bounded IDDFS search over `{D, F, R}`, full-preservation goal test);
  Dot is solved by reducing to L-shape (apply its algorithm once, any
  alignment) rather than a dedicated search. `classifyEdgeOrientation`
  determines both the case and the D-rotation needed to align it,
  empirically against the real Move Engine (not an assumed rotation
  direction — the D-039 chirality lesson applied again).
- `lastLayerCornerOrientationAlgorithms.ts` — a single general
  corner-orientation "step" algorithm (a real Sune analogue), found by
  forward-searching from the solved cube for the first reachable,
  edge-orientation-preserving corner disturbance and inverting it — not a
  per-case table. A hand-constructed target fixture and a hand-translated
  "D-for-U" Sune substitution were both tried first and both failed for
  reasons recorded in D-050 (reachability and chirality respectively);
  forward-search-then-invert sidesteps both.
- `lastLayerOrientation.ts` — `solveLastLayerEdgeOrientation` (deterministic,
  at most 2 algorithm applications) then `solveLastLayerCornerOrientation`
  (a bounded round-level search — branching 4, over which D-rotation
  offset to apply the step algorithm at each round — since pure greedy
  hill-climbing was shown to converge for only 5 of the 27 legal
  corner-twist patterns). No outer cycle-detected loop is needed the way
  Subsystems 2-4 need one: neither step here re-disturbs anything the
  other step, or the completed first two layers, already fixed.

## Generic utilities (`lib/history/`)

`historyStack.ts` — `{past, present, future}` undo/redo, parameterized over
any `T`, with zero knowledge of cubes (D-033). Any future editor-like
feature (a 3D sticker-picker, an algorithm-authoring tool) reuses this as-is
rather than reinventing undo/redo.

## Application layer (`store/`)

`useCubeEditorStore` (renamed from `useNetInputStore` — see
`Refactoring-Log.md`) wraps `lib/history` + `lib/cube/serialization` around
a `CubeState`, adds persistence (`StorageAdapter`, current-cube-only,
D-034) and undo/redo. This store is Solver-page-specific glue — the pattern
to repeat for a future 3D input surface is a *sibling* store (or an
extension of this one, if the 3D and 2D interfaces are meant to literally
share one editing session — an open design question for Phase D) that also
wraps the same `lib/cube/*` functions, not a fork of the cube logic itself.

## Presentation layer (`components/`, `app/`)

`components/cube/` currently holds the 2D-net-specific components
(`CubeNet`, `ColorPalette`, `OrientationHint`, `HealthCheckPanel`,
`ImportPanel`, `ExportPanel`).

**Reusability requirement for Phase D (3D Solver) and Phase D2 (Sandbox):**
the planned 3D renderer must live in its own component namespace (e.g.
`components/cube3d/`), parameterized by `CubeState` and an animation/move
queue, not built inside or coupled to the Solver page. Phase D2 (Sandbox) —
**not Phase E, which is CFOP** — is the feature required to reuse it
without forking, per explicit product direction (2026-08-02). The
precedent for this kind of reuse boundary already exists: `lib/cube/
highlight.ts` was deliberately kept generic in Phase B specifically so a
future 3D view could call the exact same function the 2D net does (D-035)
— the 3D renderer itself should be designed to the same standard.

## Design tokens

Tailwind `cube.*` colors map 1:1 to `FaceletColor` values (D-010); any
future renderer (2D or 3D) should read color from the same six tokens
rather than hardcoding hex values a second time, so a future rebrand or
accessibility palette change only happens in one place.

## Testing conventions

Tests are co-located (`foo.ts` → `foo.test.ts`). Pure `lib/` logic gets
thorough unit tests; Zustand stores get tests that exercise the public
action API against `getState()`; no component-level (RTL) tests exist yet
anywhere in the project (see `Testing-Log.md`) — this will need to change
once Phase D's 3D interactions (click-to-select on a mesh, drag-to-rotate)
are much harder to verify by code review alone than 2D DOM clicks have been
so far.

## Current test count

275 tests across 33 files, all passing — see `Testing-Log.md` for the
full per-file breakdown.
