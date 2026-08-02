import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90',
  secondary: 'bg-surface text-foreground border border-border hover:bg-border/50',
  ghost: 'text-foreground hover:bg-surface',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

/**
 * Shared style builder so non-button elements (e.g. a Link styled as a
 * primary CTA) can look identical to <Button> without hacky polymorphism.
 */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    className
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={buttonStyles({ variant, size, className })} {...props} />
  )
)
Button.displayName = 'Button'
