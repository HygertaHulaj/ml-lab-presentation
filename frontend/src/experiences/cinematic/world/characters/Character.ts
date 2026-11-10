/**
 * Procedural stylised character rig (prototype stand-in for a Blender-rigged GLB, see docs/06-the-scan/05-characters.md).
 * A joint hierarchy of THREE.Groups drives capsule limbs; the face has blinking eyes with pupils that track a target,
 * brows and a mouth that blend between expressions, and lip movement while talking.
 * All state is set from film time by the choreography, so every pose is reproducible when scrubbing.
 */
import * as THREE from 'three'
import { clamp, lerp, rng } from '../math'
import { POSES, EXPRESSIONS, type Expression, type ExpressionName, type Joint, type Pose, type PoseName } from './poses'
import { rimMaterial } from '../materials'

export interface CharacterSpec {
  name: string
  skin: string
  hair: string
  hairStyle: 'curly' | 'bun' | 'short'
  top: string
  /** long lab coat colour (omitted = no coat) */
  coat?: string
  pants: string
  shoes: string
  scale?: number
  glasses?: boolean
  accessory?: 'tablet' | 'stethoscope' | 'none'
  lanyard?: string
}

export interface CharacterState {
  /** weighted pose blend, e.g. [['idle',1],['point',0.6]] */
  poses: [PoseName, number][]
  walk?: { phase: number; amount: number }
  expression: [ExpressionName, number][]
  lookAt?: THREE.Vector3 | null
  /** 0..1 mouth activity while speaking */
  talk?: number
  /** film time, for breathing, blinking and lip movement */
  t: number
  nod?: number
}

const J: Joint[] = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR']

const geo = {
  limb: new THREE.CapsuleGeometry(0.055, 0.22, 4, 10),
  forearm: new THREE.CapsuleGeometry(0.048, 0.2, 4, 10),
  thigh: new THREE.CapsuleGeometry(0.075, 0.32, 4, 10),
  shin: new THREE.CapsuleGeometry(0.062, 0.32, 4, 10),
  hand: new THREE.SphereGeometry(0.05, 12, 10),
  foot: new THREE.BoxGeometry(0.11, 0.07, 0.22, 2, 1, 2),
  torso: new THREE.CapsuleGeometry(0.17, 0.26, 6, 16),
  pelvis: new THREE.CapsuleGeometry(0.14, 0.08, 4, 12),
  head: new THREE.SphereGeometry(0.165, 32, 24),
  eye: new THREE.SphereGeometry(0.03, 16, 12),
  pupil: new THREE.SphereGeometry(0.017, 12, 10),
  brow: new THREE.BoxGeometry(0.065, 0.013, 0.014),
  nose: new THREE.SphereGeometry(0.022, 12, 10),
  ear: new THREE.SphereGeometry(0.035, 12, 10),
  arc: new THREE.TorusGeometry(0.036, 0.0075, 6, 20, Math.PI),
  mouthO: new THREE.SphereGeometry(0.03, 12, 10),
  curl: new THREE.SphereGeometry(0.06, 12, 10),
  cap: new THREE.SphereGeometry(0.176, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
  bun: new THREE.SphereGeometry(0.075, 14, 12),
  coat: new THREE.CylinderGeometry(0.2, 0.3, 0.78, 20, 1, true),
  lens: new THREE.TorusGeometry(0.043, 0.006, 6, 20),
  tablet: new THREE.BoxGeometry(0.2, 0.28, 0.014),
  tabletScreen: new THREE.PlaneGeometry(0.18, 0.25),
  steth: new THREE.TorusGeometry(0.12, 0.009, 6, 24, Math.PI * 1.3),
  badge: new THREE.BoxGeometry(0.05, 0.07, 0.006),
  neck: new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10),
}

export class Character {
  readonly root = new THREE.Group()
  readonly joints = {} as Record<Joint, THREE.Group>
  private eyes: THREE.Mesh[] = []
  private pupils: THREE.Mesh[] = []
  private brows: THREE.Mesh[] = []
  private smile!: THREE.Mesh
  private mouthO!: THREE.Mesh
  private materials: THREE.Material[] = []
  private blinkSeed: number
  tabletScreen: THREE.Mesh | null = null
  private tmp = new THREE.Vector3()
  private hipsY = 0.92

