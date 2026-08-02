import { describe, it, expect } from 'vitest'
import { createHistory, pushHistory, undoHistory, redoHistory, resetHistory, canUndo, canRedo } from './historyStack'

describe('historyStack', () => {
  it('starts with no undo/redo available', () => {
    const h = createHistory(0)
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe(0)
  })

  it('push moves the old present into past and clears future', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    expect(h.present).toBe('b')
    expect(h.past).toEqual(['a'])
    expect(h.future).toEqual([])
  })

  it('undo restores the previous present and queues a redo', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = pushHistory(h, 'c')
    h = undoHistory(h)
    expect(h.present).toBe('b')
    expect(h.past).toEqual(['a'])
    expect(h.future).toEqual(['c'])
  })

  it('redo re-applies an undone value', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = undoHistory(h)
    h = redoHistory(h)
    expect(h.present).toBe('b')
    expect(h.future).toEqual([])
  })

  it('undo is a no-op at the start of history', () => {
    const h = createHistory('a')
    expect(undoHistory(h)).toEqual(h)
  })

  it('redo is a no-op with nothing to redo', () => {
    const h = createHistory('a')
    expect(redoHistory(h)).toEqual(h)
  })

  it('a fresh push after an undo discards the old redo branch', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = pushHistory(h, 'c')
    h = undoHistory(h) // present: b, future: [c]
    h = pushHistory(h, 'd') // branches away from c
    expect(h.present).toBe('d')
    expect(h.past).toEqual(['a', 'b'])
    expect(h.future).toEqual([])
    expect(canRedo(h)).toBe(false)
  })

  it('branch invariant: undo then a new push permanently clears redo (cannot redo after branching)', () => {
    // Solved -> Paint A -> Paint B -> Undo -> Paint C -> attempt Redo
    let h = createHistory('solved')
    h = pushHistory(h, 'paintA')
    h = pushHistory(h, 'paintB')
    h = undoHistory(h) // back to paintA, paintB queued as redo
    expect(h.present).toBe('paintA')
    expect(canRedo(h)).toBe(true)

    h = pushHistory(h, 'paintC') // new branch, discards paintB
    expect(h.present).toBe('paintC')
    expect(canRedo(h)).toBe(false)

    const beforeRedoAttempt = h
    h = redoHistory(h) // must be a no-op — paintB is gone for good
    expect(h).toEqual(beforeRedoAttempt)
    expect(h.present).toBe('paintC')
  })

  it('reset clears both stacks back to a fresh value', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = undoHistory(h)
    h = resetHistory('z')
    expect(h).toEqual({ past: [], present: 'z', future: [] })
  })

  it('supports many sequential undo/redo steps without losing order', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i)
    for (let i = 0; i < 5; i++) h = undoHistory(h)
    expect(h.present).toBe(0)
    for (let i = 1; i <= 5; i++) {
      h = redoHistory(h)
      expect(h.present).toBe(i)
    }
  })
})
