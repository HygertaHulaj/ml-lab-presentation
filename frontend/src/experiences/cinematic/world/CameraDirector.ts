/**
 * Cinematic camera director. Each shot is a centripetal Catmull-Rom spline for the camera position and another
 * for the look-at target, with its own easing and lens. The pose is a pure function of film time, so play,
 * scrub and reverse always give the same frame.
 *
 * Shot hand-offs: during the first `blend` seconds of a shot the camera position is lerped and its orientation
 * slerped (quaternions) from the previous shot's final pose, so consecutive shots never jump unless a shot sets
 * `cut: true` (used behind full-screen transitions).
 *
 * Reduced motion: every shot is held at a single composed frame (its `hold` point, default 60%), so the camera
 * cuts between still compositions instead of flying.
 */
import * as THREE from 'three'
import { clamp, easeInOutCubic, easeInOutSine, easeOutCubic, type V3 } from './math'

export type Ease = 'sine' | 'cubic' | 'out' | 'linear'
export interface ShotPath {
  id: string
  start: number
  end: number
  path: V3[]
  look: V3[]
  fov: [number, number]
  ease?: Ease
  /** seconds of blend from the previous shot (0 = cut) */
  blend?: number
  cut?: boolean
  /** camera roll in radians, start→end */
  roll?: [number, number]
  hold?: number
}
export interface CameraState { position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number; shotId: string }

const EASE: Record<Ease, (p: number) => number> = { sine: easeInOutSine, cubic: easeInOutCubic, out: easeOutCubic, linear: (p) => p }
const UP = new THREE.Vector3(0, 1, 0)

interface Compiled { def: ShotPath; pos: THREE.CatmullRomCurve3 | null; look: THREE.CatmullRomCurve3 | null }

export class CameraDirector {
  private shots: Compiled[]
  private m = new THREE.Matrix4()
  private tmpA = new THREE.Vector3()
  private tmpB = new THREE.Vector3()

  constructor(shots: ShotPath[], public reducedMotion = false) {
    if (!shots.length) throw new Error('CameraDirector needs at least one shot')
    this.shots = [...shots].sort((a, b) => a.start - b.start).map((def) => ({
      def,
      pos: def.path.length > 1 ? new THREE.CatmullRomCurve3(def.path.map((p) => new THREE.Vector3(...p)), false, 'centripetal') : null,
      look: def.look.length > 1 ? new THREE.CatmullRomCurve3(def.look.map((p) => new THREE.Vector3(...p)), false, 'centripetal') : null,
    }))
  }

  shotIndexAt(t: number): number {
    for (let i = this.shots.length - 1; i >= 0; i--) if (t >= this.shots[i].def.start) return i
    return 0
  }

  /** Raw pose of a shot at local progress p (0..1), without blending. */
  private raw(c: Compiled, p: number, out: CameraState) {
    const d = c.def
    const e = EASE[d.ease ?? 'sine'](clamp(p))
    if (c.pos) c.pos.getPoint(e, out.position)
    else out.position.set(...d.path[0])
    const target = c.look ? c.look.getPoint(e, this.tmpA) : this.tmpA.set(...d.look[0])
    this.m.lookAt(out.position, target, UP)
    out.quaternion.setFromRotationMatrix(this.m)
    const roll = d.roll ? d.roll[0] + (d.roll[1] - d.roll[0]) * e : 0
    if (roll) out.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll))
    out.fov = d.fov[0] + (d.fov[1] - d.fov[0]) * e
  }

  poseAt(t: number, out?: CameraState): CameraState {
    const res = out ?? { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 45, shotId: '' }
    const i = this.shotIndexAt(t)
    const c = this.shots[i]
    const d = c.def
    res.shotId = d.id
    if (this.reducedMotion) {
      this.raw(c, d.hold ?? 0.6, res)
      return res
    }
    const p = (t - d.start) / (d.end - d.start || 1)
    this.raw(c, p, res)
    const blend = d.cut ? 0 : d.blend ?? 0.8
    if (i > 0 && blend > 0 && t - d.start < blend) {
      const prev: CameraState = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 45, shotId: '' }
      this.raw(this.shots[i - 1], 1, prev)
      const b = easeInOutSine(clamp((t - d.start) / blend))
      this.tmpB.copy(res.position)
      res.position.copy(prev.position).lerp(this.tmpB, b)
      res.quaternion.copy(prev.quaternion.slerp(res.quaternion, b))
      res.fov = prev.fov + (res.fov - prev.fov) * b
    }
    return res
  }
}
