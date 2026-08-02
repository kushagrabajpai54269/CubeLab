import { FACES, type Face } from './types'

/**
 * The 2D "unfolded cross" net layout used for manual cube input and the
 * Cube Health Check. Each face occupies one 3x3 (or size x size) block in a
 * 4-block-wide, 3-block-tall grid:
 *
 *        [U]
 *   [L] [F] [R] [B]
 *        [D]
 *
 * Only the 6 face-block positions are hand-specified — the 54 individual
 * facelet cell positions are derived from them in buildNetLayout, not
 * enumerated (consistent with D-026/D-029: derive, don't duplicate).
 */
export interface NetBlockPosition {
  blockRow: number
  blockCol: number
}

export const NET_FACE_BLOCKS: Record<Face, NetBlockPosition> = {
  U: { blockRow: 0, blockCol: 1 },
  L: { blockRow: 1, blockCol: 0 },
  F: { blockRow: 1, blockCol: 1 },
  R: { blockRow: 1, blockCol: 2 },
  B: { blockRow: 1, blockCol: 3 },
  D: { blockRow: 2, blockCol: 1 },
}

export const NET_BLOCK_COLS = 4
export const NET_BLOCK_ROWS = 3

export interface NetCell {
  face: Face
  /** Index into state.facelets[face] (row-major within the face). */
  facelet: number
  /** Position in the whole-net grid, in facelet units. */
  row: number
  col: number
}

/**
 * Derives every net cell (one per facelet) for a cube of the given size from
 * NET_FACE_BLOCKS. The result is stable and exhaustive: exactly
 * size*size*6 cells, each with a unique (row, col).
 */
export function buildNetLayout(size = 3): NetCell[] {
  const cells: NetCell[] = []
  for (const face of FACES) {
    const block = NET_FACE_BLOCKS[face]
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push({
          face,
          facelet: r * size + c,
          row: block.blockRow * size + r,
          col: block.blockCol * size + c,
        })
      }
    }
  }
  return cells
}

/** Total grid dimensions (in facelet units) for a net of the given size. */
export function netGridSize(size = 3): { rows: number; cols: number } {
  return { rows: NET_BLOCK_ROWS * size, cols: NET_BLOCK_COLS * size }
}
