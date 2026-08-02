'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { buildNetLayout, netGridSize, NET_FACE_BLOCKS } from '@/lib/cube/net'
import { FACES } from '@/lib/cube/types'
import type { CubeState, Face, FaceletColor } from '@/lib/cube/types'
import type { FaceletRef } from '@/lib/cube/highlight'

const SWATCH_CLASS: Record<FaceletColor, string> = {
  white: 'bg-cube-white',
  yellow: 'bg-cube-yellow',
  green: 'bg-cube-green',
  blue: 'bg-cube-blue',
  red: 'bg-cube-red',
  orange: 'bg-cube-orange',
}

interface CubeNetProps {
  cube: CubeState
  onPaint: (face: Face, facelet: number) => void
  /**
   * Facelets to visually flag as the cause of a failing Health Check.
   * Purely a rendering prop — the "which pieces are affected" logic all
   * happens upstream in the Validator + lib/cube/highlight.ts (D-035);
   * this component only knows how to draw a ring around a cell.
   */
  highlighted?: readonly FaceletRef[]
}

function faceletKey(face: Face, facelet: number): string {
  return `${face}-${facelet}`
}

const CELL_PX = 36
const GAP_PX = 2

export function CubeNet({ cube, onPaint, highlighted }: CubeNetProps) {
  const cells = useMemo(() => buildNetLayout(cube.size), [cube.size])
  const { rows, cols } = useMemo(() => netGridSize(cube.size), [cube.size])
  const blockPx = CELL_PX * cube.size + GAP_PX * (cube.size - 1)
  const highlightedKeys = useMemo(
    () => new Set((highlighted ?? []).map((f) => faceletKey(f.face, f.facelet))),
    [highlighted]
  )

  return (
    <div className="relative">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL_PX}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_PX}px)`,
          gap: GAP_PX,
        }}
        role="group"
        aria-label="Cube net — click a sticker, then a color, to edit it. Face labels U, D, L, R, F, B mark which side of the cube each block represents."
      >
        {cells.map((cell) => {
          // Non-null: buildNetLayout only ever emits facelet indices that are
          // valid for cube.size, so this index is always in range.
          const color = cube.facelets[cell.face][cell.facelet]!
          const isHighlighted = highlightedKeys.has(faceletKey(cell.face, cell.facelet))
          return (
            <button
              key={faceletKey(cell.face, cell.facelet)}
              type="button"
              aria-label={`${cell.face} face, sticker ${cell.facelet + 1}, currently ${color}${
                isHighlighted ? ', flagged by the health check' : ''
              }`}
              onClick={() => onPaint(cell.face, cell.facelet)}
              className={cn(
                'rounded-[3px] border-2 transition-transform duration-100 hover:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                SWATCH_CLASS[color],
                // White is easy to lose against a light background — a
                // plain border-border/60 (fine for every other color) was
                // nearly invisible here, so white gets a firmer border and
                // a touch of depth instead (D-042).
                color === 'white'
                  ? 'border-foreground/30 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'
                  : 'border-border/60',
                isHighlighted && 'border-red-500 ring-2 ring-red-500 ring-offset-1 ring-offset-background'
              )}
              style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
            />
          )
        })}
      </div>

      {/* Face labels (D-042): a small letter per block so people don't have
          to already know cube-net orientation conventions to use this. */}
      {FACES.map((face) => {
        const block = NET_FACE_BLOCKS[face]
        return (
          <span
            key={face}
            aria-hidden
            className="pointer-events-none absolute flex h-4 w-4 items-center justify-center rounded-sm bg-background/90 text-[10px] font-semibold text-foreground/50"
            style={{
              top: block.blockRow * (blockPx + GAP_PX) - 2,
              left: block.blockCol * (blockPx + GAP_PX) - 2,
            }}
          >
            {face}
          </span>
        )
      })}
    </div>
  )
}
