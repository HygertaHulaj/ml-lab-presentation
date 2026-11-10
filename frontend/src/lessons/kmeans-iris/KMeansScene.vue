<script setup lang="ts">
/**
 * K-Means lesson scene. Lives inside <TresCanvas>; builds Three.js objects once and, every frame, writes the pure
 * state `stateAt(timeline, trace, t)` into them. Story mode: camera from CinematicCameraController. Lab mode: OrbitControls.
 */
import { SEMANTIC_HEX } from '../../presentation/theme'
import { inject, onBeforeUnmount, onMounted, shallowRef, watch, type ShallowRef } from 'vue'
import * as THREE from 'three'
import { useLoop, useTres } from '@tresjs/core'
import { gsap } from 'gsap'
import { useLessonStore } from '../../stores/lesson'
import { CinematicCameraController } from '../../engine/CinematicCameraController'
import { DataPointRenderer, glowTexture } from '../../engine/DataPointRenderer'
import { lerp, lerp3 } from '../../engine/easing'
import type { CameraPose, Vec3 } from '../../engine/types'
import { gardenLayout, stateAt, SPECIES_COLORS } from './state'
import type { KTimeline } from './timeline'

export interface OverlayLabel { id: string; x: number; y: number; text: string; kind: 'centroid' | 'distance' | 'axis' | 'axis-y' | 'tick' | 'focus'; color?: string; opacity: number }

const props = defineProps<{ reducedMotion: boolean }>()
const emit = defineEmits<{ contextlost: [] }>()
const overlay = inject<ShallowRef<OverlayLabel[]>>('lessonOverlay', shallowRef([]))
const orbitTarget = inject<ShallowRef<Vec3>>('orbitTarget', shallowRef<Vec3>([0, 0, 0]))
const store = useLessonStore()
const { scene, camera, renderer } = useTres()
const { onBeforeRender } = useLoop()

const root = new THREE.Group()
const disposables: { dispose: () => void }[] = []
const haloTex = glowTexture()
disposables.push(haloTex)
let points: DataPointRenderer | null = null
let petals: THREE.InstancedMesh | null = null
let stems: THREE.InstancedMesh | null = null
let ground: THREE.Mesh | null = null
let axes: THREE.LineSegments | null = null
let grid: THREE.LineSegments | null = null
let spokes: THREE.LineSegments | null = null
let dust: THREE.Points | null = null
const centroidMeshes: { core: THREE.Mesh; ring: THREE.Mesh; halo: THREE.Sprite; trail: THREE.Line }[] = []
const lineMeshes: THREE.Mesh[] = []
let cameraCtl: CinematicCameraController | null = null
let garden: Vec3[] = []
let builtFor: KTimeline | null = null
const blend = { v: 1, from: null as CameraPose | null }

