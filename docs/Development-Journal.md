# CubeLab — Development Journal

Chronological narrative of what was built, problems hit, and how they were resolved. Written to be readable without reading the full conversation history.

---

## Entry 1 — 2026-07-23 — Project Kickoff & Phase 1

**What was built:**
No code yet. Completed Phase 1 (Requirements Analysis) and initialized all seven knowledge-base documents: Decision Log, Development Journal, Architecture Notes, Roadmap, Known Issues, Refactoring Log, Testing Log.

**Problems encountered:**
- The master prompt implicitly assumes a persistent, version-controlled workspace (commits, long-term maintenance), while the user wants to start in a Claude Project instead of Claude Code.
- Several spec items (real OAuth credentials, git history) are fundamentally incompatible with a chat-based workspace.

**How they were solved:**
- Agreed on a two-stage plan: build in the Project for as long as practical, migrate to Claude Code + Git once complexity outgrows it (recorded as D-008).
- Auth will be built against mock providers until migration (D-006).

**Lessons learned:**
- Better to name workspace limitations explicitly up front (in the Decision Log) than to discover them mid-build.
- Treating documentation as equally important as code from message one makes the eventual migration much lower-risk.

**Remaining work:**
- Phase 2: Software Architecture (routing, state management, storage abstraction, component hierarchy, folder structure).
- Resolve open questions from Phase 1 (Cloudflare deployment mode, Learn content ownership, video hosting).

---

## Entry 2 — 2026-07-23 — Full SRS Provided, Deep Requirements Analysis

**What was built:**
No code yet. The user provided the complete three-part SRS (Product Vision & UX Philosophy; Functional Requirements; Architecture & Engineering Standards) plus the original Master Development Prompt. Performed a comprehensive Phase 1 requirements analysis on top of the fuller spec, resolving several previously open questions and surfacing new ones. Twelve new decisions were logged (D-009–D-020). Architecture Notes, Roadmap, and Known Issues were substantially updated; Decision Log and this journal were appended to, not overwritten, preserving prior history per project rules.

**Problems encountered:**
- The fuller SRS resolved some earlier open questions (Cloudflare deployment mode, video hosting, brand/design tokens) but introduced new tensions — most notably, the "most data stays local" privacy promise sits in real tension with the requested aggregate analytics ("most searched algorithms," "average session duration"), which are inherently cross-user metrics no LocalStorage-only design can produce.
- The two source documents disagreed slightly on Learn section content ordering (Finger Tricks before or after Beginner Method).
- "Automatically generated FAQs based on common user behavior" isn't achievable at launch — no usage data exists yet, and live generation would undermine the static/SEO-optimized page requirement.

**How they were solved:**
- Analytics decoupled entirely from the personal StorageAdapter/progress system as its own anonymous, disclosed concern (D-013).
- Learn ordering resolved in favor of the more detailed SRS (D-020).
- FAQ: launch with manually authored FAQs; treat "auto-generated" as a future, data-informed curation step once real usage data exists (D-014).

**Lessons learned:**
- Requirements analysis isn't a one-time gate — when new source material arrives, it's better to produce a new, clearly-dated analysis that builds on and cross-references the old one than to silently rewrite history. This kept the Decision Log and this journal honest as a real project history rather than a snapshot.
- Several "obviously fine" requirements (analytics, auto-generated FAQs) had real hidden tensions with other stated principles (privacy-first, SEO/performance) that only surfaced under close reading — worth the deliberate analysis pass rather than rushing ahead.

**Remaining work:**
- Two open questions need input: Learn section content authorship, and command palette scope (nav-only vs. also algorithm search).
- Once resolved: formally close out Phase 2 (Architecture) and begin Phase 3 (UI/UX Design) screen-by-screen, pending approval to proceed.

---

## Entry 3 — 2026-07-23 — Feedback Incorporated, D-011 Design Proposal, Full Approval

