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
(Phase C, Subsystems 1–6) and CFOP (Phase E) — each method's actual
solving logic (case recognition, algorithm selection) lives in its own
module and plugs into `runStages` as a `StageSpec[]`, rather than either
method reimplementing sequencing or input-validation itself.

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

163 tests across 14 files, all passing — see `Testing-Log.md` for the
full per-file breakdown.
