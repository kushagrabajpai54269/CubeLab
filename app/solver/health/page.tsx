'use client'

import { useEffect, useMemo } from 'react'
import { RotateCcw, Undo2, Redo2 } from 'lucide-react'
import { CubeNet } from '@/components/cube/CubeNet'
import { ColorPalette } from '@/components/cube/ColorPalette'
import { OrientationHint } from '@/components/cube/OrientationHint'
import { HealthCheckPanel } from '@/components/cube/HealthCheckPanel'
import { ImportPanel } from '@/components/cube/ImportPanel'
import { ExportPanel } from '@/components/cube/ExportPanel'
import { Button } from '@/components/ui/Button'
import { useCubeEditorStore, selectCube, selectCanUndo, selectCanRedo } from '@/store/useCubeEditorStore'
import { validateCube } from '@/lib/cube/validator'
import { resolveAffectedFacelets } from '@/lib/cube/highlight'

/**
 * Manual cube entry + live legality check, kept as its own route separate
 * from the Solver screen (D-004) so it never clutters the primary solving
 * flow. Validation is recomputed from the current cube on every render
 * rather than stored — it's a derived view (D-026), so it can never go
 * stale relative to what's on screen.
 */
export default function CubeHealthPage() {
  const hydrate = useCubeEditorStore((s) => s.hydrate)
  const hydrated = useCubeEditorStore((s) => s.hydrated)
  const cube = useCubeEditorStore(selectCube)
  const canUndo = useCubeEditorStore(selectCanUndo)
  const canRedo = useCubeEditorStore(selectCanRedo)
  const selectedColor = useCubeEditorStore((s) => s.selectedColor)
  const setSelectedColor = useCubeEditorStore((s) => s.setSelectedColor)
  const paintFacelet = useCubeEditorStore((s) => s.paintFacelet)
  const undo = useCubeEditorStore((s) => s.undo)
  const redo = useCubeEditorStore((s) => s.redo)
  const reset = useCubeEditorStore((s) => s.reset)
  const importFaceletString = useCubeEditorStore((s) => s.importFaceletString)
  const importAlgorithm = useCubeEditorStore((s) => s.importAlgorithm)
  const exportFaceletString = useCubeEditorStore((s) => s.exportFaceletString)
  const lastImportedAlgorithm = useCubeEditorStore((s) => s.lastImportedAlgorithm)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const result = validateCube(cube)
  const highlighted = useMemo(
    () =>
      result.checks
        .filter((c) => !c.valid && c.affected)
        .flatMap((c) => resolveAffectedFacelets(c.affected!, cube.size)),
    [result, cube.size]
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Cube Health Check</h1>
        <p className="mt-1 text-foreground/60">
          Pick a color, then click stickers on the net below to enter your cube exactly as it looks.
        </p>
      </div>

      <OrientationHint />

      <ColorPalette selected={selectedColor} onSelect={setSelectedColor} />

      <CubeNet cube={cube} onPaint={paintFacelet} highlighted={highlighted} />

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={undo} disabled={!canUndo}>
          <Undo2 size={14} className="mr-2" />
          Undo
        </Button>
        <Button variant="secondary" size="sm" onClick={redo} disabled={!canRedo}>
          <Redo2 size={14} className="mr-2" />
          Redo
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw size={14} className="mr-2" />
          Reset to solved
        </Button>
      </div>

      {hydrated && <HealthCheckPanel result={result} />}

      <div className="flex w-full max-w-md flex-col gap-3 border-t border-border pt-6">
        <p className="text-center text-sm text-foreground/50">
          Prefer not to click through 54 stickers? Import a cube below instead.
        </p>
        <div className="flex flex-col gap-6">
          <ImportPanel onImportFaceletString={importFaceletString} onImportAlgorithm={importAlgorithm} />
          <ExportPanel faceletString={exportFaceletString()} algorithm={lastImportedAlgorithm} />
        </div>
      </div>
    </div>
  )
}
