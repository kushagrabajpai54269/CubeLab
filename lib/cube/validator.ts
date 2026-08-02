import { FACES, type CubeState, type Face, type FaceletColor } from './types'
import {
  readCornerColors,
  readEdgeColors,
  identifyCorner,
  identifyEdge,
  cornerOrientation,
  edgeOrientation,
  permutationParity,
} from './pieces'

export type ValidationCheckId =
  | 'colorCount'
  | 'centers'
  | 'cornerIntegrity'
  | 'edgeIntegrity'
  | 'permutationParity'
  | 'cornerOrientation'
  | 'edgeOrientation'

/**
 * Purely logical references to *which* pieces a failing check implicates —
 * slot indices into CORNER_FACELETS/EDGE_FACELETS, or Face labels for
 * centers. Deliberately not facelet indices, colors, or anything
 * presentation-specific: the Validator stays UI-agnostic (D-035). Resolving
 * this into actual facelet coordinates is lib/cube/highlight.ts's job, and
 * rendering that as a highlight is the UI's job.
 */
export type AffectedEntities =
  | { kind: 'corners'; slots: number[] }
  | { kind: 'edges'; slots: number[] }
  | { kind: 'centers'; faces: Face[] }

export interface ValidationCheck {
  /** Stable identifier — the UI keys and looks up checks by this, never by `label`. */
  id: ValidationCheckId
  label: string
  valid: boolean
  message?: string
  /**
   * Present only when the specific pieces at fault are directly and
   * unambiguously known from this check's own computation — never a guess
   * about which piece "caused" a failure. colorCount and permutationParity
   * never set this (see D-035 rationale in validateCube).
   */
  affected?: AffectedEntities
}

export interface ValidationResult {
  valid: boolean
  checks: ValidationCheck[]
}

const CANONICAL_CENTER: Record<Face, FaceletColor> = {
  U: 'white', D: 'yellow', F: 'green', B: 'blue', L: 'orange', R: 'red',
}
const ALL_COLORS: FaceletColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange']

function checkColorCount(state: CubeState): ValidationCheck {
  const expected = state.size * state.size
  const counts: Record<FaceletColor, number> = { white: 0, yellow: 0, green: 0, blue: 0, red: 0, orange: 0 }
  for (const face of FACES) for (const color of state.facelets[face]) counts[color]++
  const problems = ALL_COLORS.filter((c) => counts[c] !== expected)
  if (problems.length === 0) return { id: 'colorCount', label: 'Color Count Correct', valid: true }
  const detail = problems.map((c) => `${c}: ${counts[c]} (expected ${expected})`).join(', ')
  return {
    id: 'colorCount',
    label: 'Color Count Correct',
    valid: false,
    message: `Some colors don't appear the right number of times — ${detail}.`,
  }
}

function checkCenters(state: CubeState): ValidationCheck {
  // No fixed center piece on an even-sized cube — see the invariants
  // explanation (Phase A step 4): not applicable, not a failure.
  if (state.size % 2 === 0) return { id: 'centers', label: 'Centers Valid', valid: true }

  const centerIndex = Math.floor((state.size * state.size) / 2)
  const problems = FACES.filter((face) => state.facelets[face][centerIndex] !== CANONICAL_CENTER[face])
  if (problems.length === 0) return { id: 'centers', label: 'Centers Valid', valid: true }
  const detail = problems
    .map((f) => `${f} shows ${state.facelets[f][centerIndex]}, expected ${CANONICAL_CENTER[f]}`)
    .join('; ')
  return {
    id: 'centers',
    label: 'Centers Valid',
    valid: false,
    message: `Centers don't match the standard color scheme — ${detail}.`,
    affected: { kind: 'centers', faces: problems },
  }
}

function checkCornerIntegrity(state: CubeState): ValidationCheck {
  const badSlots = readCornerColors(state)
    .map((c, i) => (identifyCorner(c) === null ? i : null))
    .filter((i): i is number => i !== null)
  if (badSlots.length === 0) return { id: 'cornerIntegrity', label: 'Corners Valid', valid: true }
  return {
    id: 'cornerIntegrity',
    label: 'Corners Valid',
    valid: false,
    message: `${badSlots.length} corner${badSlots.length > 1 ? 's show' : ' shows'} a combination of colors no real corner piece can have (e.g. two opposite colors on one piece).`,
    affected: { kind: 'corners', slots: badSlots },
  }
}

