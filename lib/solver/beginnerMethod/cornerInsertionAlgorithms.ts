import type { CubeState, Face, FaceletColor } from '../../cube/types'
import { createSolvedCube, cloneCubeState, faceletAt } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import { CORNER_FACELETS } from '../../cube/tables'
import {
  ownFacesOfCorner,
  cornerFacesOfSlot,
  currentCornerSlotOf,
  whiteFacingFaceOfCornerSlot,
  isFirstLayerCornerSolved,
  FIRST_LAYER_CORNER_IDENTITIES,
} from './cornerGeometry'
import { WHITE_CROSS_EDGE_IDENTITIES, isWhiteCrossEdgeSolved, currentSlotOf, whiteFacingFaceOfSlot } from './geometry'

/**
 * D-layer corner insertion algorithms (Phase C, Subsystem 3), derived and
 * self-checked with the same D-027/D-045 discipline: nothing here is
 * trusted from memorized cube notation.
 *
 * An investigation against this codebase's actual Move Engine found three
 * terminal cases for a corner aligned in the D-layer under its own column:
 *
 * - "Facing own1"/"facing own2": short (3-move) sequences, fully preserving.
 * - "Facing down": NOT a mathematical impossibility to preserve (unlike
 *   edges' analogous case) — but the shortest sequence that merely solves
 *   the *target* corner is a coincidental short "undo" that does NOT
 *   preserve the other two first-layer corners sharing a face with it.
 *   This was found the hard way: an earlier version of this derivation
 *   searched only for "target solved", found a 2-move sequence, and it
 *   caused a genuine infinite oscillation between two corners once wired
 *   into the full solver (mirroring D-046's edge oscillation exactly). The
 *   fix is for the derivation's own goal test to require preservation of
 *   both same-face sibling corners and the full white cross, not just that
 *   the target ends up solved — exactly the property that actually matters.
 *
 * Each is derived by a bounded search once per (own1, own2) pair at module
 * load and self-checked by actually solving a real, isolated, constructed
 * `CubeState` (siblings and cross genuinely independently placed, not a
 * setup/solve pair that happen to be coincidental inverses) before being
 * trusted.
 */

const FACE_TURNS = [1, 2, 3] as const

function isCornerSolvedRelativeTo(state: CubeState, identity: number): boolean {
  const slot = currentCornerSlotOf(state, identity)
  return slot === identity && whiteFacingFaceOfCornerSlot(state, slot) === 'U'
}

/** The two other first-layer corners that each share exactly one own face
 * with `identity` — the pieces a corner-insertion algorithm must not
 * disturb. */
function siblingIdentities(identity: number, own1: Face, own2: Face): [number, number] {
  const sib1 = FIRST_LAYER_CORNER_IDENTITIES.find((id) => id !== identity && ownFacesOfCorner(id).includes(own1))!
  const sib2 = FIRST_LAYER_CORNER_IDENTITIES.find((id) => id !== identity && ownFacesOfCorner(id).includes(own2))!
  return [sib1, sib2]
}

function allPreserved(state: CubeState, identity: number, sib1: number, sib2: number): boolean {
  if (!isCornerSolvedRelativeTo(state, identity)) return false
  if (!isFirstLayerCornerSolved(state, sib1)) return false
  if (!isFirstLayerCornerSolved(state, sib2)) return false
  for (const eid of WHITE_CROSS_EDGE_IDENTITIES) {
    if (!isWhiteCrossEdgeSolved(state, eid)) return false
  }
  return true
}

/** Exact (not lossy-boolean) reduced state for the 7 relevant pieces
 * (target + 2 siblings + 4 cross edges) -- avoids the false-negative risk
 * a boolean "solved?" reduction has (two different not-yet-solved
 * positions can have genuinely different future reachability). */
function reducedKey(state: CubeState, identity: number, sib1: number, sib2: number): string {
  const tSlot = currentCornerSlotOf(state, identity)
  const s1Slot = currentCornerSlotOf(state, sib1)
  const s2Slot = currentCornerSlotOf(state, sib2)
  const parts = [
    `T${tSlot}:${whiteFacingFaceOfCornerSlot(state, tSlot)}`,
    `S1${s1Slot}:${whiteFacingFaceOfCornerSlot(state, s1Slot)}`,
    `S2${s2Slot}:${whiteFacingFaceOfCornerSlot(state, s2Slot)}`,
    ...WHITE_CROSS_EDGE_IDENTITIES.map((eid) => {
      const eSlot = currentSlotOf(state, eid)
      return `E${eid}:${eSlot}:${whiteFacingFaceOfSlot(state, eSlot)}`
    }),
  ]
  return parts.join('|')
}

/** The solved-state color of a face, read directly from a solved cube
 * rather than hardcoded, so this stays correct if the color scheme (D-010)
 * were ever revisited. */
function solvedColorOf(face: Face): FaceletColor {
  const solved = createSolvedCube()
  // Center facelet index for a 3x3 face is 4 (row-major, middle cell).
  return solved.facelets[face][4]!
}

/**
 * Constructs a real, ISOLATED "D-layer, aligned under own column, facing
 * `facing`" CubeState directly via facelet manipulation — target corner's
 * colors placed at the D-layer slot matching (own1, own2) with white on
 * `facing`, its vacated home slot filled with that D-slot's original
 * (solved) colors, and everything else untouched (so both same-face
 * siblings and the full white cross remain genuinely solved). This
 * mirrors the same surgical-construction pattern this codebase's own
 * tests already use (e.g. `validator.test.ts`'s `withCornerTwisted`),
 * rather than an expensive move-based search: the *algorithm* itself is
 * still entirely search-derived and self-verified below — only the
 * throwaway test fixture this derivation checks itself against is built
 * directly, for the same reason validator.test.ts's helpers are.
 */
