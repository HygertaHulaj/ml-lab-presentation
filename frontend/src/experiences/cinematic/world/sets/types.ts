import type * as THREE from 'three'

export interface FrameCtx {
  reduced: boolean
  camera: THREE.PerspectiveCamera
  aspect: number
}

/** A film set: built once, then updated as a pure function of film time. */
export interface FilmSet {
  readonly group: THREE.Group
  update(t: number, ctx: FrameCtx): void
  dispose(): void
}

/** World anchors (metres). The lab exists behind a real window of the hospital, so the fly-through needs no cut. */
export const F = 7.2 // lab floor height
export const LAB = { x0: -9, x1: 9, z0: -18, z1: -30, h: 3.6 }
export const DIG: [number, number, number] = [0, 300, 0]
export const JOURNEY_Z = -80

/** Collect geometries/materials/textures of a group for disposal. */
export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v && typeof v === 'object' && 'isTexture' in v) (v as THREE.Texture).dispose()
      mat.dispose()
    }
  })
}