function checkEdgeIntegrity(state: CubeState): ValidationCheck {
  const badSlots = readEdgeColors(state)
    .map((c, i) => (identifyEdge(c) === null ? i : null))
    .filter((i): i is number => i !== null)
  if (badSlots.length === 0) return { id: 'edgeIntegrity', label: 'Edges Valid', valid: true }
  return {
    id: 'edgeIntegrity',
    label: 'Edges Valid',
    valid: false,
    message: `${badSlots.length} edge${badSlots.length > 1 ? 's show' : ' shows'} a combination of colors no real edge piece can have (e.g. two opposite colors on one piece).`,
    affected: { kind: 'edges', slots: badSlots },
  }
}

/**
 * Parity and orientation only mean anything once every corner and edge is
 * a real, identifiable piece — otherwise "which permutation is this" is
 * undefined. Skipped (not silently passed) when integrity fails.
 */
function checkDeepInvariants(state: CubeState, cornersOk: boolean, edgesOk: boolean): ValidationCheck[] {
  if (!cornersOk || !edgesOk) {
    const message = "Can't be determined until every corner and edge is a real piece."
    return [
      { id: 'permutationParity', label: 'Cube Configuration Valid', valid: false, message },
      { id: 'cornerOrientation', label: 'Cube Configuration Valid', valid: false, message },
      { id: 'edgeOrientation', label: 'Cube Configuration Valid', valid: false, message },
    ]
  }

  const cornerColors = readCornerColors(state)
  const edgeColors = readEdgeColors(state)
  const cornerIdentities = cornerColors.map((c) => identifyCorner(c) as number)
  const edgeIdentities = edgeColors.map((c) => identifyEdge(c) as number)

  const parityMatches = permutationParity(cornerIdentities) === permutationParity(edgeIdentities)

  // Each entry here is a direct, unambiguous fact about that one piece
  // ("this corner sits rotated relative to solved") — not a guess about
  // which piece "caused" the sum to fail (D-035 clarification).
  const cornerOrientations = cornerColors.map((c, i) => cornerOrientation(cornerIdentities[i]!, c) ?? 0)
  const edgeOrientations = edgeColors.map((c, i) => edgeOrientation(edgeIdentities[i]!, c) ?? 0)
  const twistedCornerSlots = cornerOrientations
    .map((o, i) => (o !== 0 ? i : null))
    .filter((i): i is number => i !== null)
  const flippedEdgeSlots = edgeOrientations
    .map((o, i) => (o !== 0 ? i : null))
    .filter((i): i is number => i !== null)

  const cornerSum = cornerOrientations.reduce((sum, o) => sum + o, 0)
  const edgeSum = edgeOrientations.reduce((sum, o) => sum + o, 0)
  const cornersOriented = cornerSum % 3 === 0
  const edgesOriented = edgeSum % 2 === 0

  return [
    {
      id: 'permutationParity',
      label: 'Cube Configuration Valid',
      valid: parityMatches,
      message: parityMatches
        ? undefined
        : 'Two pieces appear to be swapped. This exact arrangement can never come from turning the cube — only from taking a piece out and putting it back in a different spot.',
      // No `affected`: which pair is swapped isn't uniquely determined by
      // parity alone (a permutation's transposition decomposition isn't
      // unique), so this stays a global finding rather than a guess.
    },
    {
      id: 'cornerOrientation',
      label: 'Cube Configuration Valid',
      valid: cornersOriented,
      message: cornersOriented
        ? undefined
        : "A corner appears twisted in place. Turning the cube can't produce this on its own — only removing and reinserting a piece rotated can.",
      ...(cornersOriented ? {} : { affected: { kind: 'corners', slots: twistedCornerSlots } as const }),
    },
    {
      id: 'edgeOrientation',
      label: 'Cube Configuration Valid',
      valid: edgesOriented,
      message: edgesOriented
        ? undefined
        : "An edge appears flipped in place. Turning the cube can't produce this on its own — only removing and reinserting a piece flipped can.",
      ...(edgesOriented ? {} : { affected: { kind: 'edges', slots: flippedEdgeSlots } as const }),
    },
  ]
}

/**
 * Full legality check for a CubeState. Color count and centers apply to
 * any size; the piece-level checks (corner/edge integrity, permutation
 * parity, orientation sums) are currently 3x3-specific (D-029) and are
 * skipped — not failed — for other sizes.
 */
export function validateCube(state: CubeState): ValidationResult {
  const colorCount = checkColorCount(state)
  const centers = checkCenters(state)

  if (state.size !== 3) {
    return { valid: colorCount.valid && centers.valid, checks: [colorCount, centers] }
  }

  const cornerIntegrity = checkCornerIntegrity(state)
  const edgeIntegrity = checkEdgeIntegrity(state)
  const deep = checkDeepInvariants(state, cornerIntegrity.valid, edgeIntegrity.valid)

  const checks = [colorCount, centers, cornerIntegrity, edgeIntegrity, ...deep]
  return { valid: checks.every((c) => c.valid), checks }
}
