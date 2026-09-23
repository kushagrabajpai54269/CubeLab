import type { CubeState, Face } from '../../cube/types'
import { createSolvedCube, flattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import {
  LAST_LAYER_CORNER_SLOTS,
  areAllLastLayerCornersOriented,
  sideFacesOfCornerSlot,
  areAllLastLayerEdgesOriented,
} from './lastLayerGeometry'

/**
 * Last-Layer Corner Orientation algorithms (Phase C, Subsystem 5), derived
 * and self-checked with the same D-027/D-045 discipline as every other
 * algorithm module in this stage.
 *
 * This follows the classic "repeated Sune" technique: derive exactly ONE
 * general corner-orientation "step" algorithm (found by searching forward
 * from the solved cube for the first reachable, edge-preserving corner
 * disturbance and inverting it -- see `deriveCornerOrientationAlgorithm`),
 * then at solve time apply it at whichever of the 4 D-rotation offsets
 * improves the oriented-corner count most, inside a cycle-detected round
 * loop (`lastLayerOrientation.ts`). This deliberately does NOT attempt to
 * hand-classify the ~7 named OLL corner sub-cases (Sune, Anti-Sune, Pi,
 * H, etc.) -- the same "cycle detection is the actual termination
 * guarantee, not a hand-proved case list" principle Subsystem 4 (D-049)
 * already established for this codebase applies here too.
 *
 * The algorithm's own goal test requires more than "some corner became
 * oriented" -- per this subsystem's own most important correctness rule,
 * it also requires the full first two layers preserved AND every
 * last-layer edge remain ORIENTED (not necessarily in the same position:
 * edge permutation is Subsystem 6 (PLL)'s job, not this stage's).
 * Without that second half of the goal test, a candidate that disturbs
 * corners by coincidentally re-scrambling an edge orientation Subsystem
 * 5's own earlier step already fixed would be wrongly accepted -- exactly
 * the D-046/D-048 class of bug this codebase has hit before.
 *
 * An earlier version of this derivation hand-translated the well-known
 * Sune algorithm (R U R' U R U2 R') by substituting D for U and one own
 * face for R, and verified it against the real Move Engine per this
 * project's rules -- but that verification is exactly what caught the
 * problem: the translated sequence disturbed last-layer edges, because U
 * sits on top and D sits on the bottom, so per the D-039 chirality lesson
 * the substitution isn't as innocent as it looks. Searching forward from
 * solved for a state that already satisfies "edges remain oriented" and
 * inverting it sidesteps that translation risk entirely.
 */

/** The fixed D-layer corner slot whose 2 own side faces (plus D) form the
 * 3-generator move set every corner-orientation algorithm is searched
 * over -- deliberately just "the first D-layer corner slot" in table
 * order, not a hand-picked "nice" one, so nothing here depends on a
 * convention beyond what `LAST_LAYER_CORNER_SLOTS` itself already
 * establishes. */
const CANONICAL_SLOT = LAST_LAYER_CORNER_SLOTS[0]!
const [CANONICAL_OWN_FACE_1, CANONICAL_OWN_FACE_2] = sideFacesOfCornerSlot(CANONICAL_SLOT)

const SEARCH_FACES: readonly Face[] = ['D', CANONICAL_OWN_FACE_1, CANONICAL_OWN_FACE_2]
const CANDIDATE_MOVES: readonly Move[] = SEARCH_FACES.flatMap((face) =>
  ([1, 2, 3] as const).map((turns) => ({ face, turns }))
)

function isFirstTwoLayersSolved(state: CubeState): boolean {
  return (
    WHITE_CROSS_EDGE_IDENTITIES.every((id) => isWhiteCrossEdgeSolved(state, id)) &&
    FIRST_LAYER_CORNER_IDENTITIES.every((id) => isFirstLayerCornerSolved(state, id)) &&
    SECOND_LAYER_EDGE_IDENTITIES.every((id) => isSecondLayerEdgeSolved(state, id))
  )
}

function fullStateKey(state: CubeState): string {
  return flattenFacelets(state).join(',')
}

const INVERSE_TURNS: Record<1 | 2 | 3, 1 | 2 | 3> = { 1: 3, 2: 2, 3: 1 }

/** The move sequence that exactly undoes `moves`, applied in reverse
 * order -- standard group-theory inverse-of-a-word, used below to turn a
 * genuine forward path (solved -> disturbed) into a genuine solving
 * algorithm (disturbed -> solved) that is reachable by construction. */
function inverseOf(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map((m) => ({ face: m.face, turns: INVERSE_TURNS[m.turns] }))
}

/**
 * Iterative-deepening DFS *forward* from the solved cube, using only
 * `{D, own1, own2}` of `CANONICAL_SLOT`, searching for the first
 * (shortest) reachable state where the first two layers and every
 * last-layer edge remain exactly as solved, but at least one D-layer
 * corner is disturbed. The returned algorithm is the *inverse* of that
 * path -- guaranteed reachable by construction, and guaranteed
 * edge-neutral by the search's own goal test, unlike a hand-substituted
 * "D for U" translation of the well-known Sune algorithm: an earlier
 * attempt at exactly that (own1 D own1' D own1 D2 own1', the direct
 * per-move substitution of D for Sune's U) was verified against the real
 * Move Engine and found to disturb last-layer edges -- U sits on top and
 * D sits on the bottom, so per the D-039 chirality lesson, the two
 * aren't interchangeable by naive substitution and the edge-neutral
 * property Sune relies on doesn't automatically carry over. Searching
 * forward for a state that already satisfies "edges remain oriented"
 * and inverting sidesteps that translation risk entirely, the same way
 * `deriveEdgeOrientationAlgorithm` sidesteps assuming notation for edge
 * orientation.
 *
 * This deliberately does not require the *canonical* slot specifically
 * to be the one left untouched -- only that first two layers and edges
 * are preserved and something about corner orientation actually changed.
 * Whichever D corner(s) end up disturbed is exactly the case the derived
 * algorithm handles; `lastLayerOrientation.ts`'s round loop (greedy
 * pick + D-rotation alignment + cycle detection) is what generalizes a
 * single such algorithm to solve arbitrary starting corner-orientation
 * patterns, mirroring how Subsystem 4 generalized a single per-target
 * algorithm via its own greedy round loop rather than hand-enumerating
 * every case.
 */
function deriveCornerOrientationAlgorithm(maxDepth: number): Move[] {
  const solved = createSolvedCube()

  function goalReached(state: CubeState): boolean {
    if (!isFirstTwoLayersSolved(state)) return false
    // Edges need only remain ORIENTED, not stay in the same position --
    // permutation is Subsystem 6 (PLL)'s job, not this stage's. Requiring
    // full position preservation here was an earlier, stricter attempt
    // that made the search unable to find anything within a practical
    // depth; orientation-only is both the actual requirement and easily
    // reachable.
    if (!areAllLastLayerEdgesOriented(state)) return false
    // dCornerTwist turned out not to be reliably slot-invariant (a pure
    // D turn -- which physically never twists a corner, only permutes --
    // was found, empirically, to register nonzero twist at slots other
    // than a piece's own home slot). isLastLayerCornerOriented reads the
    // D-facelet color directly and has no such dependency, and a boolean
    // "did the oriented-corner count drop" is all this search actually
    // needs -- the exact twist direction is never used downstream.
    return !areAllLastLayerCornersOriented(state)
  }

  function dfs(
    state: CubeState,
    path: Move[],
    depthRemaining: number,
    lastFace: Face | null,
    visited: Set<string>
  ): Move[] | null {
    if (path.length > 0 && goalReached(state)) return path
    if (depthRemaining === 0) return null
    for (const m of CANDIDATE_MOVES) {
      if (m.face === lastFace) continue
      const ns = applyMoves(state, [m])
      const key = fullStateKey(ns)
      if (visited.has(key)) continue
      visited.add(key)
      const result = dfs(ns, [...path, m], depthRemaining - 1, m.face, visited)
      if (result) return result
      visited.delete(key)
    }
    return null
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    const visited = new Set<string>([fullStateKey(solved)])
    const forwardPath = dfs(solved, [], depth, null, visited)
    if (forwardPath) return inverseOf(forwardPath)
  }
  throw new Error(`deriveCornerOrientationAlgorithm: no reachable orientation-preserving disturbance found within depth ${maxDepth}`)
}

/**
 * A single precomputed, self-verified corner-orientation "step"
 * algorithm, computed once at module load. `lastLayerOrientation.ts`
 * applies this (at each of 4 possible D-rotation offsets, greedily
 * picking whichever offset improves the oriented-corner count) inside a
 * cycle-detected round loop -- the same "one general step + rotate +
 * greedy pick + cycle-detected loop" shape Subsystem 4 (D-049) already
 * established, rather than hand-classifying every named OLL corner case.
 */
const CORNER_ORIENTATION_STEP_MOVES: readonly Move[] = deriveCornerOrientationAlgorithm(8)

export function cornerOrientationStepMoves(): Move[] {
  return [...CORNER_ORIENTATION_STEP_MOVES]
}
