import { create } from 'zustand'
import { createSolvedCube, cloneCubeState } from '@/lib/cube/state'
import type { CubeState, Face, FaceletColor } from '@/lib/cube/types'
import {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  resetHistory,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  type HistoryStack,
} from '@/lib/history/historyStack'
import { storage } from '@/lib/services/storage'
import {
  faceletStringFromInput,
  cubeFromAlgorithm,
  cubeToFaceletString,
  type FaceletParseResult,
  type CubeFromAlgorithmResult,
} from '@/lib/cube/serialization'
import { formatAlgorithm } from '@/lib/cube/notation'

const STORAGE_KEY = 'cubelab:cube-editor'

function solved(): CubeState {
  return createSolvedCube(3)
}

/**
 * Manual cube entry, backed by the generic history stack (D-033) so paints
 * (and now imports — D-038) can be undone/redone. Wraps the domain-specific
 * bits (CubeState, FaceletColor) around lib/history, which itself knows
 * nothing about cubes.
 *
 * Persistence (D-034): only `history.present` — the current cube — is
 * saved via StorageAdapter, exactly like useThemeStore's hydrate()/hydrated
 * pattern. The undo/redo stacks are intentionally in-memory only; a reload
 * restores where you left off, not your undo history.
 *
 * Import/export (D-038): this store is a thin, Solver-page-specific
 * wrapper. All the actual parsing/serialization logic lives in
 * lib/cube/serialization.ts, which knows nothing about Zustand, React, or
 * persistence — Sandbox/Trainer can call those functions directly against
 * their own state instead of going through this store.
 */
interface CubeEditorState {
  history: HistoryStack<CubeState>
  selectedColor: FaceletColor
  hydrated: boolean
  /**
   * The exact algorithm (canonically formatted) that produced the current
   * cube via importAlgorithm, if any. Cleared by any other action (paint,
   * reset, facelet import, undo, redo, hydrate) — deliberately scoped to
   * "still true right now," not tracked per history entry, to avoid
   * coupling the generic history stack to cube-specific provenance.
   */
  lastImportedAlgorithm: string | null
  hydrate: () => Promise<void>
  setSelectedColor: (color: FaceletColor) => void
  paintFacelet: (face: Face, facelet: number) => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
  reset: () => Promise<void>
  importFaceletString: (input: string) => Promise<FaceletParseResult>
  importAlgorithm: (algorithm: string, from: 'solved' | 'current') => Promise<CubeFromAlgorithmResult>
  exportFaceletString: () => string
}

async function persist(cube: CubeState): Promise<void> {
  await storage.set(STORAGE_KEY, cube)
}

export const useCubeEditorStore = create<CubeEditorState>((set, get) => ({
  history: createHistory(solved()),
  selectedColor: 'white',
  hydrated: false,
  lastImportedAlgorithm: null,

  hydrate: async () => {
    const saved = await storage.get<CubeState>(STORAGE_KEY)
    set({ history: createHistory(saved ?? solved()), hydrated: true, lastImportedAlgorithm: null })
  },

  setSelectedColor: (color) => set({ selectedColor: color }),

  paintFacelet: async (face, facelet) => {
    const cube = cloneCubeState(get().history.present)
    cube.facelets[face][facelet] = get().selectedColor
    const history = pushHistory(get().history, cube)
    set({ history, lastImportedAlgorithm: null })
    await persist(history.present)
  },

  undo: async () => {
    const history = undoHistory(get().history)
    set({ history, lastImportedAlgorithm: null })
    await persist(history.present)
  },

  redo: async () => {
    const history = redoHistory(get().history)
    set({ history, lastImportedAlgorithm: null })
    await persist(history.present)
  },

  reset: async () => {
    const history = resetHistory(solved())
    set({ history, lastImportedAlgorithm: null })
    await persist(history.present)
  },

  importFaceletString: async (input) => {
    const result = faceletStringFromInput(input, get().history.present.size)
    if (result.success) {
      const history = pushHistory(get().history, result.cube)
      set({ history, lastImportedAlgorithm: null })
      await persist(history.present)
    }
    return result
  },

  importAlgorithm: async (algorithm, from) => {
    const base = from === 'current' ? get().history.present : solved()
    const result = cubeFromAlgorithm(algorithm, base)
    if (result.success) {
      const history = pushHistory(get().history, result.cube)
      set({ history, lastImportedAlgorithm: formatAlgorithm(result.moves) })
      await persist(history.present)
    }
    return result
  },

  exportFaceletString: () => cubeToFaceletString(get().history.present),
}))

/** Convenience selectors so components don't need to know about HistoryStack. */
export const selectCube = (s: CubeEditorState): CubeState => s.history.present
export const selectCanUndo = (s: CubeEditorState): boolean => historyCanUndo(s.history)
export const selectCanRedo = (s: CubeEditorState): boolean => historyCanRedo(s.history)
