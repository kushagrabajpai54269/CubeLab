import type { CubeState, Face, FaceletColor } from '../../cube/types'
import { createSolvedCube, cloneCubeState, faceletAt } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { EDGE_FACELETS } from '../../cube/tables'
import { SOLVED_EDGE_COLORS } from '../../cube/pieces'
import { facesOfSlot, WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved } from './geometry'
import { FIRST_LAYER_CORNER_IDENTITIES, isFirstLayerCornerSolved } from './cornerGeometry'
import { SECOND_LAYER_EDGE_IDENTITIES, ownColorForFace, isSecondLayerEdgeSolved } from './secondLayerGeometry'

/**
 * D-layer second-layer-edge insertion algorithms (Phase C, Subsystem 4),
 * derived and self-checked with the same D-027/D-045/D-047 discipline as
 * every earlier stage: nothing here is trusted from memorized cube
 * notation, even though a "U R U' R' U' F' U F"-shaped algorithm is
 * extremely well known for this exact problem. Two things specifically
 * are NOT assumed and are instead verified against this codebase's real
 * Move Engine: (1) which 3 faces the algorithm needs at all (here: D plus
 * both of the target's own faces — this stage's free layer is D, not U,
 * since first-layer solving in this codebase works from D upward, D-046),
 * and (2) the exact sequence, which is searched for and self-checked by
 * actually solving a real constructed `CubeState`, not copied from a
 * memorized notation string.
 *
 * A "matched" D-layer edge (`matchedFaceAtSlot`, `secondLayerGeometry.ts`)
 * has exactly one own face it's adjacent to; the algorithm is keyed by
 * that (matchedFace, otherOwnFace) pair. Search space: bounded iterative
 * deepening (depth 1..9) over {matchedFace, otherOwnFace, D}, first
 * restricted to quarter turns only (this problem's well-known solutions
 * use no half turns, and restricting to quarter turns first is a search
 * cost optimization, not an assumption about the *content* of the
 * algorithm — full turns are retried as a fallback if quarter-turns-only
 * ever fails to find anything within the depth bound). The goal test
 * requires the target solved AND both second-layer siblings sharing an
 * own face with it AND the full first layer (cross + corners) preserved —
 * not merely "target solved", per D-046/D-048's shared lesson that a
 * weaker goal test can find a short sequence that coincidentally solves
 * the target while leaving a real oscillation-causing disturbance behind.
 */

const QUARTER_TURNS = [1, 3] as const
const ALL_TURNS = [1, 2, 3] as const
const MAX_DEPTH = 9

/** The 2 other second-layer edges sharing exactly one own face with
 * `identity` — the pieces (beyond the target itself) a fully-preserving
 * insertion algorithm must not disturb, mirroring `siblingIdentities` in
 * `cornerInsertionAlgorithms.ts`. */
function siblingIdentities(identity: number, own1: Face, own2: Face): number[] {
  return SECOND_LAYER_EDGE_IDENTITIES.filter(
    (id) => id !== identity && (facesOfSlot(id).includes(own1) || facesOfSlot(id).includes(own2))
  )
}

function allPreserved(state: CubeState, identity: number, siblings: readonly number[]): boolean {
  if (!isSecondLayerEdgeSolved(state, identity)) return false
  for (const sib of siblings) {
    if (!isSecondLayerEdgeSolved(state, sib)) return false
  }
  for (const cid of FIRST_LAYER_CORNER_IDENTITIES) {
    if (!isFirstLayerCornerSolved(state, cid)) return false
  }
  for (const eid of WHITE_CROSS_EDGE_IDENTITIES) {
    if (!isWhiteCrossEdgeSolved(state, eid)) return false
  }
  return true
}

/**
 * Constructs a real, isolated "D-layer, matched at `matchedFace`"
 * CubeState for `identity` directly via facelet manipulation (the same
 * surgical-construction pattern `cornerInsertionAlgorithms.ts` uses):
 * target's true colors placed at the D-slot adjacent to `matchedFace`
 * (matched: `matchedFace`'s own color on the `matchedFace` facelet,
 * `otherFace`'s own color on the D facelet), its vacated home slot filled
 * with that D-slot's original solved colors, everything else genuinely
 * solved — so both siblings, the full white cross, and the full first
 * layer are all independently, actually solved in the fixture, not just
 * assumed to be.
 */
function constructIsolatedMatchedState(identity: number, matchedFace: Face, otherFace: Face): CubeState {
  const solved = createSolvedCube()
  const state = cloneCubeState(solved)

  const dSlot = [4, 5, 6, 7].find((slot) => facesOfSlot(slot).includes(matchedFace))!
  const homeSlot = identity
  const homeFacelets = EDGE_FACELETS[homeSlot]!
  const dFacelets = EDGE_FACELETS[dSlot]!
  const dFaces = facesOfSlot(dSlot)

  const setFacelet = (flat: number, color: FaceletColor) => {
    const { face, facelet } = faceletAt(flat, 3)
    ;(state.facelets[face] as FaceletColor[])[facelet] = color
  }
  const solvedColorAt = (flat: number): FaceletColor => {
    const { face, facelet } = faceletAt(flat, 3)
    return solved.facelets[face][facelet]!
  }

  const matchedColor = ownColorForFace(identity, matchedFace)
  const otherColor = ownColorForFace(identity, otherFace)
  dFacelets.forEach((flat, i) => {
    setFacelet(flat, dFaces[i] === matchedFace ? matchedColor : otherColor)
  })
  // Vacated home slot gets the D-slot's original solved colors (a clean
  // swap), keeping everything else in the fixture genuinely solved.
  homeFacelets.forEach((flat, i) => setFacelet(flat, solvedColorAt(dFacelets[i]!)))

  return state
}

