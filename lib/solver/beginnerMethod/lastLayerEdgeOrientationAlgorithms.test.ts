import { describe, it, expect } from 'vitest'
import { createSolvedCube, flattenFacelets, unflattenFacelets } from '../../cube/state'
import { applyMoves } from '../../cube/moves'
import { EDGE_FACELETS } from '../../cube/tables'
import { edgeOrientationAlgorithm, classifyEdgeOrientation } from './lastLayerEdgeOrientationAlgorithms'
import { LAST_LAYER_EDGE_SLOTS, areAllLastLayerEdgesOriented, isLastLayerEdgeOriented } from './lastLayerGeometry'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'

/**
 * Regression coverage for Phase C, Subsystem 5's edge-orientation
 * algorithms: the 2 self-verified, search-derived algorithms (`line`,
 * `lshape`) and the `classifyEdgeOrientation` alignment logic that picks
 * which one to use and how much to rotate first. Every check replays
 * moves through the real Move Engine and inspects the resulting
 * `CubeState` directly.
 */

function isFirstTwoLayersSolved(state: ReturnType<typeof createSolvedCube>): boolean {
  return (
    WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id)) &&
    FIRST_LAYER_CORNER_IDENTITIES.every((id) => isFirstLayerCornerSolved(state, id)) &&
    SECOND_LAYER_EDGE_IDENTITIES.every((id) => isSecondLayerEdgeSolved(state, id))
  )
}

function flipEdgeFixture(orientedSlots: readonly number[]) {
  const solved = createSolvedCube()
  const flat = flattenFacelets(solved)
  for (const slot of LAST_LAYER_EDGE_SLOTS) {
    if (!orientedSlots.includes(slot)) {
      const [p0, p1] = EDGE_FACELETS[slot]!
      const tmp = flat[p0]!
      flat[p0] = flat[p1]!
      flat[p1] = tmp
    }
  }
  return unflattenFacelets(flat, 3)
}

describe('edgeOrientationAlgorithm', () => {
  it('derives non-empty line and lshape algorithms', () => {
    expect(edgeOrientationAlgorithm('line').length).toBeGreaterThan(0)
    expect(edgeOrientationAlgorithm('lshape').length).toBeGreaterThan(0)
  })

  it('returns a fresh copy each call (no shared mutable state)', () => {
    const a = edgeOrientationAlgorithm('line')
    const b = edgeOrientationAlgorithm('line')
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('classifyEdgeOrientation', () => {
  it('returns null for a fully-oriented (solved) last layer', () => {
    expect(classifyEdgeOrientation(createSolvedCube())).toBeNull()
  })

  it('classifies the Dot case (0 oriented) with dTurns 0', () => {
    const dot = flipEdgeFixture([])
    expect(classifyEdgeOrientation(dot)).toEqual({ kase: 'dot', dTurns: 0 })
  })
})

describe('classify + align + apply: exhaustive over every 2-of-4 oriented pattern', () => {
  it('every possible 2-oriented pattern (all 6 combinations) fully solves and preserves the first two layers', () => {
    const slots = LAST_LAYER_EDGE_SLOTS
    const subsets: number[][] = []
    for (let mask = 0; mask < 16; mask++) {
      const subset = slots.filter((_, i) => (mask >> i) & 1)
      if (subset.length === 2) subsets.push(subset)
    }
    expect(subsets).toHaveLength(6)

    for (const subset of subsets) {
      const fixture = flipEdgeFixture(subset)
      expect(isFirstTwoLayersSolved(fixture)).toBe(true)

      const info = classifyEdgeOrientation(fixture)
      expect(info).not.toBeNull()
      const { kase, dTurns } = info!
      expect(kase === 'line' || kase === 'lshape').toBe(true)

      const rotated = dTurns === 0 ? fixture : applyMoves(fixture, [{ face: 'D', turns: dTurns }])
      const result = applyMoves(rotated, edgeOrientationAlgorithm(kase as 'line' | 'lshape'))

      expect(areAllLastLayerEdgesOriented(result)).toBe(true)
      expect(isFirstTwoLayersSolved(result)).toBe(true)
    }
  })
})

describe('Dot reduction', () => {
  it('applying the lshape algorithm to the Dot fixture (at every D alignment) always yields exactly 2 oriented edges, preserving the first two layers', () => {
    const dot = flipEdgeFixture([])
    for (const dTurns of [0, 1, 2, 3] as const) {
      const rotated = dTurns === 0 ? dot : applyMoves(dot, [{ face: 'D', turns: dTurns }])
      const result = applyMoves(rotated, edgeOrientationAlgorithm('lshape'))
      const orientedCount = LAST_LAYER_EDGE_SLOTS.filter((s) => isLastLayerEdgeOriented(result, s)).length
      expect(orientedCount).toBe(2)
      expect(isFirstTwoLayersSolved(result)).toBe(true)
    }
  })
})

describe('determinism', () => {
  it('produces identical algorithm output for identical case', () => {
    const a = edgeOrientationAlgorithm('lshape')
    const b = edgeOrientationAlgorithm('lshape')
    expect(a).toEqual(b)
  })
})