function constructIsolatedAlignedState(identity: number, own1: Face, own2: Face, facing: Face): CubeState {
  const solved = createSolvedCube()
  const state = cloneCubeState(solved)
  const homeSlot = identity
  const dSlot = [4, 5, 6, 7].find((slot) => {
    const faces = cornerFacesOfSlot(slot)
    return faces.includes(own1) && faces.includes(own2)
  })!

  const homeFacelets = CORNER_FACELETS[homeSlot]!
  const dFacelets = CORNER_FACELETS[dSlot]!

  const setFacelet = (flat: number, color: FaceletColor) => {
    const { face, facelet } = faceletAt(flat, 3)
    ;(state.facelets[face] as FaceletColor[])[facelet] = color
  }
  const colorAt = (flat: number): FaceletColor => {
    const { face, facelet } = faceletAt(flat, 3)
    return solved.facelets[face][facelet]!
  }

  // Target identity's true color set is always {white, own1's solved
  // color, own2's solved color} -- white goes to whichever of the 3
  // positions is `facing`; the other two colors fill the remaining two
  // positions (which specific one goes where doesn't matter -- neither
  // identifyCorner's unordered matching nor whiteFacingFaceOfCornerSlot
  // cares, only which position holds white).
  const colorForFace: Partial<Record<Face, FaceletColor>> = { [facing]: 'white' }
  const remainingFaces: Face[] = ([own1, own2, 'D'] as Face[]).filter((f): f is Face => f !== facing)
  const remainingColors: FaceletColor[] = [solvedColorOf(own1), solvedColorOf(own2)]
  colorForFace[remainingFaces[0]!] = remainingColors[0]!
  colorForFace[remainingFaces[1]!] = remainingColors[1]!

  const dFaces = cornerFacesOfSlot(dSlot)
  dFacelets.forEach((flat, i) => setFacelet(flat, colorForFace[dFaces[i]!]!))
  // Vacated home slot gets the D-slot's original solved colors (a clean
  // swap, keeping overall color counts sane for this local construction).
  homeFacelets.forEach((flat, i) => setFacelet(flat, colorAt(dFacelets[i]!)))

  return state
}

/**
 * Derives the shortest sequence, drawn from {primaryFace, D}, that solves
 * the target from a genuine isolated "aligned, facing `facing`" state
 * AND preserves both same-face siblings and the full white cross — the
 * goal test that actually matters, not merely "target solved".
 */
function deriveAlgorithm(
  identity: number,
  own1: Face,
  own2: Face,
  facing: Face,
  primaryFace: Face,
  maxDepth: number
): Move[] {
  const [sib1, sib2] = siblingIdentities(identity, own1, own2)
  const setupState = constructIsolatedAlignedState(identity, own1, own2, facing)
  const moves: Move[] = [primaryFace, 'D'].flatMap((face) => FACE_TURNS.map((turns) => ({ face: face as Face, turns })))
  type Node = { state: CubeState; path: Move[] }
  let frontier: Node[] = [{ state: setupState, path: [] }]
  const seen = new Set<string>([reducedKey(setupState, identity, sib1, sib2)])
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const node of frontier) {
      if (node.path.length > 0 && allPreserved(node.state, identity, sib1, sib2)) return node.path
    }
    const next: Node[] = []
    for (const node of frontier) {
      for (const m of moves) {
        const ns = applyMoves(node.state, [m])
        const key = reducedKey(ns, identity, sib1, sib2)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ state: ns, path: [...node.path, m] })
      }
    }
    frontier = next
  }
  throw new Error(`deriveAlgorithm(facing ${facing}, primary ${primaryFace}): no fully-preserving solving sequence found within depth ${maxDepth}`)
}

/**
 * Precomputed, self-verified algorithms, keyed by `${own1}:${own2}:${facing}`.
 * Computed once at module load (4 identities x 3 facings = 12 entries)
 * rather than re-searched on every solve.
 */
const CORNER_INSERTIONS: ReadonlyMap<string, readonly Move[]> = (() => {
  const table = new Map<string, readonly Move[]>()
  for (const identity of FIRST_LAYER_CORNER_IDENTITIES) {
    const [own1, own2] = ownFacesOfCorner(identity)
    const key1 = `${own1}:${own2}:${own1}`
    if (!table.has(key1)) table.set(key1, deriveAlgorithm(identity, own1, own2, own1, own1, 4))
    const key2 = `${own1}:${own2}:${own2}`
    if (!table.has(key2)) table.set(key2, deriveAlgorithm(identity, own1, own2, own2, own2, 4))
    const key3 = `${own1}:${own2}:D`
    if (!table.has(key3)) table.set(key3, deriveAlgorithm(identity, own1, own2, 'D', own1, 6))
  }
  return table
})()

export function cornerInsertion(own1: Face, own2: Face, facing: Face): Move[] {
  const key = `${own1}:${own2}:${facing}`
  const moves = CORNER_INSERTIONS.get(key)
  if (!moves) throw new Error(`cornerInsertion: no derived algorithm for ${key}`)
  return [...moves]
}
