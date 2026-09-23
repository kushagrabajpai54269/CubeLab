import type { CubeState, Face } from '../../cube/types'
import { applyMoves, type Move } from '../../cube/moves'
import {
  ownFacesOfCorner,
  currentCornerSlotOf,
  layerOfCornerSlot,
  cornerFacesOfSlot,
  isFirstLayerCornerSolved,
} from './cornerGeometry'

/**
 * Corner eject and align (Phase C, Subsystem 3). `ejectMoves` gets a
 * target corner into the D-layer, any facing — facing is
 * `cornerInsertionMoves.ts`'s concern. `alignmentMoves` then rotates the
 * D-layer so the target's column lines up with its own 2 faces.
 *
 * Corners are structurally simpler than edges here: there is no
 * "E-layer" case. Only one U-layer slot per target — the one touching
 * neither of its own 2 faces (diagonally opposite) — requires a genuine
 * foreign-face choice; the other 2 misplaced-U-layer slots (each sharing
 * exactly one own face) and the "own slot, wrong orientation" case are
 * always reachable via an own face alone.
 */

export function isFaceHomeSolvedCorner(state: CubeState, face: Face, allTargets: readonly number[]): boolean {
  const owner = allTargets.find((id) => ownFacesOfCorner(id).includes(face))
  if (owner === undefined) return false
  return isFirstLayerCornerSolved(state, owner)
}

function tryReachDLayer(state: CubeState, identity: number, face: Face): Move[] | null {
  for (const turns of [1, 3] as const) {
    const once = applyMoves(state, [{ face, turns }])
    if (layerOfCornerSlot(currentCornerSlotOf(once, identity)) === 'D') return [{ face, turns }]
  }
  for (const turns of [1, 3] as const) {
    const once = applyMoves(state, [{ face, turns }])
    const twice = applyMoves(once, [{ face, turns }])
    if (layerOfCornerSlot(currentCornerSlotOf(twice, identity)) === 'D') return [{ face, turns }, { face, turns }]
  }
  return null
}

/**
 * Moves `identity` into the D-layer (any facing, any column). Returns
 * `[]` if already there.
 *
 * - Own slot (wrong orientation) or a U-layer slot sharing exactly one own
 *   face: eject via that own/shared face. Always safe — that face's only
 *   first-layer home is either this identity itself (not yet solved) or
 *   simply not this face's own corner at all, so it can never disturb a
 *   different, already-placed corner (the same pigeonhole argument
 *   `ejectMoves` for edges relies on, D-046).
 * - The diagonally-opposite U-layer slot (touches neither own face): a
 *   genuine foreign-face choice exists. Prefer whichever candidate is not
 *   a currently-solved corner's home face.
 */
export function ejectCornerMoves(state: CubeState, identity: number, allTargets: readonly number[]): Move[] {
  const [own1, own2] = ownFacesOfCorner(identity)
  const slot = currentCornerSlotOf(state, identity)
  const layer = layerOfCornerSlot(slot)
  if (layer === 'D') return []

  const faces = cornerFacesOfSlot(slot).filter((f): f is Face => f !== 'U')
  const touchesOwn1 = faces.includes(own1)
  const touchesOwn2 = faces.includes(own2)

  let candidates: Face[]
  if (touchesOwn1 || touchesOwn2) {
    // Own slot (both true) or a slot sharing exactly one own face: use
    // whichever own face the current slot actually touches.
    candidates = touchesOwn1 ? [own1] : [own2]
  } else {
    // Diagonally opposite slot: genuine choice between the 2 non-own faces.
    const [foreign1, foreign2] = faces
    const preferred = !isFaceHomeSolvedCorner(state, foreign1!, allTargets) ? foreign1!
      : !isFaceHomeSolvedCorner(state, foreign2!, allTargets) ? foreign2!
      : foreign1!
    candidates = [preferred, preferred === foreign1 ? foreign2! : foreign1!]
  }

  for (const face of candidates) {
    const found = tryReachDLayer(state, identity, face)
    if (found) return found
  }
  throw new Error(`ejectCornerMoves: could not reach D-layer for identity ${identity} from slot ${slot}`)
}

/**
 * Rotates the D-layer (0-3 quarter turns) so `identity`'s column lines up
 * with both of its own faces. Precondition: already in the D-layer.
 */
export function alignCornerMoves(state: CubeState, identity: number): Move[] {
  const [own1, own2] = ownFacesOfCorner(identity)
  const isAligned = (s: CubeState) => {
    const faces = cornerFacesOfSlot(currentCornerSlotOf(s, identity))
    return faces.includes(own1) && faces.includes(own2)
  }
  if (isAligned(state)) return []
  for (const turns of [1, 2, 3] as const) {
    if (isAligned(applyMoves(state, [{ face: 'D', turns }]))) return [{ face: 'D', turns }]
  }
  throw new Error(`alignCornerMoves: could not align identity ${identity} under its own column`)
}
