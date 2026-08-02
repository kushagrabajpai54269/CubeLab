import { cn } from '@/lib/utils'
import { createSolvedCube } from '@/lib/cube/state'
import { FACES } from '@/lib/cube/types'
import type { FaceletColor } from '@/lib/cube/types'

const SWATCH_CLASS: Record<FaceletColor, string> = {
  white: 'bg-cube-white',
  yellow: 'bg-cube-yellow',
  green: 'bg-cube-green',
  blue: 'bg-cube-blue',
  red: 'bg-cube-red',
  orange: 'bg-cube-orange',
}

const HOLD_HINT: Record<(typeof FACES)[number], string> = {
  U: 'top',
  D: 'bottom',
  F: 'facing you',
  B: 'facing away',
  L: 'left',
  R: 'right',
}

// Derived from the solved cube (not hardcoded) so this can never drift out
// of sync with the actual canonical color scheme (D-042).
const SOLVED = createSolvedCube()
const CENTER_INDEX = Math.floor((SOLVED.size * SOLVED.size) / 2)

/**
 * Answers the #1 first-time-user question ("which way am I supposed to
 * hold this thing?") in one glance, without a full 3D diagram — pairs with
 * CubeNet's face labels so the net's abstract layout maps onto a physical
 * cube in someone's hands.
 */
export function OrientationHint() {
  return (
    <div className="flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-foreground/60">
      <span className="font-medium text-foreground/70">Hold your cube so:</span>
      {FACES.map((face) => {
        // Non-null: CENTER_INDEX = floor(size*size/2) is always a valid
        // index into a size*size facelet array.
        const color = SOLVED.facelets[face][CENTER_INDEX]!
        return (
          <span key={face} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'inline-block h-3 w-3 rounded-sm border',
                SWATCH_CLASS[color],
                color === 'white' ? 'border-foreground/30' : 'border-border/60'
              )}
            />
            {face} is {HOLD_HINT[face]}
          </span>
        )
      })}
    </div>
  )
}