// ------------------------------------------------------------------ build / rebuild for a timeline
function clearBuilt() {
  for (const obj of [...root.children]) root.remove(obj)
  points?.dispose()
  ;[petals, stems].forEach((m) => { if (m) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); m.dispose() } })
  ;[ground, axes, grid, spokes, dust, ...lineMeshes].forEach((o) => { if (o) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
  for (const c of centroidMeshes) [c.core, c.ring, c.trail].forEach((o) => { o.geometry.dispose(); (o.material as THREE.Material).dispose() })
  centroidMeshes.forEach((c) => (c.halo.material as THREE.Material).dispose())
  centroidMeshes.length = 0
  lineMeshes.length = 0
}

function build(tl: KTimeline) {
  clearBuilt()
  const trace = store.simulation!.trace
  const n = trace.n
  garden = gardenLayout(n)
  cameraCtl = new CinematicCameraController(tl.cameraKeys, props.reducedMotion)

  // garden: stems + 5 petals per flower, coloured by the (real) species — shown only in the intro
  const stemGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.9, 6)
  stemGeo.translate(0, 0.45, 0)
  stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#3f8f6b', roughness: 0.8 }), n)
  const petalGeo = new THREE.SphereGeometry(0.11, 10, 8)
  petalGeo.scale(1, 0.28, 0.55)
  petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, emissiveIntensity: 0.35 }), n * 5)
  const m = new THREE.Matrix4(), col = new THREE.Color()
  for (let i = 0; i < n; i++) {
    m.makeTranslation(garden[i][0], garden[i][1], garden[i][2])
    stems.setMatrixAt(i, m)
    for (let p = 0; p < 5; p++) petals.setColorAt(i * 5 + p, col.set(SPECIES_COLORS[trace.comparison_labels[i]] ?? '#cbd5e1'))
  }
  ;(petals.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#2a1640')
  root.add(stems, petals)

  const groundGeo = new THREE.CircleGeometry(14, 64)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#0b1a24', roughness: 1, transparent: true })
  ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -4.45, -3)
  root.add(ground)

  // axes frame + faint grid on the data plane
  const b = tl.coords.bounds
  const axisPts = [b.x0, b.y0, 0, b.x1, b.y0, 0, b.x0, b.y0, 0, b.x0, b.y1, 0]
  axes = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(axisPts, 3)),
    new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0 }))
  const g: number[] = []
  for (const tx of tl.coords.ticks.x) g.push(tx.s, b.y0, -0.01, tx.s, b.y1, -0.01)
  for (const ty of tl.coords.ticks.y) g.push(b.x0, ty.s, -0.01, b.x1, ty.s, -0.01)
  grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(g, 3)),
    new THREE.LineBasicMaterial({ color: '#1e3a5f', transparent: true, opacity: 0 }))
  root.add(grid, axes)

  points = new DataPointRenderer(n, 0.085, haloTex)
  root.add(points.group)

  // centroids: core + ring + halo + trail
  for (let j = 0; j < trace.k; j++) {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, toneMapped: false }))
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }))
    halo.scale.setScalar(1.6)
    const trailGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 400), 3))
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }))
    root.add(core, ring, halo, trail)
    centroidMeshes.push({ core, ring, halo, trail })
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, toneMapped: false }))
    line.geometry.translate(0, 0.5, 0)
    line.geometry.rotateX(Math.PI / 2)              // unit cylinder along +Z from 0 to 1, so lookAt + scale.z = length
    root.add(line)
    lineMeshes.push(line)
  }

  spokes = new THREE.LineSegments(new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3))
    .setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3)),
  new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }))
  root.add(spokes)

  // subtle atmosphere (disabled with reduced motion)
  const r = Math.random
  const dpos = new Float32Array(500 * 3).map((_, i) => (i % 3 === 1 ? (r() - 0.5) * 16 : (r() - 0.5) * 40))
  dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3)),
    new THREE.PointsMaterial({ color: '#7dd3fc', size: 0.035, transparent: true, opacity: 0.35, depthWrite: false }))
  root.add(dust)
  builtFor = tl
}

// ------------------------------------------------------------------ per-frame
// reused every frame — no per-frame allocation in the render loop
const tmpV = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3()
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpC = new THREE.Color()
function project(p: Vec3, cam: THREE.Camera, w: number, h: number) {
  tmpV.set(p[0], p[1], p[2]).project(cam)
  return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, behind: tmpV.z > 1 }
}

