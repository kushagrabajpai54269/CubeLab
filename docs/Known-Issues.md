# CubeLab — Known Issues

## Resolved Since Last Update
- Cloudflare deployment mode — resolved: Next.js adapter, not static export (D-019)
- Video hosting strategy — resolved by the SRS itself: YouTube embeds + native animations
- No brand/design assets — resolved: design tokens locked (D-010)
- Learn section ordering inconsistency — resolved: Finger Tricks precedes Beginner Method (D-020)
- Command palette scope — resolved: extensible command registry (navigation, algorithm search, learning-topic search, quick solver access, theme toggle, future commands) — D-022
- Learn content ownership — resolved for now: framework and placeholders are built first; real content is written in a dedicated later phase, held to an explicit bar (original, technically accurate, beginner-friendly, concise, not copied) — D-021
- Analytics privacy tension — resolved: decoupled, anonymous, disclosed, and now explicitly opt-out-able in Settings — D-013/D-023
- Animation speed extensibility — resolved: engine takes a `playbackSpeed` parameter internally even though V1 UI exposes only one value — D-015/D-024
- **Solver undiscoverable** — resolved: Nav, homepage CTA, and both Command Palette entries now point directly at `/solver/health`; bare `/solver` redirects there as a safety net — D-041
- **Cube-net orientation confusion (first-time users)** — resolved, lightweight/non-3D: U/D/L/R/F/B face labels on the net, plus a derived "hold your cube like this" legend — D-042
- **Dark-mode flash on page refresh** — resolved: theme now applies via a `beforeInteractive` script before first paint, instead of only from a post-hydration effect — D-040
- **White stickers nearly invisible in light mode** — resolved across `CubeNet`, `ColorPalette`, and `OrientationHint` — D-042
- **Import/Export workflow unclear** — resolved: added icons, explanatory copy, and an explicit line clarifying import is an alternative to painting, not an additional required step
- **`noUncheckedIndexedAccess` TypeScript debt** — resolved (2026-08-03), before Phase C, as recommended: all 36 errors fixed behavior-preservingly. **Correction to the count this item previously carried**: independently re-verified via a real `npm install`/`tsc --noEmit` run (this sandbox could run one this time, unlike the 403 noted elsewhere in this doc) — the actual split was **9 in `lib/cube/pieces.ts`** and **25 in `lib/cube/validator.test.ts`** (36 total, same total, previously mis-recorded as 8/26). `npm run typecheck` now reports 0 errors; `npm test` (145/145) and `npm run lint` (clean) both still pass unchanged. Full breakdown in Refactoring Log.

## Open Questions
- **Sound asset sourcing** — interaction sounds and optional ambient music need either commissioned original audio or properly licensed royalty-free assets; not addressed by the SRS. Not blocking — a later-phase concern.
- **Architecture Notes / Refactoring Log currency** — these two knowledge-base documents were not re-supplied alongside the other five during the Phase B handoff pass (2026-08-02), so their state relative to everything built in Phase B is currently unconfirmed. Needs the user to either provide the current files or confirm they should be authored fresh.

## Watch Items / Risks (not bugs — tracked so they aren't forgotten)
- CFOP solver remains the single largest scope item, though D-011's shared-infrastructure design meaningfully reduces the *duplicated* portion of that work — the case-table *data* for OLL/PLL/F2L is still substantial content to produce
- Practice/Trainer mode's case-specific scramble generation is distinct logic from the main solver and must be budgeted as its own work item (D-012)
- Achievement/streak copy must stay milestone-framed, never loss-aversion-framed (D-005)
- The Notation Parser and Move Engine currently only support the 6 outer-layer face turns (D-027, D-028). CFOP's PLL/OLL algorithms commonly use `M`-slice notation (e.g. the H-perm: `M2 U M2 U2 M2 U M2`) — both the parser and the engine will need extending to support `M`/`E`/`S` slice moves before Phase E can use official algorithm notation verbatim. Logged now so it isn't a surprise later.
- The Validator's piece-level checks (corner/edge integrity, permutation parity, orientation sums, D-029) are 3×3-specific — skipped, not failed, for any other size, and this is now shipped, tested behavior (Phase B), not just a future plan. Extending to 2×2/4×4+ (D-003, Phase D2) will need genuinely different logic, not just a size parameter: even-sized cubes have no fixed centers at all, and 4×4+ edges are multi-piece "wings" with their own parity rules.
- ~~`noUncheckedIndexedAccess` TypeScript debt~~ — **resolved 2026-08-03, see Resolved Since Last Update above and the Refactoring Log for the full per-file breakdown.**
- No component-level (React Testing Library) UI tests exist anywhere in the project — Phase B's UI correctness was verified entirely by manual testing. This is a growing risk the closer the project gets to Phase D, where 3D mesh interactions (click-to-select, drag-to-rotate) will be much harder to verify by code review alone than 2D DOM clicks have been so far.
- `next build` could not be verified end-to-end in the development sandbox used for Phase B (no network access to `fonts.googleapis.com`) — typecheck, lint, and the test suite were the reliable checks used instead. Recommend a real build check in a normal development environment before deploying.

## Postponed Features (intentional, per spec)
- Real OAuth provider integration — deferred until migration to Claude Code (D-006)
- Camera-based cube scanning — explicitly deferred (D-018)
- Educational content authoring (Learn section copy) — deferred to a dedicated later phase (D-021)
- Additional puzzle types and solving methods — architected for, not built yet
- Cloud sync, PWA, multiplayer, AI-assisted learning, algorithm bookmarking, resume download — architected for or noted, not built yet
- **Sandbox mode** (enter an algorithm, execute it step-by-step on the interactive 3D cube; later, additional puzzle sizes) — scoped into the Roadmap as Phase D2, dependent on Phase D's 3D renderer; not built yet
- Kociemba/URFDLB facelet-string interop, and a shareable compact URL encoding for cube state — both noted during Phase B, Subsystem 4 design and deliberately deferred (D-036)

## Bugs
- **[Resolved, D-039]** Corner-orientation chirality bug, found during Phase B manual acceptance testing (2026-07-31): the Validator's `CORNER_FACELETS` geometry table ordered each corner's 3 facelets by an arbitrary rule instead of a chirality-consistent one, causing the Health Check to falsely report "a corner appears twisted in place" on roughly half of all legally-reached cube states — including the user's exact reported example, `R U R' U'` from solved. Root cause, the disproved first fix attempt, the correct fix, and verification are recorded in full in the Decision Log (D-039) and the Development Journal (Entry 14); not duplicated here beyond this summary. Permanently regression-tested by `lib/cube/validator.legality.test.ts`. The Move Engine itself was never at fault.

## Performance Bottlenecks
_None identified. No performance testing has been done yet — not relevant at current scale (a single 2D input page); revisit once Phase D's 3D rendering and Phase E/F's larger data sets (case tables, algorithm search) exist._

## Accessibility Concerns
_Formal audit still starts Phase 3 (design, already passed without a dedicated a11y pass being called out) and Phase I (QA) as originally planned. Not audited as part of Phase B; the Phase B UI does use semantic roles (`radiogroup`, `group`, `aria-label`) and keyboard-operable controls throughout, but this hasn't been verified against a real accessibility checklist._

## Browser Compatibility Issues
_None identified — no cross-browser testing has been performed yet (Phase B manual testing was done in a single browser). Revisit before Phase I._
