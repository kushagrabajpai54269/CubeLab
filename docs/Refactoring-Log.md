# CubeLab — Refactoring Log

> **Provenance note (added 2026-08-02):** unlike this project's other five
> living documents, no prior authoritative version of this file was
> supplied during the Phase B documentation reconciliation pass — it exists
> only as a same-session draft written before that reconciliation began. If
> a real prior version exists, supply it and this file will be reconciled
> the same way the other five were.

Notable refactors, in chronological order, and why each happened.

## `useNetInputStore` → `useCubeEditorStore` (Phase B, Subsystem 2)
Renamed when undo/redo was added, since the store was about to hold
history, import/export, and eventually more than just "net input." No
behavior change at rename time; the store's actual API grew across
Subsystems 2–4 afterward. See D-031 (original store) and D-033 (the
subsystem this rename happened under).

## Corner/edge facelet table derivation (Phase B stabilization pass, D-039)
`scripts/derive-move-tables.mjs`'s `groupByPieceType()` originally ordered
each corner/edge's facelets by ascending raw flat-index — simple, but
geometrically arbitrary. Replaced with axis-priority ordering plus a
scalar-triple-product chirality correction for corners, since a fixed axis
order alone was empirically shown (via fuzzing) to still be wrong for
roughly half the corners. `CORNER_FACELETS` in `lib/cube/tables.ts` was
regenerated from the corrected script. Full root-cause writeup in
`Decision-Log.md` (D-039) and `Known-Issues.md`.

## `CubeNet` face-label positioning (same pass)
While adding face labels to the 2D net for orientation UX, an intermediate
version hardcoded a block-pixel-size assuming a 3×3 cube. Caught and fixed
before shipping: block size is now derived from `cube.size`
(`CELL_PX * cube.size + GAP_PX * (cube.size - 1)`), matching the rest of the
codebase's D-003 size-generality discipline. `OrientationHint`'s
center-index constant was generalized the same way in the same pass.

## Non-null assertions for `noUncheckedIndexedAccess` (incremental, several points)
Several places (`CubeNet.tsx`, `OrientationHint.tsx`, the orientation-sum
computation in `validator.ts`) needed a documented non-null assertion where
an array index is always in range by construction but the strict
`noUncheckedIndexedAccess` compiler flag can't prove it statically. Each
site has a one-line comment explaining why the index is provably safe. This
same pattern is the recommended fix for the remaining, currently-deferred
instances in `moves.ts`/`notation.ts`/`pieces.ts` — see `Known-Issues.md`.

## `noUncheckedIndexedAccess` cleanup pass (pre-Phase C, 2026-08-03)
Resolved all 36 compiler errors flagged in Known-Issues.md, behavior-preservingly, as the recommended gate before Phase C's solver builds on `pieces.ts`. **Re-verification note:** independently re-ran `npm install`/`npm run typecheck` fresh in this pass (the sandbox allowed a real install this time) and found the actual per-file split was **9 in `pieces.ts`, 25 in `validator.test.ts`** — the number previously recorded in Known Issues (8/26) was off by one in each direction; same total (36). Corrected there rather than left standing.

Per-file approach, favoring genuine narrowing over blind assertions wherever practical:
- **`lib/cube/moves.ts`** (1 error, `applyMove`'s `flat[src]`) — documented non-null assertion. `src` values come from `BASE_PERMUTATIONS`, self-checked for bijectivity by `scripts/derive-move-tables.mjs` (D-027); this is the one site in the cleanup where an assertion (not a restructure) was the right call, since the array is accessed in a hot loop and the invariant is already independently verified elsewhere.
- **`lib/cube/notation.ts`** (1 error, `parseMove`'s destructured `letter`) — genuine narrowing: `if (!letter || ...)` guards the value directly rather than asserting it, with a comment explaining why `letter` is in practice always defined once `MOVE_PATTERN` matches.
- **`lib/cube/pieces.ts`** (9 errors):
  - `rotateTriple` (3 errors) — restructured to index a 3-tuple with static literals (`arr[0]`/`arr[1]`/`arr[2]`) per rotation case instead of a computed index; tsc doesn't flag literal-index access into a fixed-length tuple, so no assertion was needed at all.
  - `cornerOrientation`/`edgeOrientation` (6 errors combined) — added a genuine `if (!solved) return null` guard in each. This is a real, if currently unreachable, behavior change: previously, an out-of-range `identity` would throw a raw TypeError; now it returns `null`, which both functions' own `number | null` signature already models as "couldn't be determined." Flagged explicitly since "no behavior change" doesn't quite apply to this one line, but the new behavior is strictly more correct.
  - `permutationParity` (1 error, `permutation[j]`) — documented non-null assertion; by contract `permutation` is always a permutation of its own indices (only ever called with identity arrays from `identifyCorner`/`identifyEdge`).
- **`lib/cube/validator.test.ts`** (25 errors, all in the illegal-state test-construction helpers `withCornersSwapped`/`withEdgesSwapped`/`withCornerTwisted`/`withEdgeFlipped`/`withImpossibleCorner`/`withImpossibleEdge`) — introduced one small local `at<T>(arr, index)` helper that does a real runtime bounds check and throws a descriptive error rather than silently returning `undefined`, then routed every indexed access in these helpers through it. Preferred over scattering ~25 individual non-null assertions: centralizes the one genuine invariant (these test helpers only ever receive small, hardcoded, in-range slot numbers) in one auditable place instead of repeating an unenforced assumption at every call site.

Verified after: `npm test` (145/145, unchanged), `npm run typecheck` (0 errors, down from 36), `npm run lint` (clean, unchanged). No public API of any module changed.

## `.gitignore` / `package.json` scripts (handoff pass)
`.gitignore` was missing several standard entries (`*.tsbuildinfo`,
`next-env.d.ts`, `.DS_Store`, bare `.env`) — a generated 124KB
`tsconfig.tsbuildinfo` had already accumulated untracked-but-uncommitted in
the working tree and was deleted. `package.json`'s `test` script changed
from `vitest` (watch mode) to `vitest run` (single pass, correct default
for CI/handoff) with a new `test:watch` for local dev; a `typecheck` script
(`tsc --noEmit`) was added since one had never existed despite being
referenced repeatedly in this project's own documentation.