  constructor(readonly spec: CharacterSpec) {
    this.blinkSeed = spec.name.length * 1.7
    for (const j of J) this.joints[j] = new THREE.Group()
    const jt = this.joints
    const mat = (c: string, rough = 0.62) => { const m = rimMaterial(c, rough); this.materials.push(m); return m }
    const skin = mat(spec.skin, 0.5), top = mat(spec.top), pants = mat(spec.pants, 0.75), shoes = mat(spec.shoes, 0.4), hair = mat(spec.hair, 0.8)
    const sleeve = spec.coat ? mat(spec.coat, 0.7) : top
    const white = new THREE.MeshStandardMaterial({ color: '#f4f7fb', roughness: 0.3 })
    const dark = new THREE.MeshStandardMaterial({ color: '#161b26', roughness: 0.25 })
    const browM = mat(spec.hair, 0.9)
    const lip = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.skin).multiplyScalar(0.55), roughness: 0.5 })
    this.materials.push(white, dark, lip)
    const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s?: [number, number, number], r?: [number, number, number]) => {
      const mesh = new THREE.Mesh(g, m)
      mesh.position.set(...p)
      if (s) mesh.scale.set(...s)
      if (r) mesh.rotation.set(...r)
      mesh.castShadow = true
      parent.add(mesh)
      return mesh
    }

    // hierarchy
    jt.hips.position.y = this.hipsY
    this.root.add(jt.hips)
    jt.hips.add(jt.spine); jt.spine.position.y = 0.06
    jt.spine.add(jt.chest); jt.chest.position.y = 0.2
    jt.chest.add(jt.neck); jt.neck.position.y = 0.27
    jt.neck.add(jt.head); jt.head.position.y = 0.08
    jt.chest.add(jt.shL, jt.shR); jt.shL.position.set(0.215, 0.19, 0); jt.shR.position.set(-0.215, 0.19, 0)
    jt.shL.add(jt.elL); jt.elL.position.y = -0.3
    jt.shR.add(jt.elR); jt.elR.position.y = -0.3
    jt.hips.add(jt.hipL, jt.hipR); jt.hipL.position.set(0.095, -0.04, 0); jt.hipR.position.set(-0.095, -0.04, 0)
    jt.hipL.add(jt.knL); jt.knL.position.y = -0.43
    jt.hipR.add(jt.knR); jt.knR.position.y = -0.43

    // body
    add(jt.hips, geo.pelvis, pants, [0, 0.02, 0], [1, 1, 0.75], [0, 0, Math.PI / 2])
    add(jt.chest, geo.torso, top, [0, 0.05, 0], [1, 1, 0.72])
    add(jt.chest, geo.neck, skin, [0, 0.25, 0])
    if (spec.coat) {
      const coatM = mat(spec.coat, 0.7)
      coatM.side = THREE.DoubleSide
      add(jt.chest, geo.coat, coatM, [0, -0.2, 0], [1, 1, 0.78])
    }
    if (spec.lanyard) {
      add(jt.chest, geo.badge, mat(spec.lanyard, 0.4), [0.06, -0.02, 0.13])
    }
    for (const [sh, el] of [[jt.shL, jt.elL], [jt.shR, jt.elR]] as const) {
      add(sh, geo.limb, sleeve, [0, -0.15, 0])
      add(el, geo.forearm, sleeve, [0, -0.13, 0])
      add(el, geo.hand, skin, [0, -0.29, 0.01], [0.9, 1.1, 0.8])
    }
    for (const [hip, kn] of [[jt.hipL, jt.knL], [jt.hipR, jt.knR]] as const) {
      add(hip, geo.thigh, pants, [0, -0.21, 0])
      add(kn, geo.shin, pants, [0, -0.2, 0])
      add(kn, geo.foot, shoes, [0, -0.42, 0.05])
    }

    // head & face (head joint at neck top; face looks +z)
    const h = jt.head
    add(h, geo.head, skin, [0, 0.15, 0], [1, 1.04, 0.98])
    add(h, geo.ear, skin, [0.16, 0.14, 0], [0.5, 1, 0.8])
    add(h, geo.ear, skin, [-0.16, 0.14, 0], [0.5, 1, 0.8])
    add(h, geo.nose, mat(new THREE.Color(spec.skin).multiplyScalar(0.92).getStyle(), 0.5), [0, 0.12, 0.165], [1, 1.1, 1])
    for (const sx of [1, -1]) {
      const e = add(h, geo.eye, white, [sx * 0.058, 0.17, 0.142])
      const p = add(e, geo.pupil, dark, [0, 0, 0.02])
      this.eyes.push(e)
      this.pupils.push(p)
      this.brows.push(add(h, geo.brow, browM, [sx * 0.06, 0.225, 0.152]))
    }
    this.smile = add(h, geo.arc, lip, [0, 0.07, 0.155], [1, 1, 0.6], [0, 0, Math.PI])
    this.mouthO = add(h, geo.mouthO, dark, [0, 0.065, 0.152], [1, 0.1, 0.4])

    // hair
    const r = rng(spec.name.charCodeAt(0) * 31)
    if (spec.hairStyle === 'curly') {
      add(h, geo.cap, hair, [0, 0.17, -0.01], [1.02, 1, 1.02], [-0.25, 0, 0])
      for (let i = 0; i < 18; i++) {
        const a = r() * Math.PI * 2, el = 0.35 + r() * 0.9
        add(h, geo.curl, hair, [Math.cos(a) * Math.cos(el) * 0.16, 0.17 + Math.sin(el) * 0.15, Math.sin(a) * Math.cos(el) * 0.16 - 0.03], [1, 0.9, 1])
      }
    } else if (spec.hairStyle === 'bun') {
      add(h, geo.cap, hair, [0, 0.16, -0.012], [1.03, 1.02, 1.04], [-0.32, 0, 0])
      add(h, geo.bun, hair, [0, 0.27, -0.15])
    } else {
      add(h, geo.cap, hair, [0, 0.165, -0.015], [1.02, 0.95, 1.03], [-0.3, 0, 0])
    }
    if (spec.glasses) {
      const frame = new THREE.MeshStandardMaterial({ color: '#2a2f3a', metalness: 0.6, roughness: 0.3 })
      this.materials.push(frame)
      for (const sx of [1, -1]) add(h, geo.lens, frame, [sx * 0.058, 0.17, 0.168])
    }
    if (spec.accessory === 'stethoscope') {
      const m = new THREE.MeshStandardMaterial({ color: '#30384a', metalness: 0.4, roughness: 0.35 })
      this.materials.push(m)
      add(jt.chest, geo.steth, m, [0, 0.12, 0.05], [1, 1, 0.9], [Math.PI / 2 + 0.25, 0, -0.65])
    }
    if (spec.accessory === 'tablet') {
      const body = add(jt.elL, geo.tablet, dark, [-0.04, -0.3, 0.07], undefined, [-1.2, 0, 0.25])
      const screenM = new THREE.MeshBasicMaterial({ color: '#7fe3ff', toneMapped: false })
      this.materials.push(screenM)
      this.tabletScreen = add(body, geo.tabletScreen, screenM, [0, 0, 0.008])
    }
    this.root.scale.setScalar(spec.scale ?? 1)
  }

  setState(s: CharacterState) {
    const jt = this.joints
    for (const j of J) jt[j].rotation.set(0, 0, 0)
    let hipDrop = 0
    let total = 0
    for (const [, w] of s.poses) total += w
    for (const [name, w0] of s.poses) {
      const w = total > 0 ? w0 / Math.max(1, total) : 0
      const p: Pose = POSES[name]
      for (const j of J) {
        const r = p[j]
        if (r) { jt[j].rotation.x += r[0] * w; jt[j].rotation.y += r[1] * w; jt[j].rotation.z += r[2] * w }
      }
      hipDrop += (p.hipDrop ?? 0) * w
    }
    // breathing
    const br = Math.sin(s.t * 1.6 + this.blinkSeed) * 0.012
    jt.chest.rotation.x += br
    jt.shL.rotation.z += br * 0.6
    jt.shR.rotation.z -= br * 0.6
    // walk cycle
    let bob = 0
    if (s.walk && s.walk.amount > 0) {
      const a = s.walk.amount, ph = s.walk.phase
      const sw = Math.sin(ph)
      jt.hipL.rotation.x += -sw * 0.5 * a
      jt.hipR.rotation.x += sw * 0.5 * a
      jt.knL.rotation.x += Math.max(0, Math.sin(ph + 1.4)) * 0.85 * a
      jt.knR.rotation.x += Math.max(0, Math.sin(ph + Math.PI + 1.4)) * 0.85 * a
      jt.shL.rotation.x += sw * 0.38 * a
      jt.shR.rotation.x += -sw * 0.38 * a
      jt.elL.rotation.x += -0.25 * a
      jt.elR.rotation.x += -0.25 * a
      jt.hips.rotation.y += sw * 0.08 * a
      jt.chest.rotation.y += -sw * 0.1 * a
      bob = Math.abs(Math.cos(ph)) * 0.035 * a
    }
    jt.hips.position.y = this.hipsY - hipDrop + bob
    // nod
    if (s.nod) jt.head.rotation.x += Math.max(0, Math.sin(s.t * 7)) * 0.18 * s.nod
    // look-at (head 70 %, neck 30 %), pupils follow
    if (s.lookAt) {
      this.root.updateMatrixWorld(true)
      const local = this.tmp.copy(s.lookAt)
      jt.neck.worldToLocal(local)
      local.y -= 0.23
      const yaw = clamp(Math.atan2(local.x, local.z), -1.1, 1.1)
      const pitch = clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.55, 0.5)
      jt.neck.rotation.y += yaw * 0.3
      jt.head.rotation.y += yaw * 0.7
      jt.head.rotation.x += pitch * 0.8
      for (const p of this.pupils) p.position.set(clamp(yaw * 0.012, -0.008, 0.008), clamp(-pitch * 0.012, -0.007, 0.007), 0.02)
    }
    // face
    let browY = 0, browA = 0, browAsym = 0, curve = 0, open = 0, eyeOpen = 1
    let ew = 0
    for (const e of s.expression) ew += e[1]
    for (const [n, w0] of s.expression) {
      const w = ew > 0 ? w0 / ew : 0
      const e: Expression = EXPRESSIONS[n]
      browY += e.browY * w; browA += e.browAngle * w; browAsym += (e.browAsym ?? 0) * w; curve += e.mouth * w; open += (e.open ?? 0) * w; eyeOpen += ((e.eye ?? 1) - 1) * w
    }
    this.brows.forEach((b, i) => {
      const side = i === 0 ? 1 : -1
      b.position.y = 0.225 + browY + (i === 0 ? browAsym : 0)
      b.rotation.z = side * browA
    })
    // blinking: quick 0.14 s closures at deterministic pseudo-random intervals
    const period = 3.4 + (this.blinkSeed % 1.3)
    const ph = (s.t + this.blinkSeed) % period
    const blink = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0
    for (const e of this.eyes) e.scale.set(1, Math.max(0.08, eyeOpen * (1 - blink * 0.92)), 1)
    // talking: syllable-like mouth motion
    const talk = s.talk ?? 0
    const syll = talk > 0 ? (0.5 + 0.5 * Math.sin(s.t * 17.3) * Math.sin(s.t * 6.1 + 1)) * talk : 0
    const o = clamp(open + syll * 0.9)
    this.mouthO.scale.set(lerp(0.8, 1, o), lerp(0.08, 0.75, o), 0.4)
    this.mouthO.visible = o > 0.05
    if (curve >= 0) { this.smile.rotation.z = Math.PI; this.smile.scale.set(lerp(0.75, 1.05, curve), Math.max(0.22, curve), 0.6) }
    else { this.smile.rotation.z = 0; this.smile.scale.set(0.8, Math.max(0.22, -curve * 0.7), 0.6); }
    this.smile.position.y = curve >= 0 ? 0.075 : 0.05
  }

  /** Make every material fade (for the dissolve in scene 8). */
  setOpacity(o: number) {
    for (const m of this.materials) { m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o > 0.5 }
    this.root.visible = o > 0.01
  }

  dispose() {
    this.materials.forEach((m) => m.dispose())
  }
}

