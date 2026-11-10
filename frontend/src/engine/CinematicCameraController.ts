import { clamp, easeInOutCubic, lerp, lerp3 } from './easing'
import type { CameraKey, CameraPose } from './types'

/**
 * Camera pose as a pure function of timeline position. Keys are sorted by `t`; between two keys the pose is
 * eased, so scrubbing anywhere gives the same picture as playing to that point.
 * With `reducedMotion`, the camera cuts to each key instead of flying.
 */
export class CinematicCameraController {
  private keys: CameraKey[]

  constructor(keys: CameraKey[], private reducedMotion = false) {
    this.keys = [...keys].sort((a, b) => a.t - b.t)
    if (!this.keys.length) throw new Error('CinematicCameraController needs at least one key')
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v
  }

  poseAt(t: number): CameraPose {
    const k = this.keys
    if (t <= k[0].t) return pose(k[0])
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i], b = k[i + 1]
      if (t >= a.t && t <= b.t) {
        if (this.reducedMotion) return pose(t - a.t < (b.t - a.t) / 2 ? a : b)
        const p = easeInOutCubic(clamp((t - a.t) / (b.t - a.t || 1)))
        return { position: lerp3(a.position, b.position, p), target: lerp3(a.target, b.target, p), fov: lerp(a.fov, b.fov, p) }
      }
    }
    return pose(k[k.length - 1])
  }
}

const pose = (k: CameraPose): CameraPose => ({ position: [...k.position], target: [...k.target], fov: k.fov })
