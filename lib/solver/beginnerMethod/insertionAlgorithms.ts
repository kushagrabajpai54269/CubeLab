import type { CubeState, Face } from '../../cube/types'
import { createSolvedCube } from '../../cube/state'
import { applyMoves, type Move } from '../../cube/moves'
import {
  ownFaceOf,
  ringNeighborsOf,
  facesOfSlot,
  WHITE_CROSS_EDGE_IDENTITIES,
  currentSlotOf,
  whiteFacingFaceOfSlot,
  layerOfSlot,
} from './geometry'

/**
 * D-layer insertion algorithms (Phase C, Subsystem 2), derived and
 * self-checked with the same discipline `scripts/derive-move-tables.mjs`
 * applies to `BASE_PERMUTATIONS` (D-027): nothing here is trusted from
 * memorized cube notation. An investigation against this codebase's actual
 * Move Engine (not assumed standard notation) found:
 *
 * - "Facing down" (D-layer, aligned under the target column, white on the
 *   D-facelet) is solved by a single half-turn of the target's own face —
 *   the only insertion case that never needs a foreign face.
 *
 * - "Facing side" (D-layer, aligned, white on the *other* facelet) is
 *   fundamentally NOT solvable using only {own face, D} — proven by full
 *   orbit exhaustion under that 2-generator subgroup (the reachable set
 *   from this state has exactly 7 members, and the solved state is never
 *   among them; see the accompanying test file's mechanical re-proof). A
 *   third face — one of the target's 2 ring-neighbors — is unavoidably
 *   required. Both neighbor directions were confirmed to work.
 *
 * Given a genuine 3rd face is unavoidable for "facing side", the exact
 * algorithm is derived by a small bounded search (not memorized) once per
 * (own face, neighbor face) pair at module load, and self-checked by
 * actually solving a real constructed CubeState before being trusted. If a
 * future change to the Move Engine's tables ever broke one of these, this
 * module fails loudly at import time, not silently at runtime.
 */

const FACE_TURNS = [1, 2, 3] as const
const ALL_FACES: readonly Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
const ALL_MOVES: readonly Move[] = ALL_FACES.flatMap((face) => FACE_TURNS.map((turns) => ({ face, turns })))

function isSolvedRelativeTo(state: CubeState, identity: number): boolean {
  const slot = currentSlotOf(state, identity)
  return slot === identity && whiteFacingFaceOfSlot(state, slot) === 'U'
}

function isAlignedFacingSide(state: CubeState, identity: number, ownFace: Face): boolean {
  const slot = currentSlotOf(state, identity)
  if (layerOfSlot(slot) !== 'D') return false
  if (!facesOfSlot(slot).includes(ownFace)) return false // not aligned under own column
  return whiteFacingFaceOfSlot(state, slot) !== 'D'
}

/** Facing-down insertion: always a single half-turn of the own face. */
export function facingDownInsertion(ownFace: Face): Move[] {
  return [{ face: ownFace, turns: 2 }]
}

/**
 * Constructs a real "D-layer, aligned under own column, white facing the
 * side (not D)" CubeState for `identity`, via a small bounded search over
 * the full move set. A hand-derived shortcut isn't used here because the
 * whole point of this module is that such shortcuts can't be trusted
 * without verification — and this exact state is, by the impossibility
 * proven above, unreachable using only {own face, D}, so constructing it
 * genuinely needs the other faces too.
 */
function constructFacingSideState(identity: number, ownFace: Face): CubeState {
  const solved = createSolvedCube()
  let frontier: CubeState[] = [solved]
  const seen = new Set<string>([JSON.stringify(solved.facelets)])
  for (let depth = 0; depth < 4; depth++) {
    for (const state of frontier) {
      if (isAlignedFacingSide(state, identity, ownFace)) return state
    }
    const next: CubeState[] = []
    for (const state of frontier) {
      for (const m of ALL_MOVES) {
        const ns = applyMoves(state, [m])
        const key = JSON.stringify(ns.facelets)
        if (seen.has(key)) continue
        seen.add(key)
        next.push(ns)
      }
    }
    frontier = next
  }
  throw new Error(`constructFacingSideState(${ownFace}): no aligned facing-side state found within search depth`)
}

/**
 * Derives (and implicitly self-verifies, since it only returns a path once
 * `applyMoves` confirms it actually solves the constructed state) the
 * 3-move "facing side" insertion for one (own face, neighbor face) pair.
 */
function deriveFacingSideInsertion(identity: number, ownFace: Face, neighborFace: Face): Move[] {
  const setupState = constructFacingSideState(identity, ownFace)
  for (const dTurns of FACE_TURNS) {
    for (const nTurns of FACE_TURNS) {
      for (const ownTurns of FACE_TURNS) {
        const path: Move[] = [
          { face: 'D', turns: dTurns },
          { face: neighborFace, turns: nTurns },
          { face: ownFace, turns: ownTurns },
        ]
        if (isSolvedRelativeTo(applyMoves(setupState, path), identity)) return path
      }
    }
  }
  throw new Error(`deriveFacingSideInsertion(${ownFace}, via ${neighborFace}): no solving sequence found`)
}

/**
 * Precomputed, self-verified facing-side insertion moves, keyed by
 * `${ownFace}:${neighborFace}`. Computed once at module load (8 entries:
 * 4 own faces x 2 neighbor directions each) rather than re-searched on
 * every solve — the algorithm depends only on which faces are involved,
 * never on the rest of the cube's state.
 */
const FACING_SIDE_INSERTIONS: ReadonlyMap<string, readonly Move[]> = (() => {
  const table = new Map<string, readonly Move[]>()
  for (const identity of WHITE_CROSS_EDGE_IDENTITIES) {
    const ownFace = ownFaceOf(identity)
    for (const neighborFace of ringNeighborsOf(ownFace)) {
      const key = `${ownFace}:${neighborFace}`
      if (table.has(key)) continue
      table.set(key, deriveFacingSideInsertion(identity, ownFace, neighborFace))
    }
  }
  return table
})()

export function facingSideInsertion(ownFace: Face, neighborFace: Face): Move[] {
  const key = `${ownFace}:${neighborFace}`
  const moves = FACING_SIDE_INSERTIONS.get(key)
  if (!moves) throw new Error(`facingSideInsertion: no derived algorithm for ${key}`)
  return [...moves]
}