export function disposeSharedCharacterGeometry() {
  Object.values(geo).forEach((g) => g.dispose())
}

export const CAST: Record<'noe' | 'salizar' | 'specialist' | 'radA' | 'radB', CharacterSpec> = {
  noe: { name: 'Noé', skin: '#d9a57b', hair: '#2a1d17', hairStyle: 'curly', top: '#2f8f9d', pants: '#29344a', shoes: '#e9edf3', accessory: 'tablet', lanyard: '#f2b54a', scale: 1 },
  salizar: { name: 'Dr. Salizar', skin: '#b97a55', hair: '#1b1412', hairStyle: 'bun', top: '#3c4a6e', coat: '#eef2f7', pants: '#1f2638', shoes: '#30333d', accessory: 'stethoscope', glasses: false, scale: 1.04 },
  specialist: { name: 'Dr. Haddad', skin: '#8d5a3c', hair: '#9aa0a8', hairStyle: 'short', top: '#5a6b8c', coat: '#24345a', pants: '#1c2233', shoes: '#22252c', glasses: true, accessory: 'none', scale: 1.06 },
  radA: { name: 'Radiologist A', skin: '#c48d69', hair: '#3a2a22', hairStyle: 'short', top: '#3d6f8f', coat: '#e6ebf2', pants: '#252d40', shoes: '#2b2e36', glasses: true, scale: 1 },
  radB: { name: 'Radiologist B', skin: '#e0b494', hair: '#6b4a2e', hairStyle: 'bun', top: '#6e5a8f', pants: '#252d40', shoes: '#2b2e36', scale: 0.98 },
}
