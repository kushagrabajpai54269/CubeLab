import type { SolverMethod } from '../types'
import { solveWhiteCross } from './whiteCross'
import { solveFirstLayerCorners } from './firstLayerCorners'
import { solveSecondLayerEdges } from './secondLayerEdges'
import { solveLastLayerOrientation } from './lastLayerOrientation'
import { solveLastLayerPermutation } from './lastLayerPermutation'

import { solveWithStages } from '../stageRunner'

export const beginnerMethod: SolverMethod = {
  id: 'beginner-method',
  label: 'Beginner Method',
  solve: (state) => solveWithStages(state, [
    {
      id: 'white-cross',
      label: 'White Cross',
      explanation: 'Solves the 4 white edges around the white center',
      solve: solveWhiteCross,
    },
    {
      id: 'first-layer-corners',
      label: 'First Layer Corners',
      explanation: 'Solves the 4 white corners, completing the first layer',
      solve: solveFirstLayerCorners,
    },
    {
      id: 'second-layer-edges',
      label: 'Second Layer Edges',
      explanation: 'Solves the 4 middle-layer edges, completing the first two layers (F2L)',
      solve: solveSecondLayerEdges,
    },
    {
      id: 'last-layer-orientation',
      label: 'Last Layer Orientation',
      explanation: 'Orients the last-layer edges and corners (2-look OLL)',
      solve: solveLastLayerOrientation,
    },
    {
      id: 'last-layer-permutation',
      label: 'Last Layer Permutation',
      explanation: 'Permutes the last-layer corners and edges, fully solving the cube (PLL)',
      solve: solveLastLayerPermutation,
    },
  ]),
}
