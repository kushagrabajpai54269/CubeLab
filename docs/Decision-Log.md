# CubeLab — Decision Log

Every significant technical, architectural, UI/UX, performance, security, or product decision is recorded here permanently. Superseded decisions are never deleted — a new entry is added referencing the old one.

---

### Decision ID: D-001
**Date:** 2026-07-23
**Category:** Product
**Decision:** No login is ever required to solve, learn, or practice. Auth is purely additive (for syncing progress across devices).
**Reasoning:** Spec explicitly requires this; also removes the single biggest UX friction point for a tool meant to teach.
**Alternatives Considered:** Optional soft-login prompt after N solves.
**Trade-offs:** Progress tracking is device-local until a user opts into an account; no cross-device sync without auth.
**Impact:** Storage layer must work fully standalone; auth layer is strictly opt-in and additive.
**Future Revisit Required:** No

---

### Decision ID: D-002
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** The storage layer is abstracted behind an async `StorageAdapter` interface from day one, even though the only implementation initially is LocalStorage.
**Reasoning:** Supabase (or any remote store) is inherently async; designing the interface sync-first would force a breaking change later. Async-first costs nothing now and removes a future migration risk entirely.
**Alternatives Considered:** Sync interface now, wrap in async later.
**Trade-offs:** Slightly more boilerplate (Promises) for what is currently a synchronous operation.
**Impact:** All business logic (progress tracking, saved cube state, achievements) depends only on the interface, never on `window.localStorage` directly.
**Future Revisit Required:** No

---

### Decision ID: D-003
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** The cube state model is designed to be puzzle-agnostic (not hardcoded to 3×3) even though only 3×3 ships in v1.
**Reasoning:** 2×2, 4×4, 5×5, Pyraminx, and Megaminx are explicit roadmap items. Retrofitting puzzle-genericity onto a 3×3-only model later would mean touching nearly every module (renderer, validator, solver, algorithms DB).
**Alternatives Considered:** Build 3×3-only now, generalize later.
**Trade-offs:** Slightly more upfront abstraction complexity in the state model and validator.
**Impact:** `CubeState`, `Validator`, and `SolverMethod` interfaces are all parameterized by puzzle type from the start.
**Future Revisit Required:** No

---

### Decision ID: D-004
**Date:** 2026-07-23
**Category:** UX
**Decision:** Cube Health Check and Progress/Achievements live on dedicated secondary screens, not as panels within the main Solver screen.
**Reasoning:** Spec's own core principle is "every page should answer exactly one primary question." Bolting validation UI and stats onto the solve screen would violate that and clutter the primary flow.
**Alternatives Considered:** Collapsible side panel on the solve screen; modal overlay.
**Trade-offs:** One extra navigation step to view health/progress details; mitigated with a subtle inline status indicator (e.g., a small validity dot) on the solve screen that links out.
**Impact:** Adds two routes: `/solver/health` (or similar) and `/progress`.
**Future Revisit Required:** No

---

### Decision ID: D-005
**Date:** 2026-07-23
**Category:** Product
**Decision:** Achievements are milestone-based and informational (e.g., "First sub-60s solve"), with no streak-loss guilt messaging, urgency countdowns, or push-notification pressure.
**Reasoning:** Spec explicitly states "reward consistency, not addiction." Loss-aversion mechanics (streak breaks, daily reset warnings) are the primary pattern used to manufacture compulsive engagement and directly conflict with "calm, premium, educational."
**Alternatives Considered:** Duolingo-style streak-freeze/loss mechanics.
**Trade-offs:** Potentially lower daily-active-use metrics than an addictive design would produce — considered an acceptable, intentional trade-off given the product's educational mission.
**Impact:** Achievement/streak UI copy and notification design must avoid urgency/loss framing throughout.
**Future Revisit Required:** No

---

### Decision ID: D-006
**Date:** 2026-07-23
**Category:** Security / Backend
**Decision:** Real OAuth credentials (Google, Microsoft, Email, Twitter/X) will not be configured inside the Claude Project workspace. Auth UI and flow are built now against mock/stub providers; real credentials are wired up later, in Claude Code, once a proper repo with secret management exists.
**Reasoning:** Secrets should never live in a chat/Project knowledge base. Building the full auth *flow* now with mocked providers lets development proceed without blocking on credential registration.
**Alternatives Considered:** Defer all auth work until migration to Claude Code.
**Trade-offs:** Auth "works" in the Project workspace only in mock form; final integration testing happens post-migration.
**Impact:** `AuthProvider` interface designed now; concrete OAuth implementations added later without touching consuming code.
**Future Revisit Required:** Yes — revisit once migrated to Claude Code with real credentials.

---

### Decision ID: D-007
**Date:** 2026-07-23
**Category:** Frontend
**Decision:** 3D cube rendering uses Three.js via `@react-three/fiber` rather than a hand-rolled WebGL implementation.
**Reasoning:** Hand-rolled WebGL for a cube with animated twists, lighting, and interaction is a multi-week undertaking with high maintenance cost. R3F gives declarative, React-idiomatic 3D with a mature ecosystem, at negligible bundle cost for this use case.
**Alternatives Considered:** Raw WebGL/Three.js imperative API; CSS 3D transforms (rejected — insufficient for realistic lighting/interaction at scale).
**Trade-offs:** Adds a sizeable dependency; must be code-split/lazy-loaded to protect the load-time budget.
**Impact:** 3D cube component is dynamically imported, never in the critical initial bundle.
**Future Revisit Required:** No

---

### Decision ID: D-008
**Date:** 2026-07-23
**Category:** Product / Workspace Process
**Decision:** Development proceeds inside a Claude Project (chat + Project knowledge as the documentation store) for as long as practical. Migration to Claude Code + a real Git repository happens once the project's complexity (file count, need for real builds/tests, real secrets) exceeds what a Project workspace can reasonably support.
**Reasoning:** User's explicit choice. Keeps early-stage planning and documentation lightweight and easy to review conversationally.
**Alternatives Considered:** Start directly in Claude Code.
**Trade-offs:** Code created in chat sessions is not version-controlled and may need to be reassembled into a real repo at migration time; all 7 knowledge-base docs must be carried over intact.
**Impact:** Documentation discipline (this Decision Log, Architecture Notes, etc.) is what preserves continuity across the eventual migration — must be kept rigorously up to date.
**Future Revisit Required:** Yes — revisit trigger conditions should be checked as the project grows (see Roadmap).

---

