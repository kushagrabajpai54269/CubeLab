import type { Face } from './types'
import { faceletAt } from './state'
import { CORNER_FACELETS, EDGE_FACELETS } from './tables'
import type { AffectedEntities } from './validator'

export interface FaceletRef {
  face: Face
  facelet: number
}

/**
 * Turns a ValidationCheck's logical `affected` entities (corner/edge slot
 * indices, or center face labels) into the facelet coordinates they occupy.
 * Stays entirely within the cube library — no colors, no rendering, no
 * concept of a 2D net or a 3D mesh — so a future 3D cube view can reuse it
 * exactly as the 2D net does (D-035).
 */
export function resolveAffectedFacelets(affected: AffectedEntities, size: number): FaceletRef[] {
  switch (affected.kind) {
    case 'centers': {
      const centerIndex = Math.floor((size * size) / 2)
      return affected.faces.map((face) => ({ face, facelet: centerIndex }))
    }
    case 'corners':
      return affected.slots.flatMap((slot) => {
        const flatIndices = CORNER_FACELETS[slot]
        if (!flatIndices) return []
        return flatIndices.map((flat) => faceletAt(flat, size))
      })
    case 'edges':
      return affected.slots.flatMap((slot) => {
        const flatIndices = EDGE_FACELETS[slot]
        if (!flatIndices) return []
        return flatIndices.map((flat) => faceletAt(flat, size))
      })
  }
}
