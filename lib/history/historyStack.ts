/**
 * A minimal, generic undo/redo stack. Deliberately has no knowledge of
 * cubes or any other domain — Subsystem 2 is the first consumer, but any
 * future editor-like feature (import staging, algorithm authoring, etc.)
 * can reuse this as-is (D-033).
 *
 * Pure and immutable: every function returns a new HistoryStack rather
 * than mutating its input, matching the Move Engine's own immutability
 * convention.
 */
export interface HistoryStack<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(initial: T): HistoryStack<T> {
  return { past: [], present: initial, future: [] }
}

/** Records a new present value, discarding any redo branch. */
export function pushHistory<T>(history: HistoryStack<T>, next: T): HistoryStack<T> {
  return { past: [...history.past, history.present], present: next, future: [] }
}

export function canUndo<T>(history: HistoryStack<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: HistoryStack<T>): boolean {
  return history.future.length > 0
}

export function undoHistory<T>(history: HistoryStack<T>): HistoryStack<T> {
  if (!canUndo(history)) return history
  const previous = history.past[history.past.length - 1] as T
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoHistory<T>(history: HistoryStack<T>): HistoryStack<T> {
  if (!canRedo(history)) return history
  const next = history.future[0] as T
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

/** Resets to a fresh value and clears both stacks. */
export function resetHistory<T>(initial: T): HistoryStack<T> {
  return createHistory(initial)
}