### Decision ID: D-009
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** Zustand is the primary state management solution. React Context is used only for simple, rarely-changing values; Redux is avoided unless a concrete need emerges.
**Reasoning:** The full SRS explicitly ranks Context → Zustand (recommended) → Redux only if necessary. Zustand offers minimal boilerplate and avoids the re-render pitfalls of Context for frequently-updating state like live cube input.
**Alternatives Considered:** Context + useReducer only; Redux Toolkit.
**Trade-offs:** One additional (small) dependency; minor learning curve for a contributor unfamiliar with Zustand, offset by its small API surface and strong docs.
**Impact:** Cube state, theme, and other cross-cutting UI state live in Zustand stores; purely local component state (e.g. a dropdown's open/closed flag) stays as `useState`.
**Future Revisit Required:** No

---

### Decision ID: D-010
**Date:** 2026-07-23
**Category:** UI
**Decision:** Design tokens are locked: typography is Geist; icons are Lucide; spacing follows an 8px base grid; Electric Blue is the sole primary accent against otherwise neutral backgrounds; official cube colors are reserved for cube-interaction surfaces only; dark mode uses deep blue-gray/violet-gray tones, never pure black.
**Reasoning:** Directly specified in the full SRS. Locking these now, before Phase 3 UI design begins, prevents ad hoc or inconsistent choices creeping in screen by screen.
**Alternatives Considered:** None — directly specified by the SRS.
**Trade-offs:** None significant.
**Impact:** Encoded directly in the Tailwind theme config (custom palette, spacing scale, font family) so they're enforced structurally, not just by convention. Resolves the "no brand/design assets" open item from the v1 analysis.
**Future Revisit Required:** No

---

### Decision ID: D-011
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** Solving methods (Beginner, CFOP, and later Roux/ZZ) are implemented as fully independent, pluggable solver modules behind a shared `SolverMethod` interface — not one generic solver whose output is relabeled per method.
**Reasoning:** The SRS explicitly requires Beginner Method output to be genuine layer-by-layer beginner algorithms and CFOP output to be genuine cross/F2L/OLL/PLL, not different presentations of one shortest-path solution. These are algorithmically distinct solving strategies.
**Alternatives Considered:** One general solver (e.g. a Kociemba-style two-phase solver) with output relabeled per method — rejected, would violate "educational solving over shortest mathematical solution" and wouldn't produce authentic method-specific steps.
**Trade-offs:** Meaningfully more solver-engineering work — each method is close to its own project, with CFOP (full OLL/PLL sets + F2L pair recognition) the largest.
**Impact:** `BeginnerMethodSolver` and `CfopSolver` are separate concrete implementations of `SolverMethod`. This is the single largest engineering effort in the project and is sequenced accordingly (Beginner Method first, proving the domain logic; CFOP second).
**Future Revisit Required:** No

---

### Decision ID: D-012
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** Practice/Trainer mode (drilling OLL, PLL, F2L, or Cross cases in isolation) is architected as a module separate from the Solver, sharing only the core `CubeState`/validator.
**Reasoning:** Practice mode requires generating a scramble that produces a *specific* case (e.g. a particular OLL pattern) — logic the main Solver never needs, since it only solves an arbitrary user-entered cube. Conflating the two would tangle unrelated logic together.
**Alternatives Considered:** Bolting case-scramble generation onto the Solver module.
**Trade-offs:** One additional module to build and maintain.
**Impact:** A `/features/practice` module is planned; depends on the Solver's algorithm data set but not its solving logic.
**Future Revisit Required:** No

---

### Decision ID: D-013
**Date:** 2026-07-23
**Category:** Architecture / Security
**Decision:** Anonymous, aggregate product analytics (e.g. "most searched algorithms," "average session duration") is treated as architecturally separate from the user's personal progress data — the one thing in Version 1 that leaves the device even though personal progress stays local.
**Reasoning:** The SRS's privacy philosophy ("most data stays on your device") is a per-user promise, but several requested analytics metrics are inherently cross-user aggregates that no LocalStorage-only design can produce. This tension needed surfacing rather than quietly resolving in either direction.
**Alternatives Considered:** (a) Skip aggregate analytics entirely in V1 to stay 100% local; (b) use a privacy-respecting, cookie-less analytics approach, fully decoupled from the `StorageAdapter`/progress system.
**Trade-offs:** Option (b) — the one adopted — means the Privacy page must clearly distinguish "your solving progress: local only" from "anonymous product usage analytics: aggregated, no personal data."
**Impact:** Analytics service lives entirely outside the personal storage path; Privacy page copy is written to reflect this distinction plainly.
**Future Revisit Required:** Yes — specific analytics provider choice to be finalized in Phase 4 (Technical Planning).

---

### Decision ID: D-014
**Date:** 2026-07-23
**Category:** Product
**Decision:** The FAQ page ships in Version 1 with manually authored FAQs only. "Automatically generated FAQs based on common user behavior" is deferred and reinterpreted as a future data-informed curation step, not literal real-time generation.
**Reasoning:** Real-time generation would need either a live model call per page view (cost, latency, unpredictable output — a poor fit for an SEO-critical static page) or real usage data that doesn't exist before launch. Neither is compatible with "fast-loading, statically-optimized, excellent Lighthouse score."
**Alternatives Considered:** Build-time or request-time LLM-generated FAQ content.
**Trade-offs:** The literal "auto-generated" aspect of the original requirement isn't delivered at launch.
**Impact:** Once real usage analytics exist (D-013), FAQ entries are periodically reviewed and updated by a human based on real search/support patterns — data-informed, not automated.
**Future Revisit Required:** Yes — revisit once real post-launch usage data exists.

---

### Decision ID: D-015
**Date:** 2026-07-23
**Category:** UX
**Decision:** Solution animation plays at a single fixed speed ("Normal") in Version 1; no user-adjustable playback speed.
**Reasoning:** Directly specified in the SRS ("Animation speed: Normal only. Keep interface simple."). Logged explicitly since it's a real, trackable trade-off.
**Alternatives Considered:** An adjustable speed control, as seen in many competitor cube trainers.
**Trade-offs:** Advanced users already familiar with an algorithm may find a fixed speed slower than they'd like — partly mitigated since the notation is always visible, so watching the animation is never required.
**Impact:** `AnimationViewer` takes no speed prop in V1.
**Future Revisit Required:** Yes — reconsider if post-launch feedback shows this is a real friction point, especially for CFOP/advanced users.

---

### Decision ID: D-016
**Date:** 2026-07-23
**Category:** UX / Accessibility
**Decision:** Optional ambient background music defaults off (per SRS). Interaction sounds (clicks, cube rotation, completion) stay subtle by default but get an easily accessible mute toggle rather than being unconditionally on with no easy way off.
**Reasoning:** Unexpected audio can be jarring in quiet or shared environments and for some neurodivergent users. An easy toggle costs little and keeps the app from surprising anyone — consistent with the SRS's own Consistency principle.
**Alternatives Considered:** Interaction sounds on by default with no readily accessible toggle.
**Trade-offs:** Negligible — a toggle is a small addition to the Settings/Preferences store.
**Impact:** A `soundEnabled` preference sits alongside the existing theme preference.
**Future Revisit Required:** No

---

### Decision ID: D-017
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** The SRS's proposed folder structure is adopted as the base project structure, with two refinements: a `/content` directory for long-form Learn section copy (kept separate from `/data`, used for structured algorithm datasets), and unit tests co-located with the module they test, with a root `/tests` reserved only for integration/e2e tests spanning multiple modules.
**Reasoning:** The SRS's structure is sound and feature-based as required, but doesn't specify where long-form content or tests live. Co-located unit tests are more discoverable; a root folder is still useful for cross-cutting integration tests.
**Alternatives Considered:** All tests under a single root `/tests` directory, mirroring the source tree.
**Trade-offs:** Two conventions for two kinds of tests rather than one — worth it for the discoverability gain.
**Impact:** See the folder structure in Architecture Notes.
**Future Revisit Required:** No

---

### Decision ID: D-018
**Date:** 2026-07-23
**Category:** Product
**Decision:** Camera-based cube scanning is explicitly out of scope for all currently-planned versions, not merely unscoped.
**Reasoning:** Formalizes and ratifies the SRS's own explicit call ("Camera scanning removed for Version 1 to keep quality high") as a durable decision rather than leaving it ambiguous for future contributors.
**Alternatives Considered:** None — this confirms the SRS's own choice.
**Trade-offs:** Users must manually input colors (2D or 3D); accepted, since a half-working scanner would damage trust more than manual entry costs in convenience.
**Impact:** Roadmap moves camera scanning to Long-Term Ideas explicitly, framed as needing a genuinely high-quality solution to be worth revisiting.
**Future Revisit Required:** Yes — only if a genuinely high-quality on-device solution becomes cheap to integrate.

---

### Decision ID: D-019
**Date:** 2026-07-23
**Category:** Backend / Architecture
**Decision:** Cloudflare Pages deployment uses Cloudflare's Next.js adapter, not static export.
**Reasoning:** The SRS explicitly lists Next.js API Routes as part of the backend, needed at minimum for future auth callbacks and any server-side analytics ingestion. Static export cannot run API routes at all, which would foreclose an explicitly required capability.
**Alternatives Considered:** Static export plus a separate small service (e.g. Cloudflare Workers) for the few endpoints that need a server; pure static export with all logic client-side.
**Trade-offs:** Cloudflare's Next.js adapter occasionally trails the newest Next.js features compared to native Vercel hosting — acceptable given Cloudflare Pages is the specified target.
**Impact:** Resolves the open deployment-mode question carried over from the v1 analysis.
**Future Revisit Required:** No, barring major Next.js/Cloudflare compatibility shifts.

---

### Decision ID: D-020
**Date:** 2026-07-23
**Category:** Product / UX
**Decision:** Learn section order is finalized as: Introduction → History → Cube Anatomy → Notation → Finger Tricks → Beginner Method → CFOP → Advanced Methods → Videos → Practice (Finger Tricks precedes Beginner Method).
**Reasoning:** The two source documents disagreed — the condensed prompt placed Finger Tricks after Beginner Method, while the full SRS placed it before. Finger dexterity is a prerequisite skill that makes learning the Beginner Method's turns easier, and the full SRS is the more recent, more considered source.
**Alternatives Considered:** The original ordering (Beginner Method before Finger Tricks).
**Trade-offs:** None meaningful — a low-stakes, easily-reordered content-sequencing choice.
**Impact:** Learn section navigation order.
**Future Revisit Required:** No

---

### Decision ID: D-021
**Date:** 2026-07-23
**Category:** Product
**Decision:** Learn section pages, navigation, and content framework (structure, placeholders, content pipeline) are built now; actual educational copy is written in a dedicated later phase, not alongside the framework.
**Reasoning:** Explicit user instruction — avoids conflating "does the Learn section work" with "is the content good," and keeps content quality from being rushed to match engineering milestones.
**Alternatives Considered:** Drafting placeholder-but-real content alongside the framework now.
**Trade-offs:** Learn section shows structural placeholders for a while; acceptable since the Solver is the primary early-phase focus.
**Impact:** Every Learn content slot gets a structural placeholder now (heading, intended shape, illustration slot), not real prose. Final content must be original, technically accurate, beginner-friendly, concise, and never derived from existing tutorials — recorded now so this bar isn't lost by the time the content phase arrives.
**Future Revisit Required:** No — this reframes timing, not content requirements.

---

### Decision ID: D-022
**Date:** 2026-07-23
**Category:** Architecture / Product
**Decision:** The command palette is built as a generic, extensible command registry, not a hard-coded navigation list. V1 registers commands for page navigation, algorithm search, learning-topic search, quick solver access, and theme toggle. New command types are added by registering a new source, not by modifying palette internals.
**Reasoning:** Resolves the open "command palette scope" question. User explicitly wants this treated as an extensible system, not a fixed feature.
**Alternatives Considered:** Nav-only palette (the earlier interim recommendation) with search bolted on later as a special case.
**Trade-offs:** Slightly more upfront design (a registry/provider pattern) than a hard-coded list; pays for itself the first time a new command type is added.
**Impact:** See Architecture Notes for the full registry design.
**Future Revisit Required:** No

---

### Decision ID: D-023 (amends D-013)
**Date:** 2026-07-23
**Category:** Security / Privacy
**Decision:** Analytics collection must be fully disable-able via an explicit opt-out control in Settings.
**Reasoning:** User-requested addition to D-013's decoupled, disclosed analytics approach — consistent with CubeLab's privacy-first philosophy and gives users real control, not just disclosure.
**Alternatives Considered:** Disclosure-only, no opt-out (D-013's original implicit shape) — superseded by explicit user instruction.
**Trade-offs:** The analytics service must check a preference before sending any event; that preference is itself stored locally as a personal setting.
**Impact:** An `analyticsEnabled` preference joins the existing `soundEnabled`-style pattern (D-016); Settings and Privacy page copy both need to reflect it.
**Future Revisit Required:** No

---

### Decision ID: D-024 (amends D-015)
**Date:** 2026-07-23
**Category:** Architecture
**Decision:** The animation engine takes a playback-speed parameter internally (fixed at 1.0× in V1); it is not hard-coded to a single unparameterized "Normal" behavior. The UI still exposes no speed control in V1.
**Reasoning:** User-requested refinement. Keeps the door open structurally — adding 0.5×/2× later becomes a UI change (expose the existing parameter), not an engine rewrite.
**Alternatives Considered:** D-015's original shape — no speed concept in the engine at all.
**Trade-offs:** Negligible — one extra parameter with a fixed value costs nothing now and removes real future refactor risk.
**Impact:** `AnimationViewer`'s signature includes `playbackSpeed` (default/only value `1.0`) from the start. D-015's UX conclusion is unchanged — only the internal architecture is refined.
**Future Revisit Required:** Yes — revisit exposing the control in UI per D-015's original revisit condition.

---

### Decision ID: D-025
**Date:** 2026-07-26
**Category:** Frontend
**Decision:** Corrected three dependency versions that predated their packages' React 19 peer-dependency support, discovered when the user ran `npm install` locally and hit an ERESOLVE conflict on `lucide-react@0.383.0` (peer range `^16–18` only): `zustand` 4.5.0 → `^5.0.0`, `framer-motion` 11.0.0 → `^12.0.0`, `lucide-react` 0.383.0 → `^1.26.0`.
**Reasoning:** Verified via npm/GitHub (not assumed from training data, which predates these releases): zustand added React 19 support in v5; framer-motion in v12; lucide-react in its v1 line (previous 0.x versions capped at React 18 until a late 0.4xx patch that still isn't what's pinned here). Corrected the actual version numbers rather than forcing the install with `--force`/`--legacy-peer-deps`, per explicit instruction — those flags suppress a real signal instead of fixing it.
**Alternatives Considered:** `--legacy-peer-deps` (rejected, explicitly ruled out); downgrading the project to React 18 (rejected — no reason to give up React 19 when the actual fix is a minor version bump); migrating `framer-motion` to its renamed `motion` package (noted as a real upstream rename, but not made here since it would silently change the tech stack away from what the SRS specifies without being asked — worth raising as an option, not deciding unilaterally).
**Trade-offs:** `lucide-react` v1 removed brand icons (GitHub, LinkedIn, Slack, etc.); none are used in the current codebase, so no impact now, but this is a constraint for the About/Contact pages' real icon choices later.
**Impact:** `package.json` corrected; this sandbox still can't run a live `npm install` (registry returns 403 regardless of package version, confirmed on two different packages), so this remains verified only against upstream registry/changelog data, not a local run in this environment. The user's own environment is the actual verification step.
**Future Revisit Required:** No, unless the user wants to adopt the `motion` package rename.

---

### Decision ID: D-026
**Date:** 2026-07-26
**Category:** Architecture
**Decision:** `CubeState` uses a facelet (sticker) representation as its primary, stored model — a flat array of colors per face. Piece-level data (corner/edge permutation and orientation) is a derived view, computed from facelets on demand by the Validator and later the solver, never stored redundantly.
**Reasoning:** Facelets match the user-facing reality directly (Phase B's painting UI paints stickers, so no translation layer is needed between input and storage), and they generalize cleanly across puzzle sizes (D-003) — a 2×2 is just 4 facelets/face instead of 9, whereas a corner/edge model is fundamentally 3×3-shaped (2×2 has no edges; 4×4 has multiple edge pieces per slot).
**Alternatives Considered:** Piece-based (cubie) representation as primary, with facelets as a derived rendering view — the more common choice in dedicated solving libraries, but a worse fit here given the puzzle-agnostic and UI-first requirements.
**Trade-offs:** Some validation/solving math (permutation parity, orientation sums) is less direct on raw facelets and requires a conversion step — deferred to the Validator subsystem (Phase A, step 4), not needed for CubeState itself.
**Impact:** `lib/cube/types.ts` and `lib/cube/state.ts` implement this now. `CubeState.size` is included from the start so future puzzle sizes reuse the same shape without a model change.
**Future Revisit Required:** No

---

### Decision ID: D-027
**Date:** 2026-07-26
**Category:** Architecture
**Decision:** A `Move` is represented as `{ face, turns: 1|2|3 }` rather than 18 independently-defined moves. Only 6 base (single clockwise quarter-turn) facelet permutations are derived; every variant (`U`, `U2`, `U'`) is that same permutation composed 1, 2, or 3 times. The 6 base permutations were derived from 3D rotation geometry (Rodrigues' rotation formula) in a standalone, self-checking script (`scripts/derive-move-tables.mjs`), not hand-transcribed, and the verified output was then copied into `lib/cube/tables.ts`.
**Reasoning:** Hand-deriving 18 separate permutations for the highest-risk part of the project triples the transcription-error surface for no benefit, since 12 of them are mechanical compositions of the other 6. A geometric derivation, checked by the script itself (structural bijectivity, order-4 property, locality, and two independent "chirality anchor" facts), catches sign/transcription errors before they reach the engine — which is exactly what happened during development: an initial run produced a mirror-image cube (each move internally consistent, but turning the wrong direction), caught by the chirality anchor check and fixed by correcting the anchor's own expected fact, not just the rotation sign, after a careful hand re-derivation of the correct "R→F→L→B→R" content-flow fact.
**Alternatives Considered:** Manually writing all 18 move permutations directly (rejected — highest error risk for the least verifiable payoff); using someone else's published table verbatim (rejected — still requires transcription, and self-derivation is more auditable for a 5-year-maintained project since the derivation script itself is the documentation of *why* the table is correct).
**Trade-offs:** The derivation script is an extra artifact to maintain (kept in `scripts/`, not shipped in the app bundle), and its internal per-face axis conventions are arbitrary (not necessarily "intuitive" as a human-readable net layout) — Phase B's 2D input UI will need its own mapping between what a user visually clicks and these indices, which is a normal, expected adapter, not a shortcoming.
**Impact:** `lib/cube/moves.ts` (`applyMove`, `applyMoves`, `inverseMove`) and `lib/cube/tables.ts` implement this. 18 tests across `state.test.ts`/`moves.test.ts` cover group-theoretic properties (order-4, order-6 for the "sexy move", inverses, immutability, color-count invariant, opposite-face locality) and known cube behavior (the R→F→L→B→R content-flow fact, checked concretely).
**Future Revisit Required:** No, unless a bug is found that the current test suite doesn't cover. **Revisited: see D-039** — a bug *was* found, but in the Validator's separately-derived geometry data, not in this move-table derivation itself; that distinction mattered enough during investigation to record here.

---

### Decision ID: D-028
**Date:** 2026-07-28
**Category:** Architecture
**Decision:** The Notation Parser (`parseAlgorithm`/`formatAlgorithm`) supports only the 6 outer-layer face turns with `'`/`2` modifiers — matching exactly what the Move Engine (D-027) can execute. Wide moves (lowercase letters), slice moves (`M`/`E`/`S`), and whole-cube rotations (`x`/`y`/`z`) are explicitly rejected with a specific, friendly error rather than silently mis-parsed or ignored. `parseAlgorithm` returns a `{success, ...}` result object rather than throwing.
**Reasoning:** Silently uppercasing a wide move or ignoring a slice move would produce a plausible-looking but semantically wrong `Move[]` — a much worse failure mode than a clear rejection. A result object (not exceptions) matches the SRS's "never use ugly alerts, explain what's wrong" philosophy and anticipates that algorithm notation will eventually come from more than just our own trusted case-table data.
**Alternatives Considered:** Throwing on invalid input (rejected — worse ergonomics for an eventual UI that needs to display *why* a move is invalid); silently supporting only what's typed correctly and ignoring the rest (rejected — hides real problems).
**Trade-offs:** CFOP's PLL/OLL algorithms commonly use `M`-slice notation (e.g. the H-perm is often written `M2 U M2 U2 M2 U M2`), so this parser will need extending before Phase E can use official algorithm notation verbatim — logged in Known Issues as a real, anticipated gap, not a hypothetical one.
**Impact:** `lib/cube/notation.ts`, 22 tests in `notation.test.ts` including a round-trip property (`parse ∘ format` and `format ∘ parse` both reproduce the original) and an integration test reusing the Move Engine's own "sexy move" fact. Phase B's `lib/cube/serialization.ts` later builds `cubeFromAlgorithm` directly on top of this parser (D-038) — the D-028 scope boundary applies transitively to algorithm import.
**Future Revisit Required:** Yes — before Phase E (CFOP), extend to support `M`/`E`/`S` slice moves, which will also require extending the Move Engine itself (D-027) since slice moves aren't currently derivable from the 6 base permutations alone.

---

### Decision ID: D-029
**Date:** 2026-07-28
**Category:** Architecture
**Decision:** The Validator (`lib/cube/validator.ts`) checks 7 distinct invariants — color count, center consistency, corner integrity, edge integrity, permutation-parity matching, corner-orientation sum, and edge-orientation sum — each reported as its own named, independently-messaged check, rather than collapsed into the SRS's simpler 5-item Cube Health Check card. The piece-level checks (corner/edge integrity, parity, orientation) depend on a corner/edge facelet grouping (`CORNER_FACELETS`/`EDGE_FACELETS`), derived geometrically in the same script as the move tables (D-027) rather than hand-authored, and are skipped — not silently passed — when a state's size isn't 3, or when integrity fails first.
**Reasoning:** Color count, permutation parity, and orientation sums are logically distinct problems with different causes and different explanations for a user ("wrong colors" vs. "two pieces swapped" vs. "a piece is twisted in place") — collapsing them into one bucket now would lose information a future UI can't get back. Piece-level identity and orientation are derived entirely from data already on hand (the geometric facelet groupings plus the existing solved-cube constant), needing no additional hand-authored "which corner is which" table. Deeper checks are skipped when integrity fails because permutation/orientation math is undefined for a slot that isn't a real, identifiable piece.
**Alternatives Considered:** Matching the SRS's 5-category card exactly at the engine level (rejected — premature collapsing of information; a future Phase B UI can group these 7 into 5 display categories itself, but the reverse isn't possible); silently computing parity/orientation even when integrity fails (rejected — would produce meaningless results dressed up as real answers).
**Trade-offs:** The piece-level checks are 3×3-specific (they assume 54 facelets); non-3×3 states get only the color-count and centers checks, with a comment explaining why, not a silent gap.
**Impact:** `lib/cube/pieces.ts` (identity, orientation, permutation parity) and `lib/cube/validator.ts` (the 7 composed checks). 21 new tests (9 in `pieces.test.ts`, 12 in `validator.test.ts`), including surgically-constructed illegal states (corner swap, edge swap, corner twist, edge flip, duplicate-color corner/edge) built by direct data manipulation rather than through the Move Engine, since the entire point is testing states no legal move sequence can produce. One test-construction bug was caught in the process: an initial "swap one sticker between two corners" helper, intended to isolate a corner-integrity failure from a color-count failure, was a silent no-op — the two chosen facelet positions turned out to always be on the same axis (by construction, every corner's facelet at a given tuple position is always the same axis across all 8 corners), so the "swap" exchanged two already-equal values. Replaced with a direct, guaranteed-correct construction (force a literal duplicate color on one corner) and adjusted the test's expectations to match the more realistic outcome (both color-count and corner-integrity fail together), rather than continuing to chase an artificially isolated case.
**Future Revisit Required:** Yes — extend piece-level validation to 2×2/4×4+ once those puzzle sizes are built (D-003); the center check and edge-integrity check in particular need genuinely different logic for even-sized cubes (no fixed centers; multi-piece edge "wings" with their own parity rules), not just a size-parameter change. **Also revisit per D-039** — the geometric data this decision depends on (`CORNER_FACELETS`) had a real bug, fixed in D-039; anyone extending this system to new sizes should re-read D-039 first.

---

### Decision ID: D-030
**Date:** 2026-07-29
**Category:** Architecture
**Decision:** Phase B, Subsystem 1's 2D unfolded-cross net layout (`lib/cube/net.ts`) lives in the cube library, not in a UI component, and is derived from just the 6 face-block positions rather than all 54 individual cell positions being hand-specified.
**Reasoning:** The mapping from "facelet index" to "position in an unfolded net" is a property of the cube's geometry, not of any particular rendering technology — keeping it in `lib/cube/` means a future 3D or alternate 2D layout can reuse the same face/facelet identification without re-deriving it, and deriving cell positions from 6 block positions (rather than enumerating 54) follows the project's standing "derive, don't duplicate" principle (D-026).
**Alternatives Considered:** Hand-authoring all 54 cell positions directly in the React component (rejected — duplicates data that's mechanically derivable, and couples geometry to a specific rendering approach); computing the layout inside the component on every render without a pure exported function (rejected — untestable in isolation).
**Trade-offs:** None significant — the derivation is a handful of lines and is directly unit-tested.
**Impact:** `lib/cube/net.ts` exports `buildNetLayout`/`netGridSize`, consumed by `components/cube/CubeNet.tsx`. 7 tests cover exhaustiveness, no cell overlap, bounds, and other cube sizes.
**Future Revisit Required:** No

---

### Decision ID: D-031
**Date:** 2026-07-29
**Category:** Architecture
**Decision:** Phase B's cube-painting session is held in its own Zustand store (originally `useNetInputStore`, later renamed — see D-033/Refactoring Log), not folded into an existing store or held as ad hoc component state.
**Reasoning:** The painting session (current cube, selected color) needs to be read and written from multiple sibling components (the net, the color palette, the health check panel) simultaneously, which is exactly Zustand's intended use per D-009, and keeps the interaction testable via `getState()` the same way `useThemeStore` already is.
**Alternatives Considered:** Lifting state into the `/solver/health` page component and prop-drilling (rejected — the established project pattern is a dedicated store for exactly this kind of cross-component, non-trivial state); extending `useThemeStore` or another existing store (rejected — unrelated concerns).
**Trade-offs:** None significant.
**Impact:** The store, its `paintFacelet` action, and its tests establish the pattern every subsequent Phase B subsystem (undo/redo, import/export) extends rather than replaces.
**Future Revisit Required:** No

---

### Decision ID: D-032
**Date:** 2026-07-29
**Category:** Architecture
**Decision:** The Cube Health Check UI never re-derives cube legality itself; it only renders what `validateCube` already computed.
**Reasoning:** If the UI recomputed or duplicated any part of the legality logic, the rules governing "what's a legal cube" would live in two places that could silently drift apart. Keeping the Validator (Phase A) the single source of truth is a direct application of the project's "derive, don't duplicate" principle (D-026) to the UI layer specifically.
**Alternatives Considered:** Precomputing a UI-friendly summary inside the store and having the panel render that instead of calling `validateCube` per render — rejected, since that summary would itself be a form of duplicated, driftable logic.
**Trade-offs:** `validateCube` runs on every render of the health page rather than being cached — acceptable given the check set is small and fast (confirmed by test suite timing).
**Impact:** `HealthCheckPanel.tsx` takes a `ValidationResult` as a prop and contains no legality logic of its own.
**Future Revisit Required:** No

---

### Decision ID: D-033
**Date:** 2026-07-29
**Category:** Architecture
**Decision:** Undo/redo (Phase B, Subsystem 2) is implemented as a generic `HistoryStack<T>` (`lib/history/historyStack.ts` — `push`/`undo`/`redo`/`reset` over `{past, present, future}`), with zero knowledge of cubes, rather than being built directly into the cube-editor store.
**Reasoning:** Undo/redo is a generic editing-session concern, not a cube-specific one — a future algorithm-authoring tool or any other editor-like feature in CubeLab can reuse this exact module. Keeping it generic and pure also makes it trivially unit-testable in isolation from any store or cube logic.
**Alternatives Considered:** Implementing undo/redo directly as an array of past `CubeState` snapshots inside `useCubeEditorStore` (rejected — works, but ties a genuinely generic pattern to one feature, and is harder to test in isolation).
**Trade-offs:** One additional small module (`lib/history/`) to introduce and document, versus inlining the logic — judged worth it for reuse and testability.
**Impact:** `lib/history/historyStack.ts`, 10 tests including an explicit test of the "undo, then a new edit permanently discards the old redo branch" invariant. The cube-editor store wraps this generic stack rather than reimplementing its logic (see D-031's store, renamed under D-033's own subsystem — see Refactoring Log).
**Future Revisit Required:** No

---

### Decision ID: D-034
**Date:** 2026-07-29
**Category:** Architecture
**Decision:** Only the *current* cube (`history.present`), not the undo/redo stacks, is persisted via `StorageAdapter` (D-002). A page reload restores where a user left off, but not their undo history.
**Reasoning:** Persisting full undo/redo stacks would mean unbounded (if rarely large) growth in LocalStorage for a benefit — resuming mid-undo-sequence after a reload — that doesn't clearly matter for this feature, versus the clear, simple benefit of resuming the actual cube you were entering.
**Alternatives Considered:** Persisting the full `HistoryStack` including both stacks (rejected — more storage, more complexity, unclear user value); persisting nothing at all (rejected — loses real work on an accidental refresh, which the SRS's "users should rarely lose work" forgiveness principle argues against).
**Trade-offs:** Explicitly flagged as a real, visible limitation: undo becomes unavailable immediately after a reload, even for a cube state that theoretically "was" undoable before the reload.
**Impact:** `useCubeEditorStore.hydrate()` restores `history.present` only, always starting the restored session with empty `past`/`future`.
**Future Revisit Required:** Yes — if user feedback shows this is a real friction point, persisting the stacks becomes a bounded storage-format change, not an architecture change.

---

### Decision ID: D-035
**Date:** 2026-07-30
**Category:** Architecture
**Decision:** Phase B, Subsystem 3 (Problem-Sticker Highlighting) keeps the Validator strictly UI-agnostic: `ValidationCheck` gains an optional `affected: AffectedEntities` field expressing only logical references (which corner/edge *slot*, which center *face*) — never facelet indices, colors, or any rendering concept. A new, separate module (`lib/cube/highlight.ts`, `resolveAffectedFacelets`) is the sole place that converts those logical references into facelet coordinates; only React components decide how to render that as a visual highlight.
**Reasoning:** Explicit user direction to preserve the Phase A/B separation between the core cube library and the presentation layer. A three-tier split (logical entities → facelet coordinates → pixels) means a future 3D renderer calls the exact same `resolveAffectedFacelets` function the 2D net does, needing to know nothing about how the 2D net turns facelet coordinates into a grid position.
**Alternatives Considered:** Having `validateCube` return facelet indices directly (rejected — couples the Validator to a specific coordinate scheme that a 3D renderer wouldn't share); having each UI component re-derive which facelets are affected from `ValidationCheck`'s existing data (rejected — duplicated logic, same concern as D-032).
**Trade-offs:** `colorCount` and `permutationParity` are inherently non-localizable (which specific pieces are "swapped" isn't uniquely determined by parity alone) and correctly never set `affected` — flagged explicitly so this isn't mistaken for a missed case later. Orientation checks (`cornerOrientation`/`edgeOrientation`) attach affected pieces only when directly, unambiguously computed from each piece's own individual orientation value — never a guess about which piece "caused" a sum-based failure.
**Impact:** `lib/cube/highlight.ts` (new), `AffectedEntities` type in `validator.ts`, `CubeNet.tsx` accepts a `highlighted` prop purely for rendering. 5 new tests for `resolveAffectedFacelets`, extended `validator.test.ts` assertions per check.
**Future Revisit Required:** No — this is exactly the seam Phase D's 3D renderer is expected to reuse; if it can't, that's a signal this decision needs revisiting then, not now.

---

### Decision ID: D-036
**Date:** 2026-07-30
**Category:** Architecture
**Decision:** CubeLab's facelet-string import/export format (Phase B, Subsystem 4) is its own convention — 54 characters, `FACES` order (U,D,L,R,F,B), one letter per color (W/Y/G/B/R/O) — not the Kociemba/URFDLB format used by some external cuber tools.
**Reasoning:** The project's own internal facelet order (already established by `flattenFacelets`/`faceletAt`) is the natural, zero-translation-cost choice; adopting an external tool's convention now would mean either maintaining two internal orderings or a conversion layer for no immediate benefit, since nothing in CubeLab currently needs to interoperate with those tools.
**Alternatives Considered:** Adopting the Kociemba/URFDLB face-letter convention directly (rejected for now — real interop value, but not needed yet, and reordering our own internal representation to match it would be a larger, unforced change).
**Trade-offs:** A facelet string copied from an external tool won't paste in correctly today. Explicitly logged as deferred, documented interop work, not an oversight.
**Impact:** `lib/cube/serialization.ts`'s `cubeToFaceletString`/`faceletStringFromInput`.
**Future Revisit Required:** Yes — revisit if/when interop with external tools or shared cube-state links becomes a real product need.

---

### Decision ID: D-037
**Date:** 2026-07-30
**Category:** Product / Architecture
**Decision:** Facelet-string import succeeds whenever the input is *structurally* well-formed (54 recognized color letters), even if the resulting cube is illegal (bad parity, twisted corner, etc.). Legality is reported afterward by the existing Health Check as informational feedback, never as an import precondition.
**Reasoning:** A likely real use case for import is "I'm not sure if I copied this cube state correctly — check it," which is impossible to support if illegal states are rejected at the door. This also means Subsystem 3's highlighting (D-035) applies to imported cubes for free, with no special-case code.
**Alternatives Considered:** Rejecting imports that fail `validateCube` (rejected — removes the tool's diagnostic value for exactly the cubes a user would most want checked).
**Trade-offs:** None significant — this only changes what counts as a hard parse error (shape/character validity) versus soft, informational feedback (legality), which is already the right distinction.
**Impact:** `faceletStringFromInput` in `lib/cube/serialization.ts` only fails on shape/character problems.
**Future Revisit Required:** No

---

### Decision ID: D-038
**Date:** 2026-07-30
**Category:** Architecture
**Decision:** Import/export logic (`lib/cube/serialization.ts`) is entirely independent of React, Zustand, and `StorageAdapter` — it operates only on `CubeState`/`Move[]`/strings. `useCubeEditorStore` is a thin, Solver-page-specific wrapper around it. Algorithm-export provenance (`lastImportedAlgorithm`) is tracked as "still true right now" — set on a successful algorithm import, cleared by *any* other store action including undo/redo — rather than tracked per history entry.
**Reasoning:** Explicit requirement that future Sandbox/Trainer modules (and, per the most recent product direction, a future 3D Solver interface) be able to call the same serialization functions directly against their own state, without going through this specific store. Per-history-entry provenance tracking was considered and rejected for now as unnecessary coupling of the generic `HistoryStack<T>` (D-033) to a cube-specific concept, for a benefit (undo restoring "knows its algorithm" status) that wasn't asked for.
**Alternatives Considered:** Threading provenance through `HistoryStack<T>` itself, e.g. `HistoryStack<{cube, algorithm}>` (rejected — couples a generic module to a cube-specific field, and would have required revisiting D-033/D-034's already-approved shape); storing provenance only in memory with no store integration at all (rejected — the Export panel needs to read it reactively).
**Trade-offs:** Undoing back to a cube that *was* produced by an algorithm import shows the algorithm as unavailable again, not restored. Export-as-algorithm is shown always-visible with an inline explanation when unavailable, per explicit direction, rather than hidden.
**Impact:** `lib/cube/serialization.ts` (`cubeToFaceletString`, `faceletStringFromInput`, `validateFaceletString`, `cubeFromAlgorithm`), `useCubeEditorStore`'s `importFaceletString`/`importAlgorithm`/`exportFaceletString`/`lastImportedAlgorithm`. 17 serialization tests, 10 additional store tests covering undo/redo across imports, round-trips, and failed-import invariance.
**Future Revisit Required:** Yes — if a future feature specifically needs undo to restore algorithm-known status, this is the decision to revisit.

---

### Decision ID: D-039
**Date:** 2026-07-31
**Category:** Bug Fix / Architecture
**Decision:** Fixed a real functional bug found during Phase B manual acceptance testing: `CORNER_FACELETS`'s per-corner facelet ordering (derived in `scripts/derive-move-tables.mjs`, D-027) must be chirality-consistent across all 8 corner slots for `cornerOrientation` (`pieces.ts`) to be mathematically meaningful. The original derivation sorted each corner's 3 facelets by raw ascending flat-index — geometrically arbitrary, and provably inconsistent (the scalar triple product of any 3 mutually orthogonal axes alternates sign by corner, a geometric fact about 3D space, not a labeling convention that can be fixed by picking one fixed axis order). The script now orders each corner by axis priority and then corrects for sign using the scalar triple product, guaranteeing consistent handedness.
**Reasoning:** User-reported repro (`R U R' U'` from solved, reported "a corner appears twisted") initially appeared to pass when the exact reported algorithm was tested directly against the library — this was misleading. A fuzzer across thousands of random legal scrambles (not just the one reported example) was necessary to find the actual failure rate (~49% of all legally-reached cubes). A first attempted fix (a single fixed axis order, e.g. always X-then-Y-then-Z) was tried and empirically disproved by the same fuzzer before the correct triple-product-based correction was derived — recorded here so a future contributor doesn't repeat the same incomplete fix.
**Alternatives Considered:** A single fixed axis-priority order for all corners (tried, empirically failed — see Reasoning); patching `cornerOrientation`/`validator.ts` to tolerate or reinterpret inconsistent data (rejected — would treat a data bug as expected behavior instead of fixing its source).
**Trade-offs:** None — this is a straightforward correctness fix with no functional downside; the corrected values are regenerated from the (corrected) derivation script, not hand-edited.
**Impact:** `scripts/derive-move-tables.mjs` (`groupByPieceType`), `lib/cube/tables.ts` (`CORNER_FACELETS` values regenerated). New permanent regression suite `lib/cube/validator.legality.test.ts` — exhaustive over all 18 single moves and all 324 move-pairs (deterministic, not randomized, so any future regression is instantly reproducible), plus the original reported repro and a longer mixed algorithm. Verified via fuzzing at increasing scale during investigation (0 failures across a final 20,000-scramble run) — the permanent test suite is what actually ships and runs in CI/`npm test` going forward.
**Future Revisit Required:** No, unless a similarly-shaped bug (geometric data that's structurally valid but not provably consistent) is suspected elsewhere — see Known Issues for the recommended general lesson.

---

### Decision ID: D-040
**Date:** 2026-07-31
**Category:** Frontend / UX
**Decision:** Theme (dark/light) is applied via a `beforeInteractive` inline script (`next/script`) in the root layout that reads the same persisted key `useThemeStore` uses and applies the `dark` class before first paint, rather than only from `ThemeProvider`'s post-hydration `useEffect`.
**Reasoning:** User-reported bug: refreshing in dark mode briefly flashed light mode first. The class was previously only ever set after React hydrated and the effect ran — meaning the browser always painted the default (light) state at least once first on every load. This is the standard, well-established fix pattern for this exact class of bug.
**Alternatives Considered:** Server-side theme detection via cookies (rejected — bigger change, and the existing persistence is LocalStorage-based per D-002, not cookie-based); accepting the flash as a minor cosmetic issue (rejected — explicitly reported and easy to fix correctly).
**Trade-offs:** None significant — `suppressHydrationWarning` was already present on `<html>` for other reasons, and this pattern is designed to be safe with it.
**Impact:** `app/layout.tsx` gains a small inline script; `ThemeProvider`'s existing `hydrate()`/`useEffect` logic is unchanged (now redundant on first paint but still needed for later theme changes and for keeping React state in sync).
**Future Revisit Required:** No

---

### Decision ID: D-041
**Date:** 2026-07-31
**Category:** UX
**Decision:** `/solver` redirects to `/solver/health` (currently the one real Solver feature) rather than showing a dead-end placeholder. The Nav link, homepage CTA, and both Command Palette entries were also updated to point directly at `/solver/health`.
**Reasoning:** User-reported: the working Health Check page was undiscoverable through normal navigation. Until Phase C/D add more Solver sub-pages, sending every entry point straight to the one real feature is more honest than a placeholder that goes nowhere.
**Alternatives Considered:** A "Solver" dropdown/submenu with Health Check as its one entry (considered, judged premature for a single sub-page — worth revisiting once Phase C or D adds a second real Solver destination).
**Trade-offs:** None significant now; will need revisiting (the dropdown alternative) once there's more than one real Solver destination to choose between.
**Impact:** `components/layout/Nav.tsx`, `app/solver/page.tsx` (redirect), `app/page.tsx`, `lib/commands/sources.ts`.
**Future Revisit Required:** Yes — reconsider a Solver submenu once Phase C (solving engine) or Phase D (3D Solver) adds a second real destination under `/solver`.

---

### Decision ID: D-042
**Date:** 2026-07-31
**Category:** UX
**Decision:** The 2D cube net gained U/D/L/R/F/B face labels directly on each block, plus a compact, derived-not-hardcoded "hold your cube like this" legend (`OrientationHint`, reading actual colors from `createSolvedCube()` rather than a second hardcoded color mapping). White stickers/swatches across `CubeNet`, `ColorPalette`, and `OrientationHint` were given a firmer border in light mode, where the previous subtle border was nearly invisible against a near-white background.
**Reasoning:** User-reported, from manual testing as a first-time user: the net's orientation (which face is Front, which way is Up) wasn't self-explanatory, and white stickers were hard to see in light mode. Both are addressed with lightweight, non-3D solutions per explicit direction — no 3D cube is being built yet.
**Alternatives Considered:** A full illustrated "how to hold a cube" diagram (rejected as heavier than needed — explicitly asked to keep this lightweight); leaving orientation unlabeled on the assumption users already know cube-net conventions (rejected — this was the actual reported problem).
**Trade-offs:** None significant.
**Impact:** `components/cube/CubeNet.tsx`, new `components/cube/OrientationHint.tsx`, `components/cube/ColorPalette.tsx`. This remains a 2D-only, lightweight solution — Phase D's 3D interface will need its own (likely much simpler, since a 3D cube's orientation is visually self-evident) approach to the same underlying problem.
**Future Revisit Required:** No — superseded in spirit once Phase D ships a 3D interface, at which point this problem mostly disappears rather than needing a fix.

---

### Decision ID: D-043
**Date:** 2026-08-03
**Category:** Architecture
**Decision:** Phase C, Subsystem 0's shared solver contract (`lib/solver/`) represents a solve as an ordered `SolveStage[]`, each stage carrying only `{id, label, moves, explanation?}` — no stored before/after `CubeState` snapshot and no stored formatted algorithm string. Both are always derived on demand from `moves` via the existing Move Engine (`applyMoves`, for snapshots — `deriveStageSnapshots`) and Notation Parser (`formatAlgorithm`), never stored redundantly. `SolverMethod` (the pluggable per-method interface anticipated by D-011) and a generic `runStages`/`solveWithStages` Case-Solving Stage Runner are the only shared infrastructure; no case tables or method-specific solving logic live here. Invalid or unsupported (non-3×3) input is rejected by a shared `rejectIfInvalid` before any stage-specific logic runs, reusing `validateCube` rather than a solver-specific legality re-check.
**Reasoning:** This is the same "derive, don't duplicate" principle D-026 (facelets-primary `CubeState`), D-030 (net layout derived from 6 face positions), and D-032 (Health Check never re-derives legality) already established, applied to the solver's own output shape. A stage's `moves` are the one fact a solving-method module actually computes; a stored snapshot or algorithm string alongside it would be a second copy of information already fully determined by `moves`, and — per the explicit risk this decision was asked to design against — the exact kind of place a future edit could silently let the two disagree (a stage's moves changing without its stored "after" state being updated to match, for instance). Deriving instead makes that entire bug class structurally impossible rather than merely disciplined-against, and is computationally free at this scale (a full beginner solve is at most a few dozen moves; `applyMoves` is a fast, already-hot-path array operation, D-027). Rejecting invalid/unsupported input through the existing Validator, rather than a new solver-specific check, is D-032's discipline applied one layer up: legality has exactly one source of truth in this codebase, and the solver boundary doesn't get its own second opinion on it.
**Alternatives Considered:** Storing a `CubeState` on each stage (before, after, or both) — rejected, the primary alternative this decision was explicitly asked to weigh, for the drift reason above; revisit only if profiling ever shows `deriveStageSnapshots`/replay is a real performance problem, which is not expected at Beginner Method's move-count scale. Storing a formatted algorithm string per stage — rejected for the same reason; `formatAlgorithm(stage.moves)` is a cheap, already-tested pure function (D-028), so there's no benefit to caching its output redundantly. Making `SolveStage.id` a literal union of Beginner-Method-specific stage names (`'white-cross' | 'first-layer-corners' | ...`) at the shared-contract level — rejected, since that would hardcode one method's vocabulary into infrastructure CFOP (D-011, Phase E) is explicitly meant to reuse; kept as plain `string` here, with the literal stage names to be defined by the Beginner Method module itself in Subsystem 1 onward. A single `solve(state): SolveResult` entry point with no separate `StageSpec`/`runStages` split — rejected, since D-011 already commits to a shared "Case-Solving Stage Runner" that multiple methods reuse, and collapsing it into each method's own `solve` would mean CFOP re-implementing the same sequencing logic instead of sharing it.
**Trade-offs:** A consumer that wants a stage's resulting `CubeState` (Phase D, most notably) must call `deriveStageSnapshots`/`applyMoves` rather than reading a field directly — a small, deliberate ergonomic cost in exchange for the drift guarantee above. `SolveFailureReason` currently has two cases (`'invalid-cube'`, `'unsupported-size'`) rather than a broader taxonomy; kept minimal since Beginner Method (Subsystem 1 onward) is expected to always find a solution for any input that passes both checks, so no third failure mode is anticipated yet — if one is discovered during Subsystem 1+ implementation, it's a small, additive change to this union, not a redesign.
**Impact:** New `lib/solver/` module: `types.ts` (`SolveStage`, `SolveSuccess`, `SolveFailure`, `SolveFailureReason`, `SolveResult`, `StageSpec`, `SolverMethod`), `stageRunner.ts` (`rejectIfInvalid`, `runStages`, `solveWithStages`, `aggregateMoves`, `deriveStageSnapshots`), `index.ts` (barrel export, matching `lib/cube/index.ts`'s convention). 18 new tests in `stageRunner.test.ts`. No existing module changed; `lib/cube/` and `lib/history/` remain exactly as Phase A/B left them. Subsystem 1 onward (Beginner Method's actual solving logic — White Cross, First-Layer Corners, etc.) will be `StageSpec[]` implementations plugged into this runner, not a new orchestration layer.
**Future Revisit Required:** Yes — once Phase E (CFOP) is underway, confirm this contract genuinely serves a second, structurally different solving method without modification, which is the actual test of whether "shared infrastructure" was designed correctly here; if CFOP needs something this contract doesn't provide, that's the trigger to revisit, not a hypothetical concern to resolve now.
