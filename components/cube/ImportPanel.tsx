'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, XCircle } from 'lucide-react'
import type { FaceletParseResult, CubeFromAlgorithmResult } from '@/lib/cube/serialization'

type Mode = 'facelet' | 'algorithm'

interface ImportPanelProps {
  onImportFaceletString: (input: string) => Promise<FaceletParseResult>
  onImportAlgorithm: (algorithm: string, from: 'solved' | 'current') => Promise<CubeFromAlgorithmResult>
}

/**
 * Generic import UI over the two cube-library codecs (lib/cube/serialization.ts).
 * Not Health-page-specific — takes its behavior entirely through props, so
 * a future Sandbox/Trainer page can reuse this component with its own
 * handlers (D-038).
 */
export function ImportPanel({ onImportFaceletString, onImportAlgorithm }: ImportPanelProps) {
  const [mode, setMode] = useState<Mode>('facelet')
  const [input, setInput] = useState('')
  const [from, setFrom] = useState<'solved' | 'current'>('solved')
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    const result =
      mode === 'facelet' ? await onImportFaceletString(input) : await onImportAlgorithm(input, from)
    if (result.success) {
      setError(null)
      setInput('')
    } else {
      setError(result.error)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-1 flex items-center gap-2">
        <Upload size={16} className="text-foreground/50" aria-hidden />
        <h2 className="text-base font-semibold">Import</h2>
      </div>
      <p className="mb-3 text-sm text-foreground/60">
        Already have a cube state? Paste it here instead of painting one sticker at a time.
      </p>

      <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Import format">
        {(['facelet', 'algorithm'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={
              'rounded-md px-3 py-1 text-sm transition-colors ' +
              (mode === m ? 'bg-accent text-accent-foreground' : 'bg-background text-foreground/70 hover:text-foreground')
            }
          >
            {m === 'facelet' ? 'Facelet string' : 'Algorithm'}
          </button>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === 'facelet' ? 'WWWWWWWWWRRRRRRRRR...' : "R U R' U'"}
        rows={mode === 'facelet' ? 3 : 1}
        className="w-full rounded-md border border-border bg-background p-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {mode === 'algorithm' && (
        <div className="mt-2 text-sm">
          <p className="mb-1.5 text-xs text-foreground/50">
            Cube notation moves (e.g. R, U&apos;, F2) applied one after another, starting from:
          </p>
          <div className="flex items-center gap-3" role="radiogroup" aria-label="Apply from">
            {(['solved', 'current'] as const).map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="import-from"
                  checked={from === f}
                  onChange={() => setFrom(f)}
                />
                {f === 'solved' ? 'Solved cube' : 'Current cube'}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-red-500">
          <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button className="mt-3" size="sm" onClick={handleImport} disabled={input.trim().length === 0}>
        Import
      </Button>
    </Card>
  )
}
