import { describe, it, expect, beforeEach } from 'vitest'
import { useCubeEditorStore, selectCube, selectCanUndo, selectCanRedo } from './useCubeEditorStore'
import { isSolvedState, createSolvedCube, areCubeStatesEqual } from '@/lib/cube/state'
import { applyMoves } from '@/lib/cube/moves'
import { cubeToFaceletString } from '@/lib/cube/serialization'
import { storage } from '@/lib/services/storage'

const STORAGE_KEY = 'cubelab:cube-editor'

describe('useCubeEditorStore', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await useCubeEditorStore.getState().reset()
    useCubeEditorStore.getState().setSelectedColor('white')
  })

  it('starts from a solved cube with white selected and no undo/redo available', () => {
    const s = useCubeEditorStore.getState()
    expect(isSolvedState(selectCube(s))).toBe(true)
    expect(s.selectedColor).toBe('white')
    expect(selectCanUndo(s)).toBe(false)
    expect(selectCanRedo(s)).toBe(false)
  })

  it('paints exactly the targeted facelet and enables undo', async () => {
    useCubeEditorStore.getState().setSelectedColor('red')
    await useCubeEditorStore.getState().paintFacelet('U', 4)

    const s = useCubeEditorStore.getState()
    expect(selectCube(s).facelets.U[4]).toBe('red')
    expect(selectCanUndo(s)).toBe(true)
    expect(selectCanRedo(s)).toBe(false)
  })

  it('does not mutate a previously-read cube reference (immutability)', async () => {
    const before = selectCube(useCubeEditorStore.getState())
    await useCubeEditorStore.getState().paintFacelet('F', 0)
    expect(before.facelets.F[0]).toBe('green')
  })

  it('undo restores the state before the last paint', async () => {
    await useCubeEditorStore.getState().paintFacelet('D', 0)
    await useCubeEditorStore.getState().undo()

    const s = useCubeEditorStore.getState()
    expect(isSolvedState(selectCube(s))).toBe(true)
    expect(selectCanUndo(s)).toBe(false)
    expect(selectCanRedo(s)).toBe(true)
  })

  it('redo re-applies an undone paint', async () => {
    await useCubeEditorStore.getState().paintFacelet('D', 0)
    await useCubeEditorStore.getState().undo()
    await useCubeEditorStore.getState().redo()

    const s = useCubeEditorStore.getState()
    expect(selectCube(s).facelets.D[0]).toBe('white')
    // white was the selected color when D[0] was painted in this test
    expect(selectCanRedo(s)).toBe(false)
  })

  it('branch invariant: painting after an undo permanently clears redo', async () => {
    useCubeEditorStore.getState().setSelectedColor('red')
    await useCubeEditorStore.getState().paintFacelet('L', 0) // paint A
    useCubeEditorStore.getState().setSelectedColor('blue')
    await useCubeEditorStore.getState().paintFacelet('L', 1) // paint B
    await useCubeEditorStore.getState().undo() // back to paint A, paint B queued as redo
    expect(selectCanRedo(useCubeEditorStore.getState())).toBe(true)

    useCubeEditorStore.getState().setSelectedColor('green')
    await useCubeEditorStore.getState().paintFacelet('L', 2) // paint C — new branch

    const s = useCubeEditorStore.getState()
    expect(selectCanRedo(s)).toBe(false)
    await useCubeEditorStore.getState().redo() // must be a no-op
    expect(selectCube(useCubeEditorStore.getState()).facelets.L[2]).toBe('green')
  })

  it('undo/redo with no history is a safe no-op', async () => {
    await useCubeEditorStore.getState().undo()
    await useCubeEditorStore.getState().redo()
    expect(isSolvedState(selectCube(useCubeEditorStore.getState()))).toBe(true)
  })

  it('reset returns to solved and clears both stacks', async () => {
    await useCubeEditorStore.getState().paintFacelet('L', 0)
    await useCubeEditorStore.getState().undo()
    await useCubeEditorStore.getState().reset()

    const s = useCubeEditorStore.getState()
    expect(isSolvedState(selectCube(s))).toBe(true)
    expect(selectCanUndo(s)).toBe(false)
    expect(selectCanRedo(s)).toBe(false)
  })

  it('persists only the current cube (not history stacks) after a paint', async () => {
    await useCubeEditorStore.getState().paintFacelet('U', 0)
    const saved = await storage.get<{ facelets: Record<string, string[]> }>(STORAGE_KEY)
    expect(saved).not.toBeNull()
    expect(saved).toEqual(selectCube(useCubeEditorStore.getState()))
    // Confirm the persisted shape is a CubeState, not a HistoryStack
    expect(saved).not.toHaveProperty('past')
    expect(saved).not.toHaveProperty('future')
  })

  it('persists the resulting cube after undo and after redo', async () => {
    await useCubeEditorStore.getState().paintFacelet('U', 0)
    await useCubeEditorStore.getState().undo()
    let saved = await storage.get(STORAGE_KEY)
    expect(saved).toEqual(selectCube(useCubeEditorStore.getState()))

    await useCubeEditorStore.getState().redo()
    saved = await storage.get(STORAGE_KEY)
    expect(saved).toEqual(selectCube(useCubeEditorStore.getState()))
  })

  it('persists the solved cube after reset', async () => {
    await useCubeEditorStore.getState().paintFacelet('U', 0)
    await useCubeEditorStore.getState().reset()
    const saved = await storage.get(STORAGE_KEY)
    expect(saved).toEqual(selectCube(useCubeEditorStore.getState()))
  })

  it('hydrate loads a previously-saved cube as the fresh present with empty stacks', async () => {
    await useCubeEditorStore.getState().paintFacelet('R', 3)
    // Simulate a reload: a brand new call to hydrate() re-reads storage.
    await useCubeEditorStore.getState().hydrate()

    const s = useCubeEditorStore.getState()
    expect(selectCube(s).facelets.R[3]).toBe('white') // color selected in this test's beforeEach
    expect(s.hydrated).toBe(true)
    expect(selectCanUndo(s)).toBe(false) // undo history does NOT survive reload, by design
    expect(selectCanRedo(s)).toBe(false)
  })

  it('hydrate falls back to a solved cube when nothing was saved', async () => {
    window.localStorage.clear()
    await useCubeEditorStore.getState().hydrate()
    expect(isSolvedState(selectCube(useCubeEditorStore.getState()))).toBe(true)
  })
})

