import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface PlaceholderPageProps {
  title: string
  description: string
  icon?: LucideIcon
  note?: string
}

/**
 * Every stub route uses this so empty pages still feel intentional, per the
 * SRS's Empty States principle — never leave blank space, even before real
 * content lands (D-021).
 */
export function PlaceholderPage({ title, description, icon: Icon, note }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon size={24} aria-hidden />
        </div>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-foreground/60">{description}</p>
      {note && <Card className="mt-4 w-full text-left text-sm text-foreground/60">{note}</Card>}
    </div>
  )
}
