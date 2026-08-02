# CubeLab — Phase 0 Skeleton

Full site skeleton per the approved architecture (see the project knowledge-base
docs: Architecture Notes, Decision Log D-001–D-024).

## What's here
- Every page route, via Next.js App Router (Home has a real hero; everything
  else is a structured placeholder, D-021)
- Design tokens wired into Tailwind: Geist, Lucide, 8px-based spacing,
  Electric Blue accent, dark mode in blue-gray/violet-gray (D-010)
- Zustand stores for theme and command-palette state
- `StorageAdapter` abstraction (D-002) — theme preference is its first real
  consumer, nothing touches `localStorage` directly outside `LocalStorageAdapter`
- Extensible Command Palette (Ctrl/Cmd+K) built on a `CommandSource` registry
  (D-022): navigation and theme-toggle sources are live; algorithm-search and
  learning-topic sources are registered now and return no results until
  Phase F and the content-authoring phase wire in real data
- Starter unit tests (`lib/utils.test.ts`,
  `lib/services/storage/LocalStorageAdapter.test.ts`) establishing the
  co-located test convention (D-017)

## What's not here yet
Cube engine, solvers, 3D rendering, real Learn/About/FAQ copy, auth,
analytics — all per the Roadmap's later phases.

## Getting started
```
npm install
npm run dev    # http://localhost:3000
npm test
npm run lint
```
