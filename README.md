# CubeLab

A Rubik's Cube web app: learn, solve, practice, and track your progress. Built
with Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind, Zustand,
and React Three Fiber (for the 3D work still ahead).

**Status: Phase A and Phase B complete and manually accepted.** See
`docs/Roadmap.md` for what's built, what's next, and the full phase plan —
including the planned 3D cube renderer and Sandbox mode.

## What's implemented

**Phase A — core cube library** (`lib/cube/`): `CubeState`, the Move Engine,
the Notation Parser, and the Validator — the dependency-free computational
foundation everything else builds on.

**Phase B — Solver input experience** (`/solver/health`): a 2D cube-net input
UI with color painting, undo/redo, a live legality Health Check with
problem-sticker highlighting, and facelet-string / algorithm import-export.
This 2D net is a permanent alternative input/diagnostic tool, not a
placeholder for the eventual 3D interface (see the Roadmap).

Cube engine, solvers, 3D rendering, real Learn/About/FAQ copy, auth, and
analytics are all tracked in `docs/Roadmap.md`.

## Project knowledge base

Living documentation lives in `docs/`:
- `Roadmap.md` — phase plan, including the 3D Solver and Sandbox requirements
- `Decision-Log.md` — numbered architectural decisions (D-001 onward)
- `Architecture-Notes.md` — how the pieces fit together
- `Development-Journal.md` — session-by-session narrative
- `Testing-Log.md` — test coverage by area
- `Known-Issues.md` — open bugs and technical debt
- `Refactoring-Log.md` — notable refactors and why

## Getting started

```
npm install
npm run dev         # http://localhost:3000
npm test            # vitest, single run
npm run test:watch  # vitest, watch mode
npm run typecheck   # tsc --noEmit — see docs/Known-Issues.md for current status
npm run lint
```

To regenerate the Move Engine / Validator's geometric data tables (only ever
needed if `scripts/derive-move-tables.mjs` itself changes):
```
node scripts/derive-move-tables.mjs
```
This prints the derived `BASE_PERMUTATIONS`, `CORNER_FACELETS`, and
`EDGE_FACELETS` for manual copy into `lib/cube/tables.ts` — see D-027.
