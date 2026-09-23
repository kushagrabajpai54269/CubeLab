import type { CubeState, Face, FaceletColor } from '../../cube/types'
import { createSolvedCube, flattenFacelets, unflattenFacelets } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { EDGE_FACELETS } from '../../cube/tables'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, isSecondLayerEdgeSolved } from './secondLayerGeometry'
import {
  LAST_LAYER_EDGE_SLOTS,
  LAST_LAYER_EDGE_SLOT_OF_FACE,
  sideFaceOfEdgeSlot,
  isLastLayerEdgeOriented,
  areAllLastLayerEdgesOriented,
  oppositeSideFaceOf,
} from './lastLayerGeometry'

/**
 * Last-Layer Edge Orientation algorithms (Phase C, Subsystem 5), derived
 * and self-checked with the same D-027/D-045 discipline as every earlier
 * subsystem's algorithm modules: nothing here is trusted from memorized
 * cube notation.
 *
 * The edge-orientation parity invariant means exactly 0, 2, or 4 of the 4
 * D-layer edges can be oriented at once (an odd count is not physically
 * reachable) -- so, up to a D rotation, there are exactly 3 cases: "Dot"
 * (0 oriented), "Line" (2 oriented, on opposite side faces), and "L-shape"
 * (2 oriented, on adjacent side faces). Fully solved (4 oriented) needs no
 * algorithm at all.
 *
 * Each of the 3 cases is derived once, at module load, by a bounded search
 * over the {D, F, R} generator set (mirroring the classic technique of
 * orienting edges using only 2 side faces plus the last-layer face) from a
 * genuine isolated fixture -- last two layers solved, D-layer edges
 * flipped into exactly that pattern via direct facelet construction (an
 * even number of flips, so always a physically legal state) -- and
 * self-checked by confirming the returned moves genuinely reach "all 4
 * D-layer edges oriented" AND leave the first two layers solved, not
 * merely that the search's own bookkeeping thinks so.
 */

const SEARCH_FACES: readonly Face[] = ['D', 'F', 'R']
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

/** Exact full-state key for BFS dedup -- correctness over cleverness: a
 * reduced key risks silently merging two states that are actually
 * different (and therefore have different future reachability), which is
 * exactly the false-negative risk `cornerInsertionAlgorithms.ts`'s own
 * `reducedKey` docstring warns about. The full 54-facelet string is cheap
 * to compute and removes that risk entirely. */
function fullStateKey(state: CubeState): string {
  return flattenFacelets(state).join(',')
}

function flipEdgeInPlace(flat: FaceletColor[], slot: number): void {
  const [p0, p1] = EDGE_FACELETS[slot]!
  const c0 = flat[p0]!
  const c1 = flat[p1]!
  flat[p0] = c1
  flat[p1] = c0
}

/** Constructs a real, isolated "first two layers solved, D-layer edges
 * flipped everywhere except `orientedSlots`" CubeState directly via
 * facelet manipulation -- same surgical-construction pattern
 * `cornerInsertionAlgorithms.ts`'s `constructIsolatedAlignedState` uses,
 * for the same reason: the *algorithm* is entirely search-derived and
 * self-verified below; only the throwaway fixture it's checked against is
 * built directly. */
function constructEdgeOrientationFixture(orientedSlots: ReadonlySet<number>): CubeState {
  const solved = createSolvedCube()
  const flat = flattenFacelets(solved)
  for (const slot of LAST_LAYER_EDGE_SLOTS) {
    if (!orientedSlots.has(slot)) flipEdgeInPlace(flat, slot)
  }
  return unflattenFacelets(flat, 3)
}

/**
 * Iterative-deepening DFS from a genuine isolated fixture to "all 4
 * D-layer edges oriented AND first two layers solved" -- the goal test
 * that actually matters, not merely "target pattern gone". IDDFS (rather
 * than plain BFS) keeps memory bounded to the recursion stack plus one
 * per-attempt visited set, instead of materializing an entire frontier of
 * full `CubeState` objects at once, which is what made a first attempt at
 * this (kept in `git blame`, not in this file) run out of heap at depth 8.
 *
 * Never applying the same face twice in a row is a sound pruning, not a
 * heuristic shortcut: two consecutive turns of the same face always
 * reduce to one single turn of that face (1+1=2, 1+2=3=-1, 2+2=1-turn-
 * inverse, etc.), so a shortest solution never needs it -- excluding it
 * cannot exclude an optimal path, only redundant ones.
 */