**What was built:**
No code yet. Incorporated explicit user feedback: resolved both remaining open questions (Learn content strategy — framework first, content in a dedicated later phase, D-021; command palette scope — extensible command registry, D-022), plus two requested amendments (D-013 gets an explicit analytics opt-out, D-023; D-015's animation engine internally parameterizes playback speed, D-024). Produced a detailed shared-infrastructure design for D-011 covering exactly which layers are shared between the Beginner Method and CFOP solvers versus method-specific, written into this document. Delivered a concise review summary of D-009–D-020. User reviewed and approved the overall architecture direction.

**Problems encountered:**
- None significant — this was a refinement and formal sign-off pass rather than new discovery.

**How they were solved:** n/a

**Lessons learned:**
- The "authenticity vs. shared code" tension in D-011 resolves cleanly once "authenticity" is understood to live in *data* (case tables, stage order) rather than *control-flow* — a generic case-solving runner serves both methods without homogenizing their actual solving philosophy.
- Amending a decision (D-013, D-015) rather than editing it in place keeps the log's own stated promise ("never silently replace") consistent even for small refinements, not just major reversals.

**Remaining work:**
- Architecture is approved and considered frozen unless a critical issue is discovered.
- Implementation begins with Phase 0 (full site skeleton), proceeding in small, reviewable phases per the user's requested workflow: objective → implement that phase only → explain code/design decisions → wait for approval before the next phase.
- Sound asset sourcing remains the one open item in Known Issues, not blocking.

---

## Entry 4 — 2026-07-25 — Phase 0: Full Site Skeleton Implemented

**What was built:**
First real code. A Next.js 15 (App Router) + TypeScript + Tailwind project: every page route stubbed (Home has a real hero; all others use a shared `PlaceholderPage` component per D-021's Empty States principle); design tokens wired into Tailwind (D-010); a `StorageAdapter`/`LocalStorageAdapter` pair (D-002) with theme preference as its first consumer; Zustand stores for theme and command-palette state (D-009); an extensible Command Palette (Ctrl/Cmd+K) built on a `CommandSource` registry with navigation, quick-action, and theme-toggle sources live, and algorithm-search/learning-topic sources registered but returning no results yet (D-022); shared UI primitives (Button/`buttonStyles`, Card, Dialog); two starter unit tests establishing the co-located test convention (D-017).

**Problems encountered:**
- npm's registry returned a 403 in this sandbox when attempting to run `npm install`/`vitest run` to verify the build — could not execute a live install or test run here.

**How they were solved:**
- Reported the limitation plainly rather than claiming verification that didn't happen. Code was hand-reviewed for correctness (including Next.js 15's async `params` API for dynamic routes) and delivered as source for the user to install and test locally.

**Lessons learned:**
- Even without a working sandbox registry, following the architecture precisely (StorageAdapter from day one, CommandSource registry instead of a hard-coded palette, shared `buttonStyles` instead of polymorphic component hacks) keeps the skeleton faithful to the frozen decisions rather than cutting corners under time pressure.

**Remaining work:**
- User to run `npm install && npm test` locally to confirm the build and test suite pass.
- Awaiting approval of Phase 0 before starting Phase A (core cube engine).

---

## Entry 5 — 2026-07-26 — Dependency Correction (React 19 Peer Conflicts)

**What was built:**
No new features. User's local `npm install` surfaced a real bug: `lucide-react@0.383.0`'s peer range (`^16–18`) rejects React 19. Verified via web search (not assumed from training data) the actual React-19-compatible versions for all three affected packages and corrected `package.json`: `zustand` → `^5.0.0`, `framer-motion` → `^12.0.0`, `lucide-react` → `^1.26.0`. Logged as D-025.

**Problems encountered:**
- This sandbox's `npm install` still returns a 403 from the registry regardless of package versions (confirmed by hitting the error on two unrelated packages across two attempts) — could not verify the fix with a live install here.

**How they were solved:**
- Verified the correct versions against upstream npm/GitHub data instead of guessing from memory, and reported the sandbox verification limitation plainly rather than claiming a local install succeeded when it didn't.

**Lessons learned:**
- Real user-environment verification (their local `npm install`) caught something this sandbox's checks couldn't — a good reminder that "I hand-reviewed it carefully" is not a substitute for an actual dependency resolver run, and the user's own environment remains the authoritative check for anything this sandbox can't execute.

**Remaining work:**
- User to re-run `npm install && npm test` locally against the corrected `package.json`.
- Awaiting Phase 0 approval before Phase A begins.

---

## Entry 6 — 2026-07-26 — Phase A, Step 1: CubeState

**What was built:**
`lib/cube/types.ts` and `lib/cube/state.ts`: a facelet-based `CubeState` model (`createSolvedCube`, `cloneCubeState`, `areCubeStatesEqual`, `isSolvedState`), plus 6 unit tests. Design decision logged as D-026: facelets are the primary, stored representation; corner/edge piece data becomes a derived view in the Validator step, not stored.

**Problems encountered:**
- Vitest still can't install in this sandbox (same registry 403 as before, unrelated to the dependency fix).

**How they were solved:**
- Ran the actual test assertions for real anyway, via a throwaway harness using Node 22's built-in test runner and native TypeScript support (`node --experimental-strip-types --test`), which needs no npm install. All 6 passed. The harness was deleted afterward — it's not part of the shipped code, and the shipped tests remain in vitest syntax per project convention (D-017).

**Lessons learned:**
- Node's built-in test runner is a genuinely useful fallback for real verification when the package registry is unavailable, without compromising the project's actual chosen test tooling.

**Remaining work:**
- User to run `npm test` locally to confirm the vitest suite passes the same way.
- Awaiting approval before Phase A, step 2 (Move Engine).

---

## Entry 7 — 2026-07-26 — Phase A, Step 2: Move Engine

**What was built:**
`lib/cube/moves.ts` (`Move` type, `applyMove`, `applyMoves`, `inverseMove`) and `lib/cube/tables.ts` (the 6 base facelet permutations), plus 12 new tests in `moves.test.ts`. The permutations were derived geometrically in a standalone script (`scripts/derive-move-tables.mjs`) rather than hand-transcribed. Logged as D-027.

**Problems encountered:**
- The derivation script's first run produced a self-consistent but *mirror-image* cube — every structural/order/locality check passed, but the specific "chirality anchor" check (verifying a move turns the physically correct direction, not its reflection) failed. Correcting it took two attempts: the first "fix" flipped the rotation's sign based on a wrong assumption about which sticker should end up where; re-deriving the actual fact by hand (careful clock-position and content-flow reasoning) showed the *original* sign was right and the check's own expectation had been wrong, not the code.

**How they were solved:**
- Fixed the check's assertion (not the rotation sign) once the correct fact was re-derived carefully, added a second complementary check on the same fact for extra confidence, then re-ran the full script until every assertion passed. Vitest still can't install in this sandbox, so the actual TypeScript test files were verified for real via a throwaway shim (vitest's `describe`/`it`/`expect` API backed by `node:test`/`node:assert`), run unmodified in logic, then deleted.

**Lessons learned:**
- A "some checks pass" result doesn't mean "no bug" — group-theoretic properties (order, locality) are insensitive to a global mirror-image error by construction, so a dedicated chirality anchor was necessary and did catch a real issue.
- When a verification check fails, the check's own expectation is itself a hypothesis that can be wrong — fixing the code to satisfy a flawed check would have shipped a real bug while looking "verified." Re-deriving the expected fact independently, rather than trusting the first assumption, was the right call. **This lesson recurred, at larger scale, in Entry 14 (D-039) — worth noting how directly it applied a second time.**

**Remaining work:**
- User to run `npm test` locally to confirm all 18 cube tests pass.
- Awaiting approval before Phase A, step 3 (Notation Parser).

---

## Entry 8 — 2026-07-28 — Phase A, Step 3: Notation Parser

**What was built:**
`lib/cube/notation.ts` (`parseMove`, `parseAlgorithm`, `formatMove`, `formatAlgorithm`) and 22 tests in `notation.test.ts`. Logged as D-028: only the 6 outer-layer turns are supported; wide moves, slice moves, and rotations are explicitly rejected with specific error messages rather than mis-parsed.

**Problems encountered:**
- The error-message classifier (`explainInvalidToken`) had two real bugs, both caught by the tests written for this subsystem: (1) it matched the whole token against single-character patterns, so `"M2"` (a slice move *with* a modifier) fell through to the generic message instead of the slice-move-specific one; (2) it checked generic lowercase ("wide move") before checking `x`/`y`/`z` ("rotation"), so `"y"` was misclassified as a wide move.

**How they were solved:**
- Rewrote the classifier to strip a trailing modifier first (so `"M2"` and `"M"` classify the same way) and reordered the checks so rotations are tested before the generic lowercase case. Re-ran the full cube test suite (40 tests: 18 prior + 22 new) via the same throwaway Node test-runner shim — all passed after the fix.

**Lessons learned:**
- Writing tests for *which specific error message* a validator/parser produces — not just success/failure — caught real bugs that a simpler "does it reject invalid input" test would have missed entirely, since both bad tokens were correctly rejected, just with the wrong explanation.

**Remaining work:**
- User to run `npm test` locally to confirm all 45 project tests pass (23 from Phase 0 + Phase A steps 1–2, plus 22 new).
- Awaiting approval before Phase A, step 4 (Validator) — the final Phase A subsystem.

---

## Entry 9 — 2026-07-28 — Phase A, Step 4: Validator (Phase A complete)

**What was built:**
Explained all 7 legality invariants of a cube state (color count, centers, corner/edge integrity, permutation parity, corner/edge orientation sums) before writing any code, including which generalize to N×N and which don't. Extended the move-derivation script to also derive `CORNER_FACELETS`/`EDGE_FACELETS` (which flat facelet indices form each of the 8 corners/12 edges), verified the same structural way as the move tables. Built `lib/cube/pieces.ts` (piece identity, orientation, permutation parity — all derived from existing data, no new hand-authored tables) and `lib/cube/validator.ts` (composes 7 named checks). Relocated `flatten`/`unflatten` from `moves.ts` to `state.ts` so `pieces.ts` could share them without duplicating logic. Added 21 tests (9 in `pieces.test.ts`, 12 in `validator.test.ts`). Logged as D-029. This closes out Phase A.

**Problems encountered:**
- A test-construction helper meant to isolate a corner-integrity failure (swap one sticker between two corners, without disturbing color counts) was a silent no-op: the two facelet positions chosen happened to be on the same axis, and — as later understood — every corner's facelet at a given tuple position is *always* the same axis across all 8 corners, by construction. Swapping two same-axis values that were already equal changed nothing.

**How they were solved:**
- Rather than find a cleverer isolated construction, switched to a direct one (force a literal duplicate color onto one corner) and adjusted the test's expectations to the more realistic outcome — both color-count and corner-integrity fail together, which is also what a real mis-painted corner would do. Re-ran the full suite; all 61 cube tests passed (up from 60 after adding one more edge-integrity test during the fix).

**Lessons learned:**
- The parity and orientation tests — the mathematically deepest checks — passed on the first run; the bug was in a test-data-construction helper for the simplest check (integrity). Rigor needs to apply evenly across a test suite, not just to the parts that feel hardest.
- Deriving piece identity/orientation entirely from data already on hand (the geometric groupings plus the existing solved-cube constant) meant no new "which corner is which" table needed hand-authoring at all — a good outcome of designing pieces.ts around D-026/D-027 rather than starting fresh.

**Remaining work:**
- User to run `npm test` locally to confirm all 66 project tests pass (23 from Phase 0 + Phase A steps 1–3, plus 9 + 12 new).
- **Phase A is complete pending this approval.** Once approved, next is Phase B (2D cube net input, color-painting workflow, Cube Health Check screen) per the Roadmap.

---

## Entry 10 — 2026-07-29 — Phase B, Subsystem 1: 2D Cube Net Input & Health Check

**What was built:**
Phase A confirmed complete and locally verified (66 tests passing via real `npm test`, `npm install` succeeding — the sandbox limitations of Entries 4–9 were specific to this sandbox, not the actual project). Reviewed the Phase B roadmap against the implemented Phase A architecture and found it still valid. Built `lib/cube/net.ts` (derived 2D unfolded-cross net layout, D-030), a new Zustand store for the painting session (D-031), and `components/cube/{CubeNet, ColorPalette, HealthCheckPanel}.tsx` — the Health Check panel renders `validateCube`'s output directly with no logic of its own (D-032). Wired into the previously-placeholder `/solver/health` route. 12 new tests.

**Problems encountered:**
- `vitest.config.ts` had no `@/` path alias configured — invisible until this subsystem, since every Phase A test used relative imports exclusively. The new store test was the first to actually need it.
- `noUncheckedIndexedAccess` (a real `tsconfig.json` strictness setting) flagged an array index in the new `CubeNet` component that's always in range by construction but not provable to the compiler.

**How they were solved:**
- Added the missing alias to `vitest.config.ts`, matching `tsconfig.json`'s existing `paths` mapping.
- Added a documented non-null assertion with a one-line comment explaining why the index is always safe — the first instance of a pattern that recurred several times later in Phase B.

**Lessons learned:**
- A configuration gap can sit invisible for an entire phase if nothing happens to exercise it — worth treating "first time this pattern is used" as a specific moment to double-check supporting config, not just the code itself.

**Remaining work:**
- Pause for approval before Subsystem 2 (Undo/Redo/Reset), per the established per-subsystem approval workflow.

---

## Entry 11 — 2026-07-29 — Phase B, Subsystem 2: Undo / Redo / Reset

**What was built:**
Proposed and got approval for a design keeping undo/redo generic and cube-agnostic. Built `lib/history/historyStack.ts` — a pure `{past, present, future}` stack with `push`/`undo`/`redo`/`reset`, no cube knowledge at all (D-033). Renamed the Subsystem 1 store `useNetInputStore` → `useCubeEditorStore` to reflect its growing scope, and wrapped the generic history stack around it. Persistence scoped to the current cube only, not the undo/redo stacks (D-034) — flagged explicitly as a scope decision for approval rather than assumed. 18 new tests, including a dedicated test for the "paint after undo permanently discards the old redo branch" invariant, at both the generic-stack level and the store level.

**Problems encountered:**
- None significant — this subsystem's design was approved with refinements before implementation began (the exact rename, the generic-stack approach, and the persistence scope were all explicitly confirmed first), so implementation itself was smooth.

**How they were solved:** n/a

**Lessons learned:**
- Getting explicit sign-off on a few specific, named design calls (generic vs. cube-specific history; what persists) before writing code avoided any rework this time, compared to some earlier steps where a design assumption had to be corrected after the fact.

**Remaining work:**
- Pause for approval before Subsystem 3 (Problem-Sticker Highlighting).

---

## Entry 12 — 2026-07-30 — Phase B, Subsystem 3: Problem-Sticker Highlighting

**What was built:**
Per explicit direction, kept the Validator strictly UI-agnostic while extending the Cube Health Check to visually flag the specific stickers behind a failing check. `ValidationCheck` gained an optional `affected: AffectedEntities` field — corner/edge slot indices or center face labels only, never facelet coordinates or colors (D-035). New `lib/cube/highlight.ts` (`resolveAffectedFacelets`) is the sole bridge from those logical entities to facelet coordinates, still fully framework-agnostic. `colorCount`/`permutationParity` correctly never set `affected` (not uniquely localizable); orientation checks attach only pieces with a directly, individually nonzero orientation value — a real computed fact, never a guess about which piece "caused" a sum-based failure, per explicit clarification during design review. 22 new tests.

**Problems encountered:**
- None at the implementation level — the design (three-tier separation: Validator → `highlight.ts` → React) was proposed, refined once (the orientation-check clarification above), and approved before any code was written.

**How they were solved:** n/a

**Lessons learned:**
- Deciding up front exactly which failing checks *can* be honestly localized (centers, corner/edge integrity) versus which cannot (parity — mathematically ambiguous; a full orientation-sum failure — only individually-nonzero pieces are honest to flag) prevented a tempting but wrong shortcut: highlighting "the most likely" piece for parity failures, which would have looked helpful but been a guess dressed up as a fact.

**Remaining work:**
- Pause for approval before Subsystem 4 (Import/Export).

---

## Entry 13 — 2026-07-30 — Phase B, Subsystem 4: Import / Export Cube State

**What was built:**
Presented a full design (supported formats, library-vs-application-layer API split, serialization architecture, validation flow, UI proposal, testing strategy) before writing code, per explicit request, with the future Sandbox mode and 3D Solver interface explicitly named as modules that must be able to reuse the same import/export APIs without going through the Solver-page-specific store. Approved with refinements: keep `lib/cube/serialization.ts` completely independent of the store/React/persistence (D-038); add a `validateFaceletString` helper so callers never duplicate parsing logic; illegal-but-well-formed imports succeed, with legality reported afterward as informational feedback (D-037); algorithm export stays visible with an explanation when unavailable, rather than hidden. Built `lib/cube/serialization.ts` (`cubeToFaceletString`, `faceletStringFromInput`, `validateFaceletString`, `cubeFromAlgorithm` — the last built directly on the existing Notation Parser and Move Engine, no new parsing logic), extended `useCubeEditorStore` with `importFaceletString`/`importAlgorithm`/`exportFaceletString`/`lastImportedAlgorithm`, and built `ImportPanel`/`ExportPanel` components. 27 new tests.

**Problems encountered:**
- None at the design level — the refinements above were all resolved during design review, before implementation. Implementation itself surfaced one more `noUncheckedIndexedAccess` instance in `validator.ts` (touched while wiring highlighting into the import flow), fixed with the same documented-assertion pattern as Entry 10.

**How they were solved:**
- Same non-null-assertion-with-comment pattern as before; no new pattern needed.

**Lessons learned:**
- Naming the *specific* future consumers (Sandbox, a 3D interface) during design, not just "keep it generic" in the abstract, made the store-vs-library boundary much easier to get right the first time — a generic instruction is easy to satisfy loosely; a named future caller makes the API's actual requirements concrete.

**Remaining work:**
- All five originally-scoped Phase B subsystems are now implemented. Pause for the user's manual acceptance testing before the phase is considered complete.

---

## Entry 14 — 2026-07-31 — Manual Testing Findings, the D-039 Bug, and Stabilization Pass

**What was built:**
User performed manual testing of the deployed Phase B build and reported one functional bug plus six UX issues (Solver navigation, cube-entry orientation confusion, a dark-mode flash on refresh, poor white-sticker visibility in light mode, Import/Export discoverability, and a general first-time-user pass), explicitly requesting the bug be investigated and explained *before* any fix.

**Problems encountered — the functional bug:**
- Reported repro: reset to solved, import `R U R' U'` "From Solved," Health Check falsely reports "a corner appears twisted in place." Testing that exact algorithm directly against the library (no UI involved) initially appeared to *pass* — a misleading first signal. Per explicit instruction not to patch blindly, a fuzz test across hundreds of random legal scrambles was written instead of trusting the single example, and found the real failure rate: roughly 49% of all legally-reached cubes were being falsely flagged, with a much shorter 2-move minimal repro (`U'`, `R`) found in the process.
- Root cause, once isolated: `CORNER_FACELETS` (the geometric table telling the Validator which 3 facelets belong to each corner slot) ordered those 3 facelets by raw ascending array index — an accident of how faces happen to be numbered, with no relationship to the corner's actual 3D geometry. This is chirality-inconsistent: for any 3 mutually perpendicular axes, whether a fixed listing order is "right-handed" or "left-handed" alternates by corner (a geometric fact, not a labeling choice), so a naive fixed order is wrong for exactly half the corners.
- A first attempted fix — a single fixed axis-priority order (always list X-axis, then Y-axis, then Z-axis) — was tried and re-verified by the same fuzzer, which found it *still* failed at almost the same rate. This confirmed the problem needed an actual geometric correction, not just a different fixed convention.

**How they were solved:**
- Derived the correct fix: order each corner's facelets by axis priority, then apply a sign correction based on the scalar triple product of the 3 axis directions, guaranteeing every corner ends up with consistent handedness. Updated `scripts/derive-move-tables.mjs` and regenerated `CORNER_FACELETS` in `lib/cube/tables.ts`. Verified with an escalating series of fuzz runs (hundreds → 3,600 → 20,000 random legal scrambles), reaching 0 failures, before writing a new **permanent, deterministic** regression test (`lib/cube/validator.legality.test.ts`) — exhaustive over all 18 single moves and all 324 move-pairs, plus the original repro and a longer algorithm — so this exact class of bug can never silently regress again. Logged as D-039.
- Addressed the six UX findings: Nav/homepage/Command Palette all point directly at `/solver/health`, with `/solver` itself redirecting there (D-041); added U/D/L/R/F/B face labels and a derived "hold your cube like this" hint to the net (D-042); moved theme application to a `beforeInteractive` script to eliminate the first-paint flash (D-040); firmed up white-sticker borders in light mode across three components (D-042); added explanatory copy and icons to Import/Export, plus a line clarifying import is an alternative to painting, not an extra required step; general pass found and fixed a few small spacing/wording items.
- One self-introduced regression was caught and fixed *before* it shipped: while adding face labels, an intermediate version of `CubeNet` hardcoded a block-pixel-size assuming a 3×3 cube; caught on review and made to derive from `cube.size` instead, consistent with D-003.

**Lessons learned:**
- The single-example repro was actively misleading — it happened to pass even though the underlying bug affected roughly half of all legal cubes. This is the same lesson as Entry 7 (a check/test passing doesn't mean the code is right; the check itself can be insufficient), recurring at real product scale rather than inside a derivation script's own self-test. Fuzzing across many cases, not just the one reported, was what actually found the true shape of the bug.
- A plausible-looking fix (fixed axis order) can still be wrong — testing the fix with the same rigor as the original bug-finding (re-running the fuzzer, not just eyeballing the new logic) caught this before it shipped as a second, quieter bug.
- The Move Engine (D-027) was never at fault — worth stating plainly, since a Validator-only geometry bug produces symptoms ("moves seem to break the cube") that could easily be misattributed to the wrong subsystem without deliberate investigation first.

**Remaining work:**
- User performed a second round of manual acceptance testing and confirmed all reported issues resolved. **Phase B is complete and manually accepted.**
- Do not start Phase C yet — a project-hardening/documentation/handoff pass was requested first (Entry 15).

---

## Entry 15 — 2026-08-02 — Phase B Handoff: Documentation, Tech-Debt Review, Git Readiness

**What was built:**
A dedicated hardening pass ahead of Phase C, at the user's request, with three parts. First, a review of the `noUncheckedIndexedAccess` TypeScript debt accumulated (and partially, deliberately deferred) since Phase A: 36 errors across `moves.ts`, `notation.ts`, `pieces.ts` (production) and `validator.test.ts` (tests), all one root cause (array indexing that's always safe by construction but not provable to the strict compiler, the same class already fixed piecemeal at several points in Phase B), no known runtime impact — recommended a short, dedicated, low-risk cleanup pass before Phase C specifically, since Phase C's solving engine will build heavily on `pieces.ts`, rather than fixing it now as an unrelated side effect of this handoff pass. Second, a Git/version-control readiness review ahead of the user creating the actual GitHub repository: found and fixed a real issue (`tsconfig.tsbuildinfo`, a 124KB generated file, existed untracked with no `.gitignore` rule to stop it being committed), rewrote `.gitignore` to match standard Next.js conventions, added a missing `typecheck` npm script, changed `test` to run non-interactively by default, and rewrote the README (which had been stale since Phase 0, still describing the project as having no cube engine despite Phase A and B both being complete). Third — this document and its four siblings — brought fully current for the first time since Phase A's close.

**Problems encountered:**
- The five living knowledge-base documents (this journal, the Decision Log, Roadmap, Known Issues, Testing Log) had not been updated at all since Entry 9/D-029 (Phase A's close) — the entire five-subsystem Phase B effort, including the D-039 bug, existed only in conversation history and inline code comments, not in the documents these are supposed to be. This was caught only because the user explicitly re-uploaded the five files partway through this handoff pass with a direct instruction to fill them in from Phase B onward.
- Two of the seven standing knowledge-base documents (Architecture Notes, Refactoring Log) were not re-uploaded alongside the other five, so this pass could not merge new content against their actual prior state the way it could for the other five — flagged explicitly rather than silently guessed at or skipped.

**How they were solved:**
- Backfilled this journal (Entries 10–14), the Decision Log (D-030–D-042), the Roadmap, the Testing Log, and Known Issues in full, in each document's own established format and level of detail, rather than writing a new, differently-structured summary alongside the old one.
- Flagged the Architecture Notes / Refactoring Log gap directly to the user rather than fabricating "continuations" of documents whose current authoritative state isn't actually known.

**Lessons learned:**
- Documentation discipline (D-008's own stated reasoning) has to be actively re-checked at natural phase boundaries, not assumed to happen automatically alongside code — a five-subsystem phase can complete, be manually tested, and be accepted entirely before anyone notices the knowledge base itself never moved. Treating "update the docs" as a standing per-subsystem step (as Phase A did, and as Phase B's own workflow nominally required) is only as reliable as whether it's actually re-verified, not merely intended.

**Remaining work:**
- User to confirm the Architecture Notes / Refactoring Log situation (provide the actual current files, or confirm they should be authored fresh) so all seven documents are on the same footing.
- Not starting Phase C. Awaiting the user's go-ahead.

---

## Entry 16 — 2026-08-03 — Phase C Kickoff Review + `noUncheckedIndexedAccess` Cleanup

**What was built:**
Reviewed the full repository and all seven living documents against a fresh checkout (this session's sandbox allowed a real `npm install`, unlike the 403 noted in earlier entries), independently re-verifying rather than trusting the documented numbers: confirmed 145/145 tests, clean lint, and the documented 36 typecheck errors — with one correction (see below). Reviewed and got approval for the Phase C architecture: a stage-based `SolveStage`/`SolveResult` contract (not a flat algorithm string) so Phase D's animation UI can consume structured output, a 7-subsystem Beginner Method breakdown (Cross → First-Layer Corners → Middle-Layer Edges → Last-Layer Cross → Last-Layer Face → Last-Layer Corner Position → Last-Layer Edge Position), White-first/Yellow-last as the solving convention with orientation handled as a layer on top of — not a reinterpretation of — the existing canonical `CubeState` coordinate system, and an explicit instruction to keep Phase C's stage model and instructional framing genuinely Beginner Method rather than simplified CFOP (Phase E's territory). Then performed the pre-Phase C technical-debt cleanup: resolved all 36 `noUncheckedIndexedAccess` errors behavior-preservingly across `moves.ts`, `notation.ts`, `pieces.ts`, and `validator.test.ts` — full per-file breakdown in the Refactoring Log.

**Problems encountered:**
- Known-Issues.md's documented 8 (`pieces.ts`) / 26 (`validator.test.ts`) split didn't match what `tsc` actually reported this session: 9 / 25 (same total, 36). Flagged and corrected rather than silently reconciled, per standing project discipline (never quietly overwrite a prior record).
- Two of the nine `pieces.ts` fixes (the `cornerOrientation`/`edgeOrientation` guards) are a genuine, if currently unreachable, behavior change: an out-of-range `identity` argument previously threw a raw TypeError, now returns `null` — arguably a correctness improvement given both functions' own `number | null` signature already models "couldn't be determined," but called out explicitly since "zero behavior change" doesn't quite apply to that one guard.

**How they were solved:**
- Re-ran `npm install`/`npm test`/`npm run typecheck`/`npm run lint` directly rather than assuming the prior session's counts still held.
- Preferred genuine narrowing over blind assertions wherever it was actually possible (`rotateTriple`'s static-index restructure, `parseMove`'s `!letter` guard, a small bounds-checked `at()` helper centralizing the one real invariant behind ~25 call sites in `validator.test.ts`), reserving non-null assertions for the two sites (`moves.ts`, `pieces.ts`'s `permutationParity`) where the invariant is genuinely guaranteed elsewhere in the codebase (D-027's self-checked derivation; identity arrays sourced only from `identifyCorner`/`identifyEdge`) but not provable to tsc without a larger restructure.

**Lessons learned:**
- Re-verifying documented numbers against a live run — rather than trusting them — caught a real, if minor, discrepancy the same session it mattered (right before this exact count was about to be used as this cleanup's own success criterion). Consistent with the project's recurring lesson (Entries 7 and 14): a recorded check passing isn't the same as the check being re-run.

**Remaining work:**
- Phase C, Subsystem 0 (solver contract & shared Case-Solving Stage Runner) — next, pending this cleanup's summary being reviewed.

---

## Entry 17 — 2026-08-03 — Phase C, Subsystem 0: Solver Contract & Shared Infrastructure

**What was built:**
The shared solver contract and Case-Solving Stage Runner infrastructure Phase C's Beginner Method (Subsystem 1 onward) and, later, Phase E's CFOP will both build on (D-011). New `lib/solver/` module: `types.ts` defines `SolveStage` (`{id, label, moves, explanation?}`), the `SolveSuccess`/`SolveFailure`/`SolveResult` union (mirroring the existing `ParseResult`/`FaceletParseResult` never-throw pattern), `StageSpec` (one stage's solving logic, decoupled from sequencing), and `SolverMethod` (the pluggable per-method interface D-011 anticipated). `stageRunner.ts` implements `rejectIfInvalid` (Validator-backed input gate, also catching non-3×3 input as a distinct `'unsupported-size'` reason), `runStages` (the actual Case-Solving Stage Runner — sequences a `StageSpec[]` against a starting cube), `solveWithStages` (validate → clone → run, the one sequence every concrete solver needs), and two derivation helpers, `aggregateMoves` and `deriveStageSnapshots`, that compute a full move list / per-stage cube snapshots from stage moves on demand rather than storing either. Recorded as D-043. 18 new tests in `stageRunner.test.ts`, all passing alongside the existing 145 (163 total).

**Problems encountered:**
- None at the design level — the design questions in the task prompt (store vs. derive snapshots, store vs. derive algorithm strings, how to represent a solved/no-op input, how to keep a stage's moves from disagreeing with anything else) each had a fairly clear answer once framed against this project's own standing "derive, don't duplicate" precedent (D-026, D-030, D-032); the actual work was applying that precedent consistently rather than resolving genuine ambiguity.
- One judgment call worth flagging: whether `rejectIfInvalid` should also catch non-3×3 cubes, which isn't something the task prompt asked for explicitly. Decided yes, since it's a real, already-documented gap (the Validator's own piece-level checks are already skipped, not failed, for non-3×3 per D-029) rather than speculative future-proofing — a 2×2 cube would sail past `validateCube` as "valid" while still being nothing this solver's piece-level logic can act on.

**How they were solved:**
- Designed the contract in the format the prompt requested (Task 1's 10 explicit questions), then implemented only what that design called for — no case tables, no stage-specific solving logic, nothing beyond orchestration and the input gate.
- Wrote tests around the specific failure modes the prompt flagged as risks (non-mutation, correct sequencing, aggregate order, no-op stages, snapshot/aggregate agreement, invalid input never reaching stage logic) rather than only exercising the happy path.

**Lessons learned:**
- The "which fields belong in the contract" design question resolved cleanly once reframed as "does this project already have a precedent for this exact trade-off" — D-026/D-030/D-032 all independently arrived at "derive over duplicate" for different data (piece view, net layout, legality), which made D-043's answer for solve-stage data a continuation of an existing pattern rather than a new judgment call from scratch.

**Remaining work:**
- Phase C, Subsystem 1 (White Cross) — not started. This entry's infrastructure is deliberately solving-logic-free; the first real Beginner Method stage is the next piece of work, pending review of this subsystem.
