'use client'

import { cn } from '@/lib/utils'
import type { FaceletColor } from '@/lib/cube/types'

const COLORS: FaceletColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange']

/** Maps a FaceletColor directly onto its Tailwind `cube.*` token (D-010). */
const SWATCH_CLASS: Record<FaceletColor, string> = {
  white: 'bg-cube-white',
  yellow: 'bg-cube-yellow',
  green: 'bg-cube-green',
  blue: 'bg-cube-blue',
  red: 'bg-cube-red',
  orange: 'bg-cube-orange',
}

interface ColorPaletteProps {
  selected: FaceletColor
  onSelect: (color: FaceletColor) => void
}

export function ColorPalette({ selected, onSelect }: ColorPaletteProps) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Facelet color">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={selected === color}
          aria-label={color}
          onClick={() => onSelect(color)}
          className={cn(
            'h-9 w-9 rounded-full border-2 transition-transform duration-150',
            SWATCH_CLASS[color],
            color === 'white' && 'border-foreground/30',
            selected === color
              ? 'scale-110 border-accent ring-2 ring-accent ring-offset-2 ring-offset-background'
              : color !== 'white' && 'border-transparent'
          )}
        />
      ))}
    </div>
  )
}
