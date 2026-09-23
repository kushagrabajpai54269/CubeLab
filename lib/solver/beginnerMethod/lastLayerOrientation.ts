import type { CubeState } from '../../cube/types'
import { flattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import {
  areAllLastLayerEdgesOriented,
  areAllLastLayerCornersOriented,
  isLastLayerOriented,
} from './lastLayerGeometry'
import { classifyEdgeOrientation, edgeOrientationAlgorithm } from './lastLayerEdgeOrientationAlgorithms'
import { cornerOrientationStepMoves } from './lastLayerCornerOrientationAlgorithms'

/**
 * Last-Layer Orientation / 2-look OLL (Phase C, Subsystem 5) — the fourth
 * Beginner Method solving stage, run after White Cross, First-Layer
 * Corners, and Second-Layer Edges. Unlike those 3 stages, this one solves
 * *orientation only*: it deliberately leaves last-layer permutation
 * (which piece sits in which of the 4 D-layer slots) untouched —
 * Subsystem 6 (PLL) is where that gets fixed. See `lastLayerGeometry.ts`'s
 * own docstring for why "solved" here is defined per-slot rather than
 * per-identity, the opposite convention from every earlier stage.
 *
 * Two independent steps, edges then corners:
 *
 * 1. Edge orientation (`lastLayerEdgeOrientationAlgorithms.ts`): the edge
 *    parity invariant means there are only 3 cases up to D rotation (Dot,
 *    Line, L-shape), each solved deterministically in one shot — no loop
 *    needed, since a self-verified algorithm's effect is state-
 *    independent (D-027's core premise). Dot is solved by reducing to
 *    Line/L-shape (apply the L-shape algorithm once) rather than a
 *    from-scratch algorithm, so this step can take 2 applications.
 *
 * 2. Corner orientation (`lastLayerCornerOrientationAlgorithms.ts`): one
 *    general "step" algorithm (a real, engine-verified Sune analogue),
 *    applied at whichever of the 4 D-rotation offsets a small bounded
 *    search finds converges fastest. Pure greedy (always take whichever
 *    single application looks best right now) gets stuck in local optima
 *    for some twist patterns — confirmed empirically: only 5 of the 27
 *    possible corner-twist patterns converge that way. A round-level
 *    search (branching 4 per round — which D offset to apply the step
 *    algorithm at — depth bounded, full-state deduped) reliably finds a
 *    converging sequence instead; this is the same "search + verify
 *    against the real engine" discipline as algorithm derivation itself,
 *    just applied one level up, at solve time instead of module-load
 *    time.
 *
 * The corner step's own algorithm never disturbs edge *orientation*
 * (verified as part of its own derivation's goal test), so running edges
 * first and corners second is safe: corners won't undo what edges already
 * fixed.
 */

const CORNER_ROUND_SEARCH_DEPTH = 8

function stateKey(state: CubeState): string {
  return flattenFacelets(state).join(',')
}

/** Solves last-layer edge orientation. Deterministic, at most 2 algorithm
 * applications (Dot reduces to Line/L-shape, then that case solves
 * directly). Returns `[]` if already solved. */
export function solveLastLayerEdgeOrientation(state: CubeState): Move[] {
  let moves: Move[] = []
  let current = state

  for (let attempt = 0; attempt < 2; attempt++) {
    const info = classifyEdgeOrientation(current)
    if (info === null) return moves // all 4 already oriented

    // Dot has no algorithm of its own -- reduce it by applying the
    // L-shape algorithm (any D alignment works, since Dot is rotation-
    // symmetric) and let the next loop iteration re-classify and solve
    // the resulting Line/L-shape case for real.
    const kase = info.kase === 'dot' ? 'lshape' : info.kase
    const step: Move[] = info.dTurns === 0 ? [] : [{ face: 'D', turns: info.dTurns }]
    step.push(...edgeOrientationAlgorithm(kase))

    moves = moves.concat(step)
    current = applyMoves(current, step)

    if (areAllLastLayerEdgesOriented(current)) return moves
  }

  throw new Error(
    'solveLastLayerEdgeOrientation: last-layer edges still not fully oriented after the expected Dot -> ' +
      'Line/L-shape reduction and solve -- this indicates a genuine defect, not a slow-but-eventual case.'
  )
}

/**
 * Solves last-layer corner orientation via the bounded round-level search
 * described in this module's own docstring. Returns `[]` if already
 * solved.
 */
export function solveLastLayerCornerOrientation(state: CubeState): Move[] {
  if (areAllLastLayerCornersOriented(state)) return []

  const step = cornerOrientationStepMoves()

  type Node = { state: CubeState; path: readonly (0 | 1 | 2 | 3)[] }
  let frontier: Node[] = [{ state, path: [] }]
  const seen = new Set<string>([stateKey(state)])

  for (let depth = 0; depth < CORNER_ROUND_SEARCH_DEPTH; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (const turns of [0, 1, 2, 3] as const) {
        const rotated = turns === 0 ? node.state : applyMoves(node.state, [{ face: 'D', turns }])
        const applied = applyMoves(rotated, step)
        if (areAllLastLayerCornersOriented(applied)) {
          const path = [...node.path, turns]
          let moves: Move[] = []
          let cur = state
          for (const t of path) {
            const r: Move[] = t === 0 ? [] : [{ face: 'D', turns: t }]
            moves = moves.concat(r, step)
            cur = applyMoves(cur, [...r, ...step])
          }
          return moves
        }
        const key = stateKey(applied)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ state: applied, path: [...node.path, turns] })
      }
    }
    frontier = next
  }

  throw new Error(
    `solveLastLayerCornerOrientation: no converging sequence found within ${CORNER_ROUND_SEARCH_DEPTH} rounds -- ` +
      'this indicates a genuine defect, not a slow-but-eventual case.'
  )
}

/**
 * Solves the full Last-Layer Orientation stage: edges, then corners.
 * Deterministic (no cycle-detected outer loop needed, unlike Subsystems
 * 2-4 — neither step here re-disturbs anything the other step, or the
 * completed first two layers, already fixed, so there is nothing for an
 * outer round loop to repair).
 */
export function solveLastLayerOrientation(state: CubeState): Move[] {
  if (isLastLayerOriented(state)) return []

  let moves: Move[] = []
  let current = state

  const edgeMoves = solveLastLayerEdgeOrientation(current)
  moves = moves.concat(edgeMoves)
  current = applyMoves(current, edgeMoves)

  const cornerMoves = solveLastLayerCornerOrientation(current)
  moves = moves.concat(cornerMoves)
  current = applyMoves(current, cornerMoves)

  if (!isLastLayerOriented(current)) {
    throw new Error(
      'solveLastLayerOrientation: last layer not fully oriented after edge and corner orientation steps -- ' +
        'this indicates a genuine defect, not a slow-but-eventual case.'
    )
  }

  return moves
}
