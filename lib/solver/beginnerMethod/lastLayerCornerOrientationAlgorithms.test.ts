import { describe, it, expect } from 'vitest'
import { createSolvedCube, flattenFacelets, unflattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { CORNER_FACELETS } from '../../cube/tables'
import type { FaceletColor } from '../../cube/types'
import { cornerOrientationStepMoves } from './lastLayerCornerOrientationAlgorithms'
import {
  LAST_LAYER_CORNER_SLOTS,
  areAllLastLayerCornersOriented,
  areAllLastLayerEdgesOriented,
} from './lastLayerGeometry'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'

/**
 * Regression coverage for Phase C, Subsystem 5's corner-orientation step
 * algorithm (a single, self-verified, search-derived Sune analogue) and
 * its round-level-search-based usage pattern. Every check replays moves
 * through the real Move Engine and inspects the resulting `CubeState`
 * directly.
 */

function isFirstTwoLayersSolved(state: ReturnType<typeof createSolvedCube>): boolean {
  return (
    WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id)) &&
    FIRST_LAYER_CORNER_IDENTITIES.every((id) => isFirstLayerCornerSolved(state, id)) &&
    SECOND_LAYER_EDGE_IDENTITIES.every((id) => isSecondLayerEdgeSolved(state, id))
  )
}

function twistCornerInPlace(flat: FaceletColor[], slot: number, turns: 1 | 2) {
  const [p0, p1, p2] = CORNER_FACELETS[slot]!
  const c0 = flat[p0]!
  const c1 = flat[p1]!
  const c2 = flat[p2]!
  const rotated = turns === 1 ? [c2, c0, c1] : [c1, c2, c0]
  flat[p0] = rotated[0]!
  flat[p1] = rotated[1]!
  flat[p2] = rotated[2]!
}

/** Every legal corner-twist pattern across the 4 D-layer corner slots
 * (twist sum ≡ 0 mod 3) — all 27 combinations. */
function everyLegalTwistPattern(): number[][] {
  const patterns: number[][] = []
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      for (let c = 0; c < 3; c++) {
        const d = (3 - ((a + b + c) % 3)) % 3
        patterns.push([a, b, c, d])
      }
    }
  }
  return patterns
}

function twistFixture(pattern: readonly number[]) {
  const solved = createSolvedCube()
  const flat = flattenFacelets(solved)
  pattern.forEach((t, i) => {
    if (t !== 0) twistCornerInPlace(flat, LAST_LAYER_CORNER_SLOTS[i]!, t as 1 | 2)
  })
  return unflattenFacelets(flat, 3)
}

describe('cornerOrientationStepMoves', () => {
  it('derives a non-empty algorithm', () => {
    expect(cornerOrientationStepMoves().length).toBeGreaterThan(0)
  })

  it('returns a fresh copy each call', () => {
    const a = cornerOrientationStepMoves()
    const b = cornerOrientationStepMoves()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })

  it('preserves the first two layers and last-layer edge orientation when applied to solved', () => {
    const solved = createSolvedCube()
    const result = applyMoves(solved, cornerOrientationStepMoves())
    expect(isFirstTwoLayersSolved(result)).toBe(true)
    expect(areAllLastLayerEdgesOriented(result)).toBe(true)
  })
})

describe('round-level search convergence: every legal corner-twist pattern', () => {
  /** Mirrors `lastLayerOrientation.ts`'s own bounded round search, kept
   * self-contained here so this file can assert the step algorithm's
   * fundamental property (repeated, rotation-varied application always
   * converges) independent of the orchestration module. */
  function solveViaRoundSearch(state: ReturnType<typeof createSolvedCube>, maxDepth = 8): Move[] | null {
    const step = cornerOrientationStepMoves()
    type Node = { state: typeof state; path: (0 | 1 | 2 | 3)[] }
    let frontier: Node[] = [{ state, path: [] }]
    const seen = new Set<string>([flattenFacelets(state).join(',')])
    for (let depth = 0; depth < maxDepth; depth++) {
      const next: Node[] = []
      for (const node of frontier) {
        for (const turns of [0, 1, 2, 3] as const) {
          const rotated = turns === 0 ? node.state : applyMoves(node.state, [{ face: 'D', turns }])
          const applied = applyMoves(rotated, step)
          if (areAllLastLayerCornersOriented(applied)) {
            let moves: Move[] = []
            for (const t of [...node.path, turns]) {
              const r: Move[] = t === 0 ? [] : [{ face: 'D', turns: t }]
              moves = moves.concat(r, step)
            }
            return moves
          }
          const key = flattenFacelets(applied).join(',')
          if (seen.has(key)) continue
          seen.add(key)
          next.push({ state: applied, path: [...node.path, turns] })
        }
      }
      frontier = next
    }
    return null
  }

  it('all 27 legal twist patterns converge, solving corners while preserving the first two layers and edge orientation', () => {
    const patterns = everyLegalTwistPattern()
    expect(patterns).toHaveLength(27)

    for (const pattern of patterns) {
      const fixture = twistFixture(pattern)
      expect(isFirstTwoLayersSolved(fixture)).toBe(true)
      expect(areAllLastLayerEdgesOriented(fixture)).toBe(true)

      const moves = solveViaRoundSearch(fixture)
      expect(moves).not.toBeNull()
      const result = applyMoves(fixture, moves!)

      expect(areAllLastLayerCornersOriented(result)).toBe(true)
      expect(isFirstTwoLayersSolved(result)).toBe(true)
      expect(areAllLastLayerEdgesOriented(result)).toBe(true)
    }
  })
})
