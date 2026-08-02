import { CheckCircle2, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/lib/cube/validator'

interface HealthCheckPanelProps {
  result: ValidationResult
}

/**
 * Pure presentation over the Validator's ValidationResult (D-032: the UI
 * never re-derives legality itself, it only renders what validateCube
 * already computed, so the rules live in exactly one place).
 */
export function HealthCheckPanel({ result }: HealthCheckPanelProps) {
  return (
    <Card className="w-full max-w-md">
      <div className="mb-4 flex items-center gap-2">
        {result.valid ? (
          <CheckCircle2 className="text-emerald-500" size={20} aria-hidden />
        ) : (
          <XCircle className="text-red-500" size={20} aria-hidden />
        )}
        <h2 className="text-base font-semibold">
          {result.valid ? 'This is a solvable cube' : "This cube can't be solved as entered"}
        </h2>
      </div>
      <ul className="space-y-2">
        {result.checks.map((check, i) => (
          <li key={`${check.id}-${i}`} className="flex items-start gap-2 text-sm">
            {check.valid ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={16} aria-hidden />
            ) : (
              <XCircle className="mt-0.5 shrink-0 text-red-500" size={16} aria-hidden />
            )}
            <span className={cn(!check.valid && 'text-foreground/80')}>
              <span className="font-medium">{check.label}</span>
              {check.message && <span className="text-foreground/60"> — {check.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
