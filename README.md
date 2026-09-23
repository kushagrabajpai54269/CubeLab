# CubeLab

**A Rubik’s Cube solver and interactive learning platform, built from the ground up.**

CubeLab combines cube logic, visualization, and step-by-step solving to make exploring and solving the Rubik’s Cube easier.

## Features

### Available

* **Core cube engine:** Cube state representation, move execution, and notation parsing.
* **Cube validation:** Check whether a cube state is valid.
* **2D Cube Net:** Visualize and edit cube stickers.
* **Move controls:** Undo, redo, highlighting, and state import/export.
* **Beginner Method Solver:** Solve through the beginner method, including first two layers and last-layer orientation and permutation.

### Planned

* **Interactive 3D Cube:** Rotate and interact with a 3D cube.
* **Step-by-step solving:** Animated solutions with playback controls.
* **Sandbox Mode:** Freely experiment with cube states and moves.
* **CFOP Solver:** An additional solving method.
* **Learning & Practice:** Algorithm encyclopedia, trainer, and guided learning content.
* **Progress Tracking:** Track practice and solving progress.

## Screenshots / Demo

Screenshots and live demo: *To be added.*

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **UI:** React 19
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Testing:** Vitest + JSDOM

**Planned:** Three.js + React Three Fiber for the interactive 3D cube.

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```
git clone https://github.com/kushagrabajpai54269/CubeLab.git
cd CubeLab
npm install
```

### Environment Variables

No required environment variables have been confirmed. Check the project configuration before adding any.

### Run Locally

```
npm run dev
```

### Build and Test

```
node scripts/derive-move-tables.mjs
```

## Project Structure

```
CubeLab/
├── lib/
│   └── solver/
│       └── beginnerMethod/
├── docs/
└── ...
```


## Development Status

| Phase                                           | Status         |
| ----------------------------------------------- | -------------- |
| Phase 0                                         | Complete       |
| Phase A — Cube Engine                           | Complete       |
| Phase B — 2D Input & Validation                 | Complete       |
| Phase C — Beginner Method Solver                | Complete       |
| Phase D — Interactive 3D Solver                 | In development |
| Phase D2 — Sandbox                              | Planned        |
| Phase E — CFOP Solver                           | Planned        |
| Phase F — Algorithms & Practice                 | Planned        |
| Phase G — Progress & Settings                   | Planned        |
| Phase H — Auth, SEO & Analytics                 | Planned        |
| Phase I — Accessibility, Performance & Final QA | Planned        |

## Contributing

CubeLab is currently maintained by its author. Contributions may be considered as the project develops.

## Credits

Built with React, TypeScript, and the open-source libraries used in the project.

## License

No license has been specified yet.
