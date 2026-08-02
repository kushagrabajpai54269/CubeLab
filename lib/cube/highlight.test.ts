import { describe, it, expect } from 'vitest'
import { resolveAffectedFacelets } from './highlight'
import { CORNER_FACELETS, EDGE_FACELETS } from './tables'
import { faceletAt } from './state'

describe('resolveAffectedFacelets', () => {
  it('resolves a centers entity to the center facelet of each named face', () => {
    const refs = resolveAffectedFacelets({ kind: 'centers', faces: ['U', 'R'] }, 3)
    expect(refs).toEqual([
      { face: 'U', facelet: 4 },
      { face: 'R', facelet: 4 },
    ])
  })

  it('resolves a corners entity to exactly the 3 facelets of each named slot', () => {
    const refs = resolveAffectedFacelets({ kind: 'corners', slots: [0] }, 3)
    const expected = CORNER_FACELETS[0]!.map((flat) => faceletAt(flat, 3))
    expect(refs).toEqual(expected)
    expect(refs).toHaveLength(3)
  })

  it('resolves an edges entity to exactly the 2 facelets of each named slot', () => {
    const refs = resolveAffectedFacelets({ kind: 'edges', slots: [0] }, 3)
    const expected = EDGE_FACELETS[0]!.map((flat) => faceletAt(flat, 3))
    expect(refs).toEqual(expected)
    expect(refs).toHaveLength(2)
  })

  it('resolves multiple slots without dropping or merging any', () => {
    const refs = resolveAffectedFacelets({ kind: 'corners', slots: [0, 3] }, 3)
    expect(refs).toHaveLength(6)
  })

  it('returns an empty array for an empty slot/face list', () => {
    expect(resolveAffectedFacelets({ kind: 'corners', slots: [] }, 3)).toEqual([])
    expect(resolveAffectedFacelets({ kind: 'edges', slots: [] }, 3)).toEqual([])
    expect(resolveAffectedFacelets({ kind: 'centers', faces: [] }, 3)).toEqual([])
  })
})
