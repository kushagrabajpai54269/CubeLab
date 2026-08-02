import { describe, it, expect } from 'vitest'
import { buildNetLayout, netGridSize, NET_FACE_BLOCKS } from './net'
import { FACES } from './types'

describe('buildNetLayout', () => {
  it('produces exactly size*size*6 cells for a standard cube', () => {
    const cells = buildNetLayout(3)
    expect(cells).toHaveLength(54)
  })

  it('gives every face exactly size*size cells', () => {
    const cells = buildNetLayout(3)
    for (const face of FACES) {
      expect(cells.filter((c) => c.face === face)).toHaveLength(9)
    }
  })

  it('never places two cells at the same grid position (no overlap)', () => {
    const cells = buildNetLayout(3)
    const seen = new Set(cells.map((c) => `${c.row},${c.col}`))
    expect(seen.size).toBe(cells.length)
  })

  it('keeps every cell within the declared grid bounds', () => {
    const cells = buildNetLayout(3)
    const { rows, cols } = netGridSize(3)
    for (const cell of cells) {
      expect(cell.row).toBeGreaterThanOrEqual(0)
      expect(cell.row).toBeLessThan(rows)
      expect(cell.col).toBeGreaterThanOrEqual(0)
      expect(cell.col).toBeLessThan(cols)
    }
  })

  it('gives each facelet index 0..size*size-1 exactly once per face', () => {
    const cells = buildNetLayout(3)
    for (const face of FACES) {
      const facelets = cells.filter((c) => c.face === face).map((c) => c.facelet).sort((a, b) => a - b)
      expect(facelets).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    }
  })

  it('supports other sizes for future puzzle types (D-003)', () => {
    const cells = buildNetLayout(2)
    expect(cells).toHaveLength(24)
    const { rows, cols } = netGridSize(2)
    expect(rows).toBe(6)
    expect(cols).toBe(8)
  })

  it('lays the net out as the standard U / L-F-R-B / D cross', () => {
    expect(NET_FACE_BLOCKS.U.blockRow).toBeLessThan(NET_FACE_BLOCKS.F.blockRow)
    expect(NET_FACE_BLOCKS.D.blockRow).toBeGreaterThan(NET_FACE_BLOCKS.F.blockRow)
    expect(NET_FACE_BLOCKS.L.blockCol).toBeLessThan(NET_FACE_BLOCKS.F.blockCol)
    expect(NET_FACE_BLOCKS.R.blockCol).toBeGreaterThan(NET_FACE_BLOCKS.F.blockCol)
    expect(NET_FACE_BLOCKS.B.blockCol).toBeGreaterThan(NET_FACE_BLOCKS.R.blockCol)
  })
})