function deriveEdgeOrientationAlgorithm(orientedSlots: ReadonlySet<number>, maxDepth: number): Move[] {
  const start = constructEdgeOrientationFixture(orientedSlots)

  function dfs(state: CubeState, path: Move[], depthRemaining: number, lastFace: Face | null, visited: Set<string>): Move[] | null {
    if (path.length > 0 && isFirstTwoLayersSolved(state) && areAllLastLayerEdgesOriented(state)) {
      return path
    }
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
    const visited = new Set<string>([fullStateKey(start)])
    const result = dfs(start, [], depth, null, visited)
    if (result) return result
  }
  throw new Error(`deriveEdgeOrientationAlgorithm: no fully-preserving solving sequence found within depth ${maxDepth}`)
}

export type EdgeOrientationCase = 'dot' | 'line' | 'lshape'
/** The 2 cases with an actual derived algorithm -- 'dot' has none of its
 * own; see `lastLayerOrientation.ts` for why (it's solved by reducing to
 * one of these two, not from scratch). */
export type SolvableEdgeOrientationCase = 'line' | 'lshape'

/**
 * Canonical oriented-face sets for each case, fixed once so the algorithm
 * table and the solve-time rotation-alignment logic (`lastLayerOrientation
 * .ts`) always agree on what "canonical" means.
 */
const CANONICAL_ORIENTED_FACES: Record<EdgeOrientationCase, readonly Face[]> = {
  dot: [],
  line: ['F', 'B'],
  lshape: ['F', 'R'],
}

function canonicalOrientedSlots(kase: SolvableEdgeOrientationCase): ReadonlySet<number> {
  const faces = CANONICAL_ORIENTED_FACES[kase]
  return new Set(faces.map((f) => LAST_LAYER_EDGE_SLOT_OF_FACE.get(f)!))
}

/**
 * Precomputed, self-verified algorithms, keyed by case. Computed once at
 * module load (2 entries) rather than re-searched on every solve.
 */
const EDGE_ORIENTATION_ALGORITHMS: Readonly<Record<SolvableEdgeOrientationCase, readonly Move[]>> = {
  lshape: deriveEdgeOrientationAlgorithm(canonicalOrientedSlots('lshape'), 7),
  line: deriveEdgeOrientationAlgorithm(canonicalOrientedSlots('line'), 7),
}

export function edgeOrientationAlgorithm(kase: SolvableEdgeOrientationCase): Move[] {
  return [...EDGE_ORIENTATION_ALGORITHMS[kase]]
}

function orientedFacesOf(state: CubeState): Set<Face> {
  const result = new Set<Face>()
  for (const slot of LAST_LAYER_EDGE_SLOTS) {
    if (isLastLayerEdgeOriented(state, slot)) result.add(sideFaceOfEdgeSlot(slot))
  }
  return result
}

/**
 * Classifies the current D-layer edge-orientation pattern and, for the
 * `line`/`lshape` cases, how many quarter D-turns are needed to align the
 * actual oriented faces onto the canonical ones the stored algorithm was
 * derived against.
 *
 * The alignment is found empirically against the real Move Engine --
 * actually applying 0..3 D turns to `state` and checking which one
 * produces the canonical oriented-face set -- rather than assumed from a
 * hand-typed rotation ring. Per the D-039 chirality lesson, which
 * direction a D turn cycles the 4 side faces is exactly the kind of fact
 * that must be read from the engine, not guessed from notation. Returns
 * `null` for the already-solved (4 oriented) case -- there is nothing to
 * align or apply.
 */
export function classifyEdgeOrientation(
  state: CubeState
): { kase: EdgeOrientationCase; dTurns: 0 | 1 | 2 | 3 } | null {
  const orientedFaces = orientedFacesOf(state)
  if (orientedFaces.size === 4) return null
  if (orientedFaces.size === 0) return { kase: 'dot', dTurns: 0 }

  const [a, b] = [...orientedFaces] as [Face, Face]
  const isOpposite = oppositeSideFaceOf(a) === b
  const kase: EdgeOrientationCase = isOpposite ? 'line' : 'lshape'
  const canonicalSet = new Set(CANONICAL_ORIENTED_FACES[kase])

  for (const turns of [0, 1, 2, 3] as const) {
    const rotated = turns === 0 ? state : applyMoves(state, [{ face: 'D', turns: turns as 1 | 2 | 3 }])
    const rotatedFaces = orientedFacesOf(rotated)
    if (rotatedFaces.size === canonicalSet.size && [...rotatedFaces].every((f) => canonicalSet.has(f))) {
      return { kase, dTurns: turns }
    }
  }
  throw new Error('classifyEdgeOrientation: could not align current pattern to a canonical case')
}