onBeforeRender(({ elapsed }) => {
  const tl = store.timeline, sim = store.simulation, cam = camera.value as THREE.PerspectiveCamera | undefined
  if (!tl || !sim || !cam) return
  if (builtFor !== tl) build(tl)
  const t = store.position
  const s = stateAt(tl, sim.trace, t, garden)
  const trace = sim.trace

  // camera — story/math: cinematic pose (blended in after leaving Lab); lab: OrbitControls own the camera
  if (store.mode !== 'lab' && cameraCtl) {
    let pose = cameraCtl.poseAt(t)
    if (blend.v < 1 && blend.from) pose = { position: lerp3(blend.from.position, pose.position, blend.v), target: lerp3(blend.from.target, pose.target, blend.v), fov: lerp(blend.from.fov, pose.fov, blend.v) }
    cam.position.set(...pose.position)
    cam.lookAt(...pose.target)
    if (Math.abs(cam.fov - pose.fov) > 0.01) { cam.fov = pose.fov; cam.updateProjectionMatrix() }
    orbitTarget.value = pose.target
  }

  // garden
  const intro = t < tl.scenes[1].start + 2
  if (stems && petals && ground) {
    stems.visible = petals.visible = ground.visible = intro
    if (intro) {
      const m = tmpM, q = tmpQ, sc = tmpS, pos = tmpP
      for (let i = 0; i < trace.n; i++) {
        const k = s.petalScale[i]
        const [gx, gy, gz] = s.flowerPositions[i]
        sc.set(1, k, 1)
        m.compose(pos.set(gx, gy, gz), q.identity(), sc)
        stems.setMatrixAt(i, m)
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 + i
          q.setFromEuler(tmpE.set(0.5, a, 0))
          pos.set(gx + Math.cos(a) * 0.1 * k, gy + 0.92, gz + Math.sin(a) * 0.1 * k)
          sc.setScalar(Math.max(0.0001, k))
          m.compose(pos, q, sc)
          petals.setMatrixAt(i * 5 + p, m)
        }
      }
      stems.instanceMatrix.needsUpdate = true
      petals.instanceMatrix.needsUpdate = true
      ;(ground.material as THREE.MeshStandardMaterial).opacity = 1 - s.axesOpacity
    }
  }
  ;(axes!.material as THREE.LineBasicMaterial).opacity = 0.9 * s.axesOpacity
  ;(grid!.material as THREE.LineBasicMaterial).opacity = 0.55 * s.axesOpacity

  points!.update(s.positions, s.colors, s.sizes, cam)

  // centroids, trails, distance lines
  const visible = new Set(s.centroids.map((c) => c.index))
  centroidMeshes.forEach((cm, j) => {
    const c = s.centroids.find((x) => x.index === j)
    const show = visible.has(j)
    cm.core.visible = cm.ring.visible = cm.halo.visible = cm.trail.visible = show
    if (!c) return
    cm.core.position.set(...c.pos); cm.ring.position.set(...c.pos); cm.halo.position.set(...c.pos)
    cm.core.scale.setScalar(c.scale); cm.ring.scale.setScalar(c.scale)
    cm.core.rotation.y = t * 0.8
    cm.ring.quaternion.copy(cam.quaternion)
    ;(cm.core.material as THREE.MeshBasicMaterial).color.set(c.color)
    ;(cm.ring.material as THREE.MeshBasicMaterial).color.set(c.color)
    ;(cm.halo.material as THREE.SpriteMaterial).color.set(c.color)
    const trail = s.trails[j] ?? []
    const arr = (cm.trail.geometry.getAttribute('position') as THREE.BufferAttribute)
    const len = Math.min(trail.length, 400)
    for (let p = 0; p < len; p++) arr.setXYZ(p, trail[p][0], trail[p][1], 0.01)
    arr.needsUpdate = true
    cm.trail.geometry.setDrawRange(0, len)
    ;(cm.trail.material as THREE.LineBasicMaterial).color.set(c.color)
  })
  lineMeshes.forEach((lm, j) => {
    const l = s.distanceLines.find((x) => x.centroid === j)
    lm.visible = !!l && l.grow > 0
    if (!l) return
    tmpV.set(...l.from); tmpA.set(...l.to)
    const length = tmpV.distanceTo(tmpA)
    lm.position.copy(tmpV)
    lm.lookAt(tmpA)
    lm.scale.set(l.nearest ? 1.6 : 1, l.nearest ? 1.6 : 1, Math.max(1e-4, length * l.grow))
    const mat = lm.material as THREE.MeshBasicMaterial
    mat.color.set(s.centroids.find((c) => c.index === j)?.color ?? '#fff')
    mat.opacity = l.opacity
  })

  // spokes during the update phase
  if (spokes) {
    const mat = spokes.material as THREE.LineBasicMaterial
    mat.opacity = s.spokes.opacity
    spokes.visible = s.spokes.opacity > 0.01 && !!s.spokes.labels
    if (spokes.visible && s.spokes.labels) {
      const pa = spokes.geometry.getAttribute('position') as THREE.BufferAttribute
      const ca = spokes.geometry.getAttribute('color') as THREE.BufferAttribute
      for (let i = 0; i < trace.n; i++) {
        const c = s.centroids.find((x) => x.index === s.spokes.labels![i])
        if (!c) continue
        pa.setXYZ(i * 2, s.positions[i * 3], s.positions[i * 3 + 1], 0)
        pa.setXYZ(i * 2 + 1, c.pos[0], c.pos[1], 0)
        const cc = tmpC.set(c.color)
        ca.setXYZ(i * 2, cc.r, cc.g, cc.b); ca.setXYZ(i * 2 + 1, cc.r, cc.g, cc.b)
      }
      pa.needsUpdate = ca.needsUpdate = true
    }
  }
  if (dust) {
    dust.visible = !props.reducedMotion
    ;(dust.material as THREE.PointsMaterial).opacity = 0.3 * s.dust
    dust.rotation.y = elapsed * 0.01
  }

  // overlay labels (projected to screen)
  const el = renderer.domElement
  const w = el.clientWidth, h = el.clientHeight
  const labels: OverlayLabel[] = []
  if (s.axesOpacity > 0.02) {
    const b = tl.coords.bounds
    const fx = project([(b.x0 + b.x1) / 2, b.y0 - 0.75, 0], cam, w, h)
    const fy = project([b.x0 - 0.75, (b.y0 + b.y1) / 2, 0], cam, w, h)
    labels.push({ id: 'ax-x', ...fx, text: pretty(trace.features[0]), kind: 'axis', opacity: s.axesOpacity })
    labels.push({ id: 'ax-y', ...fy, text: pretty(trace.features[1]), kind: 'axis-y', opacity: s.axesOpacity })
    for (const tx of tl.coords.ticks.x) labels.push({ id: 'tx' + tx.v, ...project([tx.s, b.y0 - 0.3, 0], cam, w, h), text: fmt(tx.v), kind: 'tick', opacity: s.axesOpacity * 0.8 })
    for (const ty of tl.coords.ticks.y) labels.push({ id: 'ty' + ty.v, ...project([b.x0 - 0.35, ty.s, 0], cam, w, h), text: fmt(ty.v), kind: 'tick', opacity: s.axesOpacity * 0.8 })
  }
  for (const c of s.centroids) labels.push({ id: 'mu' + c.index, ...project([c.pos[0] + 0.35, c.pos[1] + 0.4, 0], cam, w, h), text: `μ${sub(c.index + 1)}`, kind: 'centroid', color: c.color, opacity: c.scale })
  for (const l of s.distanceLines) if (l.showValue) {
    const mid: Vec3 = [(l.from[0] + l.to[0]) / 2, (l.from[1] + l.to[1]) / 2, 0.05]
    labels.push({ id: 'd' + l.centroid, ...project(mid, cam, w, h), text: `d = ${l.value.toFixed(3)}`, kind: 'distance', color: s.centroids.find((c) => c.index === l.centroid)?.color, opacity: l.opacity })
  }
  const focus = s.focus ?? (store.mode === 'lab' ? store.selectedPoint : null)
  if (focus !== null && focus !== undefined) {
    const p: Vec3 = [s.positions[focus * 3], s.positions[focus * 3 + 1], 0]
    const x = trace.points[focus]
    labels.push({ id: 'focus', ...project([p[0], p[1] - 0.45, 0], cam, w, h), text: `#${focus + 1} (${x[0].toFixed(1)}, ${x[1].toFixed(1)})`, kind: 'focus', opacity: 1 })
  }
  overlay.value = labels
})