/**
 * Bounded iterative-deepening search for the shortest {matchedFace,
 * otherFace, D} sequence that solves `identity` from its isolated matched
 * fixture AND preserves both siblings and the full first layer — the goal
 * test that actually matters (see module docstring). Tries quarter turns
 * only first (cheap, and this problem's known solutions never need a half
 * turn); falls back to the full turn set only if that search space is
 * ever exhausted without finding anything.
 */
function deriveInsertion(identity: number, matchedFace: Face, otherFace: Face): Move[] {
  const siblings = siblingIdentities(identity, matchedFace, otherFace)
  const setupState = constructIsolatedMatchedState(identity, matchedFace, otherFace)
  const moveFaces: Face[] = [matchedFace, otherFace, 'D']

  function search(turnSet: readonly (1 | 2 | 3)[]): Move[] | null {
    let found: Move[] | null = null
    function dfs(state: CubeState, path: Move[], depth: number, lastFace: Face | null): boolean {
      if (depth === 0) {
        if (path.length > 0 && allPreserved(state, identity, siblings)) {
          found = path
          return true
        }
        return false
      }
      for (const face of moveFaces) {
        if (face === lastFace) continue
        for (const turns of turnSet) {
          const next = applyMoves(state, [{ face, turns }])
          if (dfs(next, [...path, { face, turns }], depth - 1, face)) return true
        }
      }
      return false
    }
    for (let maxDepth = 1; maxDepth <= MAX_DEPTH; maxDepth++) {
      if (dfs(setupState, [], maxDepth, null)) return found
    }
    return null
  }

  const quarterTurnResult = search(QUARTER_TURNS)
  if (quarterTurnResult) return quarterTurnResult
  const fullResult = search(ALL_TURNS)
  if (fullResult) return fullResult
  throw new Error(
    `deriveInsertion(matched ${matchedFace}, other ${otherFace}): no fully-preserving solving sequence found within depth ${MAX_DEPTH}`
  )
}

/**
 * Self-verifies a derived algorithm against a *fresh* isolated fixture
 * (never the same CubeState object the search already mutated a view of),
 * confirming it both solves the target and preserves everything the goal
 * test requires — module load fails loudly if this ever doesn't hold,
 * rather than silently trusting the search's own bookkeeping.
 */
function verify(identity: number, matchedFace: Face, otherFace: Face, moves: readonly Move[]): void {
  const siblings = siblingIdentities(identity, matchedFace, otherFace)
  const fixture = constructIsolatedMatchedState(identity, matchedFace, otherFace)
  const result = applyMoves(fixture, [...moves])
  if (!allPreserved(result, identity, siblings)) {
    throw new Error(
      `secondLayerInsertionAlgorithms self-check failed for matched ${matchedFace}, other ${otherFace}: ` +
      'derived sequence does not solve the target while preserving siblings and the first layer.'
    )
  }
}

/**
 * Precomputed, self-verified insertion algorithms, keyed by
 * `${matchedFace}:${otherFace}`. Computed once at module load (8 entries:
 * 4 second-layer identities x 2 own-face orderings each) rather than
 * re-derived on every solve.
 */
const SECOND_LAYER_INSERTIONS: ReadonlyMap<string, readonly Move[]> = (() => {
  const table = new Map<string, readonly Move[]>()
  for (const identity of SECOND_LAYER_EDGE_IDENTITIES) {
    const [faceA, faceB] = facesOfSlot(identity)
    for (const [matchedFace, otherFace] of [[faceA, faceB], [faceB, faceA]] as [Face, Face][]) {
      const key = `${matchedFace}:${otherFace}`
      if (table.has(key)) continue
      const moves = deriveInsertion(identity, matchedFace, otherFace)
      verify(identity, matchedFace, otherFace, moves)
      table.set(key, moves)
    }
  }
  return table
})()

export function secondLayerInsertion(matchedFace: Face, otherFace: Face): Move[] {
  const key = `${matchedFace}:${otherFace}`
  const moves = SECOND_LAYER_INSERTIONS.get(key)
  if (!moves) throw new Error(`secondLayerInsertion: no derived algorithm for ${key}`)
  return [...moves]
}

// SOLVED_EDGE_COLORS is re-exported for tests that want to sanity-check
// fixture construction directly against the same source of truth this
// module derives from.
export { SOLVED_EDGE_COLORS }