describe('useCubeEditorStore: import/export', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await useCubeEditorStore.getState().reset()
    useCubeEditorStore.getState().setSelectedColor('white')
  })

  it('exportFaceletString round-trips through importFaceletString', async () => {
    await useCubeEditorStore.getState().paintFacelet('U', 0)
    const exported = useCubeEditorStore.getState().exportFaceletString()

    await useCubeEditorStore.getState().reset()
    const result = await useCubeEditorStore.getState().importFaceletString(exported)

    expect(result.success).toBe(true)
    expect(useCubeEditorStore.getState().exportFaceletString()).toBe(exported)
  })

  it('importFaceletString is undoable', async () => {
    const before = useCubeEditorStore.getState().exportFaceletString()
    const scrambled = cubeToFaceletString(
      applyMoves(createSolvedCube(), [{ face: 'R', turns: 1 }])
    )
    await useCubeEditorStore.getState().importFaceletString(scrambled)
    expect(selectCanUndo(useCubeEditorStore.getState())).toBe(true)

    await useCubeEditorStore.getState().undo()
    expect(useCubeEditorStore.getState().exportFaceletString()).toBe(before)
  })

  it('a failed facelet import leaves the editor state completely unchanged', async () => {
    const before = useCubeEditorStore.getState()
    const beforeCube = selectCube(before)
    const beforeCanUndo = selectCanUndo(before)

    const result = await useCubeEditorStore.getState().importFaceletString('not a valid facelet string')

    expect(result.success).toBe(false)
    const after = useCubeEditorStore.getState()
    expect(selectCube(after)).toBe(beforeCube) // same reference — no history push happened
    expect(selectCanUndo(after)).toBe(beforeCanUndo)
  })

  it('a failed algorithm import leaves the editor state completely unchanged', async () => {
    const beforeCube = selectCube(useCubeEditorStore.getState())
    const result = await useCubeEditorStore.getState().importAlgorithm('R U x', 'solved')

    expect(result.success).toBe(false)
    expect(selectCube(useCubeEditorStore.getState())).toBe(beforeCube)
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBeNull()
  })

  it('importAlgorithm from "solved" ignores the current cube', async () => {
    await useCubeEditorStore.getState().paintFacelet('U', 0) // dirty the current cube first
    const result = await useCubeEditorStore.getState().importAlgorithm('R', 'solved')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(areCubeStatesEqual(result.cube, applyMoves(createSolvedCube(), [{ face: 'R', turns: 1 }]))).toBe(true)
    }
  })

  it('importAlgorithm from "current" builds on top of the current cube', async () => {
    await useCubeEditorStore.getState().importAlgorithm('R', 'solved')
    const afterR = selectCube(useCubeEditorStore.getState())

    const result = await useCubeEditorStore.getState().importAlgorithm('U', 'current')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(areCubeStatesEqual(result.cube, applyMoves(afterR, [{ face: 'U', turns: 1 }]))).toBe(true)
    }
  })

  it('records lastImportedAlgorithm on a successful algorithm import, in canonical form', async () => {
    const result = await useCubeEditorStore.getState().importAlgorithm("R U2 F'", 'solved')
    expect(result.success).toBe(true)
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBe("R U2 F'")
  })

  it('undo/redo across an algorithm import works like any other edit', async () => {
    await useCubeEditorStore.getState().paintFacelet('L', 0)
    const afterPaint = selectCube(useCubeEditorStore.getState())

    await useCubeEditorStore.getState().importAlgorithm('R', 'current')
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBe('R')

    await useCubeEditorStore.getState().undo()
    expect(selectCube(useCubeEditorStore.getState())).toEqual(afterPaint)
    // Provenance is cleared by undo — deliberately not tracked per history entry (D-038).
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBeNull()

    await useCubeEditorStore.getState().redo()
    expect(selectCanRedo(useCubeEditorStore.getState())).toBe(false)
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBeNull()
  })

  it('any other edit after an algorithm import clears the recorded provenance', async () => {
    await useCubeEditorStore.getState().importAlgorithm('R', 'solved')
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).not.toBeNull()

    await useCubeEditorStore.getState().paintFacelet('U', 0)
    expect(useCubeEditorStore.getState().lastImportedAlgorithm).toBeNull()
  })

  it('persists only the resulting cube after an import (same contract as paint/undo/redo)', async () => {
    await useCubeEditorStore.getState().importAlgorithm('R U', 'solved')
    const saved = await storage.get(STORAGE_KEY)
    expect(saved).toEqual(selectCube(useCubeEditorStore.getState()))
  })
})
