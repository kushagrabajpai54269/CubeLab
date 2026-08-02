'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Share2, Copy, Check } from 'lucide-react'

interface ExportPanelProps {
  faceletString: string
  /** The algorithm that produced the current cube, if that provenance is still known. */
  algorithm: string | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

/**
 * Facelet-string export is always available (any CubeState can be
 * serialized). Algorithm export is fundamentally scoped to cubes with
 * known move-provenance (D-038) — a freeform-painted cube has none, and
 * reconstructing one in general would require a solver that doesn't exist
 * yet. Per your direction, that unavailability is explained inline rather
 * than hidden.
 */
export function ExportPanel({ faceletString, algorithm }: ExportPanelProps) {
  return (
    <Card className="w-full max-w-md">
      <div className="mb-1 flex items-center gap-2">
        <Share2 size={16} className="text-foreground/50" aria-hidden />
        <h2 className="text-base font-semibold">Export</h2>
      </div>
      <p className="mb-3 text-sm text-foreground/60">Copy your current cube to share, save, or debug later.</p>

      <div className="mb-4">
        <p className="mb-1 text-sm text-foreground/60">Facelet string</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs">
            {faceletString}
          </code>
          <CopyButton text={faceletString} />
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-foreground/60">Algorithm</p>
        {algorithm ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs">
              {algorithm}
            </code>
            <CopyButton text={algorithm} />
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-foreground/50">
            Not available — this cube wasn&apos;t produced by an algorithm import, or has been edited since.
          </p>
        )}
      </div>
    </Card>
  )
}