const pretty = (f: string) => f.replace(/_cm$/, ' (cm)').replace(/_/g, ' ')
const fmt = (v: number) => (Math.abs(v) < 1e-9 ? '0' : Number(v.toFixed(2)).toString())
const sub = (n: number) => String(n).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('')

// ------------------------------------------------------------------ Lab ↔ Story camera handover
watch(() => store.mode, (m, old) => {
  const cam = camera.value as THREE.PerspectiveCamera | undefined
  if (!cam) return
  if (old === 'lab' && m !== 'lab') {
    // fly back from wherever the learner left the camera to the story pose at the current position
    const dir = new THREE.Vector3()
    cam.getWorldDirection(dir)
    const tgt = cam.position.clone().add(dir.multiplyScalar(15))
    blend.from = { position: [cam.position.x, cam.position.y, cam.position.z], target: [tgt.x, tgt.y, tgt.z], fov: cam.fov }
    blend.v = 0
    gsap.to(blend, { v: 1, duration: props.reducedMotion ? 0 : 1.2, ease: 'power2.inOut' })
  }
})
watch(() => props.reducedMotion, (v) => cameraCtl?.setReducedMotion(v))

// ------------------------------------------------------------------ picking (Lab & Math)
const raycaster = new THREE.Raycaster()
let down = { x: 0, y: 0 }
function onDown(ev: PointerEvent) { down = { x: ev.clientX, y: ev.clientY } }
function onUp(ev: PointerEvent) {
  if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 5 || store.mode === 'story' || !points) return
  const el = renderer.domElement
  const rect = el.getBoundingClientRect()
  const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera.value as THREE.Camera)
  const hit = raycaster.intersectObject(points.points, false)[0]
  store.selectedPoint = hit?.instanceId ?? null
}
function onLost(ev: Event) { ev.preventDefault(); emit('contextlost') }

onMounted(() => {
  scene.value.add(root)
  scene.value.fog = new THREE.FogExp2(SEMANTIC_HEX.ground, 0.028)
  const amb = new THREE.AmbientLight('#8fb3ff', 0.6)
  const key = new THREE.PointLight('#a78bfa', 40, 40)
  key.position.set(-4, 4, 6)
  const fill = new THREE.PointLight('#22d3ee', 25, 40)
  fill.position.set(6, -2, 5)
  root.parent?.add(amb, key, fill)
  disposables.push({ dispose: () => { scene.value.remove(amb, key, fill) } })
  const el = renderer.domElement
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('webglcontextlost', onLost)
})

onBeforeUnmount(() => {
  const el = renderer.domElement
  el.removeEventListener('pointerdown', onDown)
  el.removeEventListener('pointerup', onUp)
  el.removeEventListener('webglcontextlost', onLost)
  gsap.killTweensOf(blend)
  clearBuilt()
  scene.value.remove(root)
  disposables.forEach((d) => d.dispose())
})
</script>

<template>
  <!-- everything is created imperatively above; this component renders no Tres elements of its own -->
  <TresGroup />
</template>
