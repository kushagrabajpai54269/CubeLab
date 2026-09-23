import type { CubeState, Face } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import {
  ownFaceOf,
  currentSlotOf,
  layerOfSlot,
  facesOfSlot,
  isWhiteCrossEdgeSolved,
} from './geometry'

/**
 * Eject and align (Phase C, Subsystem 2). `ejectMoves` gets a target edge
 * into the D-layer, in whatever facing it happens to land in — facing is
 * entirely `insertionMoves`' concern, not this module's. `alignmentMoves`
 * then rotates the D-layer so the target's column lines up with its own
 * face. Neither function needs a lookup table: both are small, genuinely
 * computed dispatches over already-derived geometry (`geometry.ts`), never
 * a long if/else chain over the 12 slots.
 */

/**
 * Whether `face`'s home cross edge (if that face belongs to one) is
 * currently correctly solved. Used to prefer not disturbing an
 * already-placed edge when a genuine choice of foreign face exists —
 * without this preference, `insertionMoves`' facing-side case (which
 * shares this same preference logic) can otherwise cause two edges to
 * repeatedly re-disturb each other forever (a real bug found and fixed
 * during this subsystem's design investigation, not a hypothetical one).
 */
export function isFaceHomeSolved(state: CubeState, face: Face, allTargets: readonly number[]): boolean {
  const owner = allTargets.find((id) => ownFaceOf(id) === face)
  if (owner === undefined) return false
  return isWhiteCrossEdgeSolved(state, owner)
}

function tryReachDLayer(state: CubeState, identity: number, face: Face): Move[] | null {
  for (const turns of [1, 3] as const) {
    const once = applyMoves(state, [{ face, turns }])
    if (layerOfSlot(currentSlotOf(once, identity)) === 'D') return [{ face, turns }]
  }
  for (const turns of [1, 3] as const) {
    const once = applyMoves(state, [{ face, turns }])
    const twice = applyMoves(once, [{ face, turns }])
    if (layerOfSlot(currentSlotOf(twice, identity)) === 'D') return [{ face, turns }, { face, turns }]
  }
  return null
}

/**
 * Moves `identity` into the D-layer (any facing, any column — alignment
 * and insertion handle the rest). Returns `[]` if already there.
 *
 * - Already touching own face (U-layer own-slot-flipped, or an E-layer
 *   slot touching own face): eject via own face. Always safe — that
 *   face's only home is this very identity, which isn't solved yet (we're
 *   mid-eject), so this can never disturb a different, already-placed
 *   edge.
 * - U-layer, wrong slot: eject via whichever face the piece currently sits
 *   under. Also always safe, by the same reasoning — a slot can't
 *   simultaneously be occupied by a misplaced piece and be some other
 *   identity's completed home.
 * - E-layer, touching neither own face: a genuine foreign-face choice
 *   exists. Prefer whichever candidate is not a currently-solved edge's
 *   home face.
 */
export function ejectMoves(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  const own = ownFaceOf(identity)
  const slot = currentSlotOf(state, identity)
  const layer = layerOfSlot(slot)
  if (layer === 'D') return []

  const [faceA, faceB] = facesOfSlot(slot)
  const touchesOwn = faceA === own || faceB === own

  let candidates: Face[]
  if (touchesOwn) {
    candidates = [own]
  } else if (layer === 'U') {
    candidates = [faceA === 'U' ? faceB : faceA]
  } else {
    const preferred = !isFaceHomeSolved(state, faceA, allTargets) ? faceA
      : !isFaceHomeSolved(state, faceB, allTargets) ? faceB
      : faceA
    candidates = [preferred, preferred === faceA ? faceB : faceA]
  }

  for (const face of candidates) {
    const found = tryReachDLayer(state, identity, face)
    if (found) return found
  }
  throw new Error(`ejectMoves: could not reach D-layer for identity ${identity} from slot ${slot}`)
}

/**
 * Rotates the D-layer (0-3 quarter turns) so `identity`'s column lines up
 * with its own face. Precondition: `identity` is already in the D-layer
 * (call after `ejectMoves`). A small computed search over the 4 possible
 * turn counts, not a memorized "D rotates columns this way" fact.
 */
export function alignmentMoves(state: CubeState, identity: number): Move[] {
  const own = ownFaceOf(identity)
  const isAligned = (s: CubeState) => facesOfSlot(currentSlotOf(s, identity)).includes(own)
  if (isAligned(state)) return []
  for (const turns of [1, 2, 3] as const) {
    if (isAligned(applyMoves(state, [{ face: 'D', turns }]))) return [{ face: 'D', turns }]
  }
  throw new Error(`alignmentMoves: could not align identity ${identity} under its own column`)
}
