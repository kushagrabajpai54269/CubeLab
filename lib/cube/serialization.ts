import { createSolvedCube, flattenFacelets, unflattenFacelets } from './state'
import type { CubeState, FaceletColor } from './types'
import { parseAlgorithm } from './notation'
import { applyMoves, type Move } from './moves'

/**
 * CubeLab's own canonical facelet-string format: one character per facelet,
 * in the same order flattenFacelets/faceletAt already use (FACES order
 * U,D,L,R,F,B, row-major per face). Deliberately NOT the Kociemba/URFDLB
 * convention used by some external cuber tools — that's a documented,
 * deferred interop gap (D-036), not an oversight. Whitespace in input is
 * ignored so pasted, line-wrapped strings still parse.
 */
const COLOR_TO_CHAR: Record<FaceletColor, string> = {
  white: 'W',
  yellow: 'Y',
  green: 'G',
  blue: 'B',
  red: 'R',
  orange: 'O',
}

const CHAR_TO_COLOR: Record<string, FaceletColor> = Object.fromEntries(
  Object.entries(COLOR_TO_CHAR).map(([color, char]) => [char, color as FaceletColor])
)

export function cubeToFaceletString(state: CubeState): string {
  return flattenFacelets(state)
    .map((color) => COLOR_TO_CHAR[color])
    .join('')
}

export interface FaceletStringValidation {
  valid: boolean
  error?: string
}

/**
 * Validates a facelet string's shape and character set without building a
 * CubeState — lets any caller (an input field's live feedback, a paste
 * handler, a future puzzle format) check a string without duplicating this
 * parsing logic (only one place knows what a valid facelet string looks
 * like).
 */
export function validateFaceletString(input: string, size = 3): FaceletStringValidation {
  const normalized = input.replace(/\s+/g, '').toUpperCase()
  const expectedLength = 6 * size * size
  if (normalized.length !== expectedLength) {
    return {
      valid: false,
      error: `Expected ${expectedLength} characters (6 faces × ${size * size}), got ${normalized.length}.`,
    }
  }
  for (const ch of normalized) {
    if (!(ch in CHAR_TO_COLOR)) {
      const known = Object.keys(CHAR_TO_COLOR).join(', ')
      return { valid: false, error: `"${ch}" isn't a recognized color letter. Expected one of: ${known}.` }
    }
  }
  return { valid: true }
}

export type FaceletParseResult =
  | { success: true; cube: CubeState }
  | { success: false; error: string }

/**
 * Parses a facelet string into a CubeState. Purely structural: a string
 * that decodes to 54 valid color letters succeeds even if the resulting
 * cube is illegal (bad parity, twisted corner, etc.) — legality is the
 * Validator's job, checked afterward as informational feedback, not a
 * precondition for import (D-037).
 */
export function faceletStringFromInput(input: string, size = 3): FaceletParseResult {
  const validation = validateFaceletString(input, size)
  if (!validation.valid) return { success: false, error: validation.error! }

  const normalized = input.replace(/\s+/g, '').toUpperCase()
  const flat = [...normalized].map((ch) => CHAR_TO_COLOR[ch]) as FaceletColor[]
  return { success: true, cube: unflattenFacelets(flat, size) }
}

export type CubeFromAlgorithmResult =
  | { success: true; cube: CubeState; moves: Move[] }
  | { success: false; error: string; token: string }

/**
 * Builds a CubeState by applying an algorithm string to a base cube
 * (solved, by default). Thin orchestration over the existing Notation
 * Parser + Move Engine — introduces no new parsing logic and inherits
 * their single-layer-turn scope boundary (D-028) as-is.
 */
export function cubeFromAlgorithm(algorithm: string, base?: CubeState): CubeFromAlgorithmResult {
  const parsed = parseAlgorithm(algorithm)
  if (!parsed.success) return { success: false, error: parsed.error, token: parsed.token }
  const cube = applyMoves(base ?? createSolvedCube(), parsed.moves)
  return { success: true, cube, moves: parsed.moves }
}
