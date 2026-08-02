/**
 * Face labels using standard cube notation:
 * U(p), D(own), L(eft), R(ight), F(ront), B(ack).
 */
export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'

export const FACES: readonly Face[] = ['U', 'D', 'L', 'R', 'F', 'B']

/**
 * The six sticker colors, matching the Tailwind `cube.*` design tokens
 * (D-010) and the standard WCA color scheme: U=white, D=yellow, F=green,
 * B=blue, L=orange, R=red.
 */
export type FaceletColor = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange'

/**
 * A cube's state, as raw stickers ("facelets") — not yet interpreted as
 * pieces. This is the primary, stored representation (D-026); corner/edge
 * piece data is a derived view computed from this when needed (Validator,
 * later the solver), not stored redundantly.
 *
 * Each face holds `size * size` facelets in row-major order (index 0 is the
 * top-left sticker as you look directly at that face). `size` is 3 for a
 * standard cube, kept general so future puzzle sizes (D-003) reuse this
 * same shape instead of needing a new model.
 */
export interface CubeState {
  size: number
  facelets: Record<Face, FaceletColor[]>
}
