import type { CubeState, Face } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import { facesOfSlot, layerOfSlot, currentSlotOf } from './geometry'
import { ownFacesOfSecondLayerEdge, matchedFaceAtSlot, isSecondLayerEdgeSolved } from './secondLayerGeometry'

/**
 * Second-layer edge eject and align (Phase C, Subsystem 4). Mirrors the
 * eject/align split from Subsystems 2/3 exactly: `ejectSecondLayerEdgeMoves`
 * gets a target into the D-layer, any facing; `alignSecondLayerEdgeMoves`
 * then rotates D until it's "matched" (`matchedFaceAtSlot`,
 * `secondLayerGeometry.ts`) — this stage's analog of "aligned under its
 * own column".
 *
 * Structurally this is closest to the corner eject (2 own faces, so a
 * genuine 3-way slot layout per identity: the own slot itself, 2 slots
 * sharing exactly one own face, and 1 "diagonal" slot sharing neither) —
 * not the single-own-face cross edge case. Unlike corners, though, no eject
 * branch here is claimed to be disturbance-free: every one of a second-
 * layer edge's own faces is shared with *another* second-layer edge target
 * (e.g. L is own to both the LB and LF identities) as well as with 2
 * first-layer corners and 1 white-cross edge, so a single quarter turn of
 * any own face can legitimately disturb any of those. This is expected,
 * not a defect — the same round-robin-plus-cycle-detection architecture
 * from Subsystem 3 (documented lesson: repair every piece type a
 * subsystem might disturb, not just its own targets) is what makes this
 * safe, not a per-branch non-disturbance proof.
 */

export function isFaceHomeSolvedSecondLayer(state: CubeState, face: Face, allTargets: readonly number[]): boolean {
  const owner = allTargets.find((id) => ownFacesOfSecondLayerEdge(id).includes(face))
  if (owner === undefined) return false
  return isSecondLayerEdgeSolved(state, owner)
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
 * Moves `identity` into the D-layer (any facing — `alignSecondLayerEdgeMoves`
 * handles matching). Returns `[]` if already there.
 *
 * - U-layer (only reachable there as a side effect of an earlier
 *   disturbance — first-layer solving never leaves a second-layer target
 *   in U to begin with): the slot touches U plus exactly one side face;
 *   eject via that side face (the only face the slot actually touches
 *   besides U, so there's no choice to make here).
 * - E-layer (own slot flipped, a slot sharing exactly one own face, or the
 *   diagonal slot sharing neither): every E-layer slot touches exactly 2
 *   side faces, and turning *either* one reaches the D-layer — this is a
 *   genuine 2-way choice in all 3 cases, not just the diagonal one. An
 *   earlier version of this eject treated "shares exactly one own face"
 *   as forced to that single own face, reasoning the own face was the
 *   only "relevant" one to consider — but the *other* face touching the
 *   slot is an equally valid eject path, and forcing the own face only
 *   removed the one degree of freedom that lets a placed-aware
 *   preference avoid a genuine 2-target deterministic oscillation (found
 *   by this subsystem's own fuzz testing: two second-layer edges sharing
 *   a face repeatedly re-disturbing each other, exactly the D-046/D-048
 *   pattern). Every branch here therefore prefers whichever of the slot's
 *   2 faces is not a currently-solved second-layer edge's home face.
 */
export function ejectSecondLayerEdgeMoves(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  const slot = currentSlotOf(state, identity)
  const layer = layerOfSlot(slot)
  if (layer === 'D') return []

  const [faceA, faceB] = facesOfSlot(slot)

  let candidates: Face[]
  if (layer === 'U') {
    candidates = [faceA === 'U' ? faceB : faceA]
  } else {
    const preferred = !isFaceHomeSolvedSecondLayer(state, faceA, allTargets) ? faceA
      : !isFaceHomeSolvedSecondLayer(state, faceB, allTargets) ? faceB
      : faceA
    candidates = [preferred, preferred === faceA ? faceB : faceA]
  }

  for (const face of candidates) {
    const found = tryReachDLayer(state, identity, face)
    if (found) return found
  }
  throw new Error(`ejectSecondLayerEdgeMoves: could not reach D-layer for identity ${identity} from slot ${slot}`)
}

/**
 * Rotates the D-layer (0-3 quarter turns) so `identity` is "matched"
 * (`matchedFaceAtSlot`) — its side facelet shows the color that actually
 * belongs to whichever own face it's currently adjacent to. Precondition:
 * already in the D-layer.
 */
export function alignSecondLayerEdgeMoves(state: CubeState, identity: number): Move[] {
  const isMatched = (s: CubeState) => matchedFaceAtSlot(s, identity, currentSlotOf(s, identity)) !== null
  if (isMatched(state)) return []
  for (const turns of [1, 2, 3] as const) {
    if (isMatched(applyMoves(state, [{ face: 'D', turns }]))) return [{ face: 'D', turns }]
  }
  throw new Error(`alignSecondLayerEdgeMoves: could not find a matched D-layer alignment for identity ${identity}`)
}
