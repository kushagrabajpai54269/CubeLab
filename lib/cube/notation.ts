import { FACES, type Face } from './types'
import type { Move } from './moves'

const FACE_LETTERS = new Set<string>(FACES)

/** Matches one move: a face letter, optionally followed by ' or 2. */
const MOVE_PATTERN = /^([A-Za-z])(2|')?$/

export interface ParseSuccess {
  success: true
  moves: Move[]
}

export interface ParseFailure {
  success: false
  error: string
  token: string
}

export type ParseResult = ParseSuccess | ParseFailure

/**
 * Parses a single move token (e.g. "R", "U'", "F2"). Returns null for
 * anything this engine can't execute — including wide moves (lowercase),
 * slice moves (M/E/S), and whole-cube rotations (x/y/z), which are a
 * deliberate, documented scope boundary (D-028), not an oversight.
 */
export function parseMove(token: string): Move | null {
  const normalized = token.replace(/’/g, "'") // smart-quote from autocorrect
  const match = MOVE_PATTERN.exec(normalized)
  if (!match) return null

  const [, letter, modifier] = match
  if (!FACE_LETTERS.has(letter)) return null // e.g. lowercase, M/E/S, x/y/z

  const face = letter as Face
  const turns: 1 | 2 | 3 = modifier === '2' ? 2 : modifier === "'" ? 3 : 1
  return { face, turns }
}

function explainInvalidToken(token: string): string {
  const base = token.replace(/’/g, "'").replace(/[2']$/, '') // strip a trailing modifier, if any
  if (/^[xyz]$/.test(base)) {
    return `"${token}" is a whole-cube rotation — rotations aren't supported yet.`
  }
  if (/^[MES]$/.test(base)) {
    return `"${token}" is a slice move — slice moves aren't supported yet.`
  }
  if (/^[a-z]$/.test(base)) {
    return `"${token}" looks like a wide move — wide moves aren't supported yet, only single-layer turns (${[...FACES].join(', ')}).`
  }
  return `"${token}" isn't a move this engine recognizes. Expected a face letter (${[...FACES].join(', ')}) optionally followed by ' or 2.`
}

/**
 * Parses a whitespace-separated algorithm, e.g. "R U R' U'". Never throws —
 * returns a structured result so a caller can show a friendly, specific
 * error instead of a generic crash.
 */
export function parseAlgorithm(notation: string): ParseResult {
  const tokens = notation.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return { success: false, error: 'No moves found.', token: '' }
  }

  const moves: Move[] = []
  for (const token of tokens) {
    const move = parseMove(token)
    if (!move) {
      return { success: false, error: explainInvalidToken(token), token }
    }
    moves.push(move)
  }
  return { success: true, moves }
}

const TURN_SYMBOL: Record<1 | 2 | 3, string> = { 1: '', 2: '2', 3: "'" }

export function formatMove(move: Move): string {
  return `${move.face}${TURN_SYMBOL[move.turns]}`
}

export function formatAlgorithm(moves: Move[]): string {
  return moves.map(formatMove).join(' ')
}
