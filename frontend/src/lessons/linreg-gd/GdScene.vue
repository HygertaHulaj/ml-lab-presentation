<script setup lang="ts">
/**
 * Regression / gradient-descent lesson scene. Lives inside <TresCanvas>; builds Three.js objects once per part and,
 * every frame, writes the pure state `stateAt(timeline, parts, traces, t)` into them.
 * Plane parts: points stand in a 3D box, the regression plane tilts into place, residuals hang from it.
 * Line parts: points on a 2D plot (left), the line swings into place; the cost bowl J(θ₀, θ₁) (right, sampled by the
 * backend) with a ball rolling along the recorded descent path. Story: CinematicCameraController. Lab: OrbitControls.
 */
import { SEMANTIC_HEX } from '../../presentation/theme'
import { inject, onBeforeUnmount, onMounted, shallowRef, watch, type ShallowRef } from 'vue'
import * as THREE from 'three'
import { useLoop, useTres } from '@tresjs/core'
import { gsap } from 'gsap'
import { useLinregLessonStore } from '../../stores/linregLesson'
import { CinematicCameraController } from '../../engine/CinematicCameraController'
import { DataPointRenderer, glowTexture } from '../../engine/DataPointRenderer'
import { clamp, lerp, lerp3 } from '../../engine/easing'
import type { CameraPose, Vec3 } from '../../engine/types'
import type { OverlayLabel } from '../kmeans-iris/KMeansScene.vue'
import { fittedAt, makeCoords, stateAt, type Coords } from './state'
import type { GdTimeline } from './timeline'
import type { LinRegTrace } from './types'

const props = defineProps<{ reducedMotion: boolean }>()
const emit = defineEmits<{ contextlost: [] }>()
const overlay = inject<ShallowRef<OverlayLabel[]>>('lessonOverlay', shallowRef([]))
const orbitTarget = inject<ShallowRef<Vec3>>('orbitTarget', shallowRef<Vec3>([0, 0, 0]))
const store = useLinregLessonStore()
const { scene, camera, renderer } = useTres()
const { onBeforeRender } = useLoop()

// semantic roles shared with the panels and the presentation (presentation/theme.ts); the 3D stage is always dark
const COLORS = { point: SEMANTIC_HEX.obs, fit: SEMANTIC_HEX.pred, ols: SEMANTIC_HEX.ref, res: SEMANTIC_HEX.err, ball: SEMANTIC_HEX.surface, axis: SEMANTIC_HEX.axis, grid: '#1e3a5f' }
const root = new THREE.Group()
const partRoot = new THREE.Group()
root.add(partRoot)
const haloTex = glowTexture()
let cameraCtl: CinematicCameraController | null = null
let builtTl: GdTimeline | null = null
let builtPart = -1
let coords: Coords | null = null
let points: DataPointRenderer | null = null
let positions = new Float32Array(0), colors = new Float32Array(0), sizes = new Float32Array(0)
let planeMesh: THREE.Mesh | null = null, planeWire: THREE.LineSegments | null = null, olsWire: THREE.LineSegments | null = null
let lineMesh: THREE.Mesh | null = null, olsLine: THREE.Line | null = null
let residuals: THREE.LineSegments | null = null
let bowl: THREE.Mesh | null = null, bowlWire: THREE.LineSegments | null = null
let ball: THREE.Mesh | null = null, ballHalo: THREE.Sprite | null = null, trail: THREE.Line | null = null, minRing: THREE.Mesh | null = null
const blend = { v: 1, from: null as CameraPose | null }
const PN = 18 // plane grid resolution
const WIRE_FLOATS = 2 * (PN + 1) * PN * 2 * 3 // rows and columns of grid segments, 2 vertices of 3 floats each
const gridV = new Float32Array((PN + 1) * (PN + 1) * 3)

/** write the plane y = a + s1·x1 + s2·x2 over the data box: optionally into a mesh's vertices, always into a wire buffer */
function writePlane(c: Coords, wire: THREE.BufferGeometry, mesh: THREE.BufferGeometry | null, a: number, sl: number[]) {
  if (!c.x2) return
  for (let i = 0; i <= PN; i++) for (let j = 0; j <= PN; j++) {
    const x1 = c.x1.lo + ((c.x1.hi - c.x1.lo) * j) / PN, x2 = c.x2.lo + ((c.x2.hi - c.x2.lo) * i) / PN
    const v = c.point(x1, x2, clamp(fittedAt(a, sl, x1, x2), c.y.lo, c.y.hi))
    const k = (i * (PN + 1) + j) * 3
    gridV[k] = v[0]; gridV[k + 1] = v[1]; gridV[k + 2] = v[2]
  }
  if (mesh) {
    const pos = mesh.getAttribute('position') as THREE.BufferAttribute
    pos.array.set(gridV); pos.needsUpdate = true
  }
  const w = (wire.getAttribute('position') as THREE.BufferAttribute)
  const arr = w.array as Float32Array
  let o = 0
  const put = (k: number) => { arr[o++] = gridV[k]; arr[o++] = gridV[k + 1]; arr[o++] = gridV[k + 2] }
  for (let i = 0; i <= PN; i++) for (let j = 0; j < PN; j++) { put((i * (PN + 1) + j) * 3); put((i * (PN + 1) + j + 1) * 3) }
  for (let j = 0; j <= PN; j++) for (let i = 0; i < PN; i++) { put((i * (PN + 1) + j) * 3); put(((i + 1) * (PN + 1) + j) * 3) }
  w.needsUpdate = true
}

function disposeObj(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh
    m.geometry?.dispose()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  })
}
function clearPart() {
  for (const o of [...partRoot.children]) { partRoot.remove(o); disposeObj(o) }
  points?.dispose()
  points = null
  planeMesh = planeWire = olsWire = null
  lineMesh = olsLine = null
  residuals = bowl = bowlWire = null
  ball = trail = minRing = null
  ballHalo = null
}
const lineSeg = (pts: number[], color: string, opacity = 1) => new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
  new THREE.LineBasicMaterial({ color, transparent: true, opacity }))

function buildPart(pi: number, tr: LinRegTrace) {
  clearPart()
  const part = store.manifest!.parts[pi]
  const c = makeCoords(part, tr)
  coords = c
  const n = tr.n
  positions = new Float32Array(n * 3); colors = new Float32Array(n * 3); sizes = new Float32Array(n)
  points = new DataPointRenderer(n, n > 100 ? 0.065 : 0.09, haloTex)
  partRoot.add(points.group)
  const b = c.box
  if (c.kind === 'plane') {
    const [x0, x1] = b.x, [y0, y1] = b.y, [z0, z1] = b.z
    const e = [x0, y0, z0, x1, y0, z0, x1, y0, z0, x1, y0, z1, x1, y0, z1, x0, y0, z1, x0, y0, z1, x0, y0, z0,
      x0, y0, z0, x0, y1, z0, x0, y0, z1, x0, y1, z1, x1, y0, z0, x1, y1, z0]
    partRoot.add(lineSeg(e, COLORS.axis, 0.7))
    const g: number[] = []
    for (let i = 1; i < 6; i++) { const x = x0 + ((x1 - x0) * i) / 6, z = z0 + ((z1 - z0) * i) / 6; g.push(x, y0, z0, x, y0, z1, x0, y0, z, x1, y0, z) }
    partRoot.add(lineSeg(g, COLORS.grid, 0.8))
    const geo = new THREE.PlaneGeometry(1, 1, PN, PN)
    planeMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COLORS.fit, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }))
    const wireGeo = () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(WIRE_FLOATS), 3))
    planeWire = new THREE.LineSegments(wireGeo(), new THREE.LineBasicMaterial({ color: COLORS.fit, transparent: true, opacity: 0.5 }))
    olsWire = new THREE.LineSegments(wireGeo(), new THREE.LineBasicMaterial({ color: COLORS.ols, transparent: true, opacity: 0 }))
    partRoot.add(planeMesh, planeWire, olsWire)
    // the least-squares plane never changes within a part: write it once
    writePlane(c, olsWire.geometry, null, tr.ols.display.intercept, tr.ols.display.slopes)
  } else {
    const [x0, x1] = b.x, [y0, y1] = b.y
    partRoot.add(lineSeg([x0, y0, 0, x1, y0, 0, x0, y0, 0, x0, y1, 0], COLORS.axis, 0.8))
    const g: number[] = []
    for (let i = 1; i < 6; i++) { const x = x0 + ((x1 - x0) * i) / 6, y = y0 + ((y1 - y0) * i) / 6; g.push(x, y0, -0.02, x, y1, -0.02, x0, y, -0.02, x1, y, -0.02) }
    partRoot.add(lineSeg(g, COLORS.grid, 0.7))
    const cyl = new THREE.CylinderGeometry(0.045, 0.045, 1, 10, 1, true)
    cyl.translate(0, 0.5, 0); cyl.rotateX(Math.PI / 2)
    lineMesh = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: COLORS.fit, transparent: true, toneMapped: false }))
    const og = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
    olsLine = new THREE.Line(og, new THREE.LineDashedMaterial({ color: COLORS.ols, dashSize: 0.25, gapSize: 0.15, transparent: true, opacity: 0 }))
    partRoot.add(lineMesh, olsLine)
    if (c.bowl && tr.surface) {
      const s = tr.surface
      const nx = s.theta0.length, nz = s.theta1.length
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3)
      const lo = new THREE.Color('#0e7490'), hi = new THREE.Color('#f59e0b'), cc = new THREE.Color()
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const v = c.bowl.at(s.theta0[i], s.theta1[j], s.cost[i][j])
        const k = (i * nz + j) * 3
        pos[k] = v[0]; pos[k + 1] = v[1]; pos[k + 2] = v[2]
        cc.copy(lo).lerp(hi, clamp((v[1] - c.bowl.y[0]) / (c.bowl.y[1] - c.bowl.y[0])))
        col[k] = cc.r; col[k + 1] = cc.g; col[k + 2] = cc.b
      }
      const idx: number[] = []
      for (let i = 0; i < nx - 1; i++) for (let j = 0; j < nz - 1; j++) { const a = i * nz + j; idx.push(a, a + nz, a + 1, a + 1, a + nz, a + nz + 1) }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)).setAttribute('color', new THREE.BufferAttribute(col, 3)).setIndex(idx)
      geo.computeVertexNormals()
      bowl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))
      const w: number[] = []
      for (let i = 0; i < nx; i += 4) for (let j = 0; j < nz - 1; j++) { const a = (i * nz + j) * 3, bb = (i * nz + j + 1) * 3; w.push(pos[a], pos[a + 1] + 0.01, pos[a + 2], pos[bb], pos[bb + 1] + 0.01, pos[bb + 2]) }
      for (let j = 0; j < nz; j += 4) for (let i = 0; i < nx - 1; i++) { const a = (i * nz + j) * 3, bb = ((i + 1) * nz + j) * 3; w.push(pos[a], pos[a + 1] + 0.01, pos[a + 2], pos[bb], pos[bb + 1] + 0.01, pos[bb + 2]) }
      bowlWire = lineSeg(w, '#e2e8f0', 0)
      ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshStandardMaterial({ color: COLORS.ball, emissive: COLORS.ball, emissiveIntensity: 0.6, roughness: 0.3 }))
      ballHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: COLORS.ball, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
      ballHalo.scale.setScalar(1.3)
      const tg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(tr.frames.length * 3), 3))
      trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }))
      minRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: COLORS.ols, transparent: true, opacity: 0, toneMapped: false }))
      minRing.rotation.x = Math.PI / 2
      const m = s.minimum, mp = c.bowl.at(m.theta0, m.theta1, m.cost)
      minRing.position.set(mp[0], mp[1] + 0.03, mp[2])
      partRoot.add(bowl, bowlWire, trail, ball, ballHalo, minRing)
    }
  }
  residuals = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3)),
    new THREE.LineBasicMaterial({ color: COLORS.res, transparent: true, opacity: 0 }))
  partRoot.add(residuals)
  // the ball and its path stay visible through the bowl's front wall (drawn last, without depth test)
  for (const o of [ball, ballHalo, trail]) if (o) { o.renderOrder = 10; ((o as THREE.Mesh).material as THREE.Material).depthTest = false }
  builtPart = pi
}

/** J at standardized (θ0, θ1): bilinear interpolation of the backend's sampled surface (so the ball sits on the drawn bowl) */
function surfaceCost(tr: LinRegTrace, a: number, b: number): number {
  const s = tr.surface!
  const fi = clamp((a - s.theta0[0]) / (s.theta0[s.theta0.length - 1] - s.theta0[0]), 0, 1) * (s.theta0.length - 1)
  const fj = clamp((b - s.theta1[0]) / (s.theta1[s.theta1.length - 1] - s.theta1[0]), 0, 1) * (s.theta1.length - 1)
  const i0 = Math.floor(fi), j0 = Math.floor(fj), i1 = Math.min(i0 + 1, s.theta0.length - 1), j1 = Math.min(j0 + 1, s.theta1.length - 1)
  const u = fi - i0, v = fj - j0
  return lerp(lerp(s.cost[i0][j0], s.cost[i1][j0], u), lerp(s.cost[i0][j1], s.cost[i1][j1], u), v)
}

const pointColor = new THREE.Color(COLORS.point)
const tmpV = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3()
function project(p: Vec3, cam: THREE.Camera, w: number, h: number) {
  tmpV.set(p[0], p[1], p[2]).project(cam)
  return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h }
}
const short = (v: number) => {
  const a = Math.abs(v)
  return a >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : a >= 1e4 ? `${(v / 1e3).toFixed(0)}k` : a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2)
}
const sci = (v: number) => (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(2) : v.toFixed(3))

onBeforeRender(() => {
  const tl = store.timeline, cam = camera.value as THREE.PerspectiveCamera | undefined, man = store.manifest
  if (!tl || !cam || !man || !store.traces.length) return
  if (builtTl !== tl) { cameraCtl = new CinematicCameraController(tl.cameraKeys, props.reducedMotion); builtTl = tl; builtPart = -1 }
  const t = store.position
  const s = stateAt(tl, man.parts, store.traces, t)
  const tr = store.traces[s.part]
  if (builtPart !== s.part) buildPart(s.part, tr)
  const c = coords!

  if (store.mode !== 'lab' && cameraCtl) {
    let pose = cameraCtl.poseAt(t)
    if (blend.v < 1 && blend.from) pose = { position: lerp3(blend.from.position, pose.position, blend.v), target: lerp3(blend.from.target, pose.target, blend.v), fov: lerp(blend.from.fov, pose.fov, blend.v) }
    cam.position.set(...pose.position)
    cam.lookAt(...pose.target)
    if (Math.abs(cam.fov - pose.fov) > 0.01) { cam.fov = pose.fov; cam.updateProjectionMatrix() }
    orbitTarget.value = pose.target
  }

  // points: rise from the floor (staggered), then stand at their data positions
  const n = tr.n, X = tr.points.x, Y = tr.points.y
  const col = pointColor
  for (let i = 0; i < n; i++) {
    const target = c.point(X[0][i], X[1]?.[i] ?? null, Y[i])
    const k = clamp(s.rise * 1.5 - (i / n) * 0.5)
    positions[i * 3] = target[0]; positions[i * 3 + 1] = lerp(c.box.y[0], target[1], k); positions[i * 3 + 2] = target[2]
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b
    sizes[i] = 0.35 + 0.65 * Math.max(0.15, k)
  }
  points!.update(positions, colors, sizes, cam, 3)

  const yClamp = (v: number) => clamp(v, c.y.lo, c.y.hi)
  const toScene = (x1: number, x2: number | null, y: number) => c.point(x1, x2, yClamp(y))
  // the fitted surface: plane (grid) or line (clipped to the box)
  if (c.kind === 'plane' && planeMesh && planeWire && olsWire) {
    writePlane(c, planeWire.geometry, planeMesh.geometry, s.drawIntercept, s.drawSlopes)
    planeMesh.geometry.computeBoundingSphere()
    ;(planeMesh.material as THREE.MeshBasicMaterial).opacity = 0.22 * s.fitOpacity
    ;(planeWire.material as THREE.LineBasicMaterial).opacity = 0.55 * s.fitOpacity
    ;(olsWire.material as THREE.LineBasicMaterial).opacity = 0.6 * s.olsOpacity
  } else if (lineMesh && olsLine) {
    const seg = (a: number, sl: number) => {
      // clip y = a + sl·x to the box's y range
      let xa = c.x1.lo, xb = c.x1.hi
      const ya = a + sl * xa, yb = a + sl * xb
      if (sl !== 0) {
        const xs = [(c.y.lo - a) / sl, (c.y.hi - a) / sl].sort((p, q) => p - q)
        xa = Math.max(xa, xs[0]); xb = Math.min(xb, xs[1])
      } else if (ya < c.y.lo || ya > c.y.hi) { xb = xa }
      void yb
      return [toScene(xa, null, a + sl * xa), toScene(Math.max(xa, xb), null, a + sl * Math.max(xa, xb))]
    }
    const [p0, p1] = seg(s.drawIntercept, s.drawSlopes[0])
    tmpA.set(...p0); tmpB.set(...p1)
    const len = tmpA.distanceTo(tmpB)
    lineMesh.visible = len > 1e-3 && s.fitOpacity > 0.01
    lineMesh.position.copy(tmpA)
    lineMesh.lookAt(tmpB)
    lineMesh.scale.set(1, 1, Math.max(1e-3, len))
    ;(lineMesh.material as THREE.MeshBasicMaterial).opacity = s.fitOpacity
    const [o0, o1] = seg(tr.ols.display.intercept, tr.ols.display.slopes[0])
    const op = olsLine.geometry.getAttribute('position') as THREE.BufferAttribute
    op.setXYZ(0, o0[0], o0[1], 0.02); op.setXYZ(1, o1[0], o1[1], 0.02); op.needsUpdate = true
    olsLine.computeLineDistances()
    ;(olsLine.material as THREE.LineDashedMaterial).opacity = s.olsOpacity
  }
  // residuals: from each point to the drawn fit (only when the fit is the full model)
  if (residuals) {
    const rp = residuals.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < n; i++) {
      const x2 = X[1]?.[i] ?? null
      const a = c.point(X[0][i], x2, Y[i]), f = toScene(X[0][i], x2, fittedAt(s.drawIntercept, s.drawSlopes, X[0][i], x2))
      rp.setXYZ(i * 2, a[0], positions[i * 3 + 1], a[2]); rp.setXYZ(i * 2 + 1, f[0], f[1], f[2])
    }
    rp.needsUpdate = true
    ;(residuals.material as THREE.LineBasicMaterial).opacity = 0.7 * s.residualOpacity
  }
  // the bowl, the ball on it and its trail along the recorded frames
  if (bowl && bowlWire && ball && ballHalo && trail && minRing && c.bowl) {
    ;(bowl.material as THREE.MeshBasicMaterial).opacity = 0.82 * s.bowlOpacity
    ;(bowlWire.material as THREE.LineBasicMaterial).opacity = 0.18 * s.bowlOpacity
    bowl.visible = bowlWire.visible = s.bowlOpacity > 0.01
    const [a, b] = s.drawTheta
    const bp = c.bowl.at(a, b, surfaceCost(tr, a, b))
    ball.position.set(bp[0], bp[1] + 0.17, bp[2]); ballHalo.position.copy(ball.position)
    ball.visible = ballHalo.visible = s.bowlOpacity > 0.3
    const tp = trail.geometry.getAttribute('position') as THREE.BufferAttribute
    const upto = Math.max(1, Math.round(s.trail * (tr.frames.length - 1)) + 1)
    tr.frames.forEach((f, i) => { const q = c.bowl!.at(f.theta_std[0], f.theta_std[1], surfaceCost(tr, f.theta_std[0], f.theta_std[1])); tp.setXYZ(i, q[0], q[1] + 0.05, q[2]) })
    tp.needsUpdate = true
    trail.geometry.setDrawRange(0, upto)
    trail.visible = s.bowlOpacity > 0.3
    ;(minRing.material as THREE.MeshBasicMaterial).opacity = s.olsOpacity
  }

  // projected labels
  const el = renderer.domElement
  const w = el.clientWidth, h = el.clientHeight
  const part = man.parts[s.part]
  const L: OverlayLabel[] = []
  const vis = s.kind === 'title' ? 0 : 1
  const bx = c.box
  if (vis) {
    if (c.kind === 'plane') {
      L.push({ id: 'x1', ...project([(bx.x[0] + bx.x[1]) / 2, bx.y[0] - 0.45, bx.z[1] + 0.3], cam, w, h), text: part.axes.x1, kind: 'axis', opacity: 0.9 })
      L.push({ id: 'x2', ...project([bx.x[1] + 0.5, bx.y[0] - 0.35, 0], cam, w, h), text: part.axes.x2 ?? '', kind: 'axis', opacity: 0.9 })
      L.push({ id: 'y', ...project([bx.x[0] - 0.2, bx.y[1] + 0.45, bx.z[0]], cam, w, h), text: part.axes.y, kind: 'axis', opacity: 0.9 })
      L.push({ id: 'x1lo', ...project([bx.x[0], bx.y[0] - 0.2, bx.z[1] + 0.25], cam, w, h), text: short(c.x1.lo), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'x1hi', ...project([bx.x[1], bx.y[0] - 0.2, bx.z[1] + 0.25], cam, w, h), text: short(c.x1.hi), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'ylo', ...project([bx.x[0] - 0.35, bx.y[0], bx.z[0]], cam, w, h), text: short(c.y.lo), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'yhi', ...project([bx.x[0] - 0.35, bx.y[1], bx.z[0]], cam, w, h), text: short(c.y.hi), kind: 'tick', opacity: 0.8 })
    } else {
      if (s.kind === 'residuals' && s.residualOpacity > 0.1) {
        const observed = c.point(X[0][0], null, Y[0])
        const predicted = toScene(X[0][0], null, fittedAt(s.drawIntercept, s.drawSlopes, X[0][0], null))
        L.push({ id: 'example-observed', ...project([observed[0], observed[1] + 0.35, observed[2]], cam, w, h), text: `${tr.points.labels?.[0] ?? 'One observation'} · actual ${short(Y[0])}`, kind: 'focus', opacity: s.residualOpacity })
        L.push({ id: 'example-predicted', ...project([predicted[0], predicted[1] - 0.35, predicted[2]], cam, w, h), text: 'Prediction at the same predictor value', kind: 'focus', opacity: s.residualOpacity })
      }
      L.push({ id: 'x1', ...project([(bx.x[0] + bx.x[1]) / 2, bx.y[0] - 0.6, 0], cam, w, h), text: part.axes.x1, kind: 'axis', opacity: 0.9 })
      L.push({ id: 'y', ...project([bx.x[0] - 0.75, (bx.y[0] + bx.y[1]) / 2, 0], cam, w, h), text: part.axes.y, kind: 'axis-y', opacity: 0.9 })
      L.push({ id: 'x1lo', ...project([bx.x[0], bx.y[0] - 0.25, 0], cam, w, h), text: short(c.x1.lo), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'x1hi', ...project([bx.x[1], bx.y[0] - 0.25, 0], cam, w, h), text: short(c.x1.hi), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'ylo', ...project([bx.x[0] - 0.3, bx.y[0], 0], cam, w, h), text: short(c.y.lo), kind: 'tick', opacity: 0.8 })
      L.push({ id: 'yhi', ...project([bx.x[0] - 0.3, bx.y[1], 0], cam, w, h), text: short(c.y.hi), kind: 'tick', opacity: 0.8 })
      if (c.bowl && s.bowlOpacity > 0.05) {
        L.push({ id: 't0', ...project([(c.bowl.x[0] + c.bowl.x[1]) / 2, c.bowl.y[0] - 0.5, c.bowl.z[1] + 0.4], cam, w, h), text: 'θ₀ (intercept, standardized)', kind: 'axis', opacity: s.bowlOpacity })
        L.push({ id: 't1', ...project([c.bowl.x[1] + 0.6, c.bowl.y[0] - 0.3, 0], cam, w, h), text: 'θ₁ (slope)', kind: 'axis', opacity: s.bowlOpacity })
        L.push({ id: 'jj', ...project([c.bowl.x[0] - 0.3, c.bowl.y[1] + 0.3, c.bowl.z[0]], cam, w, h), text: 'cost J (height, compressed)', kind: 'axis', opacity: s.bowlOpacity })
        if (ball && ball.visible) L.push({ id: 'ball', ...project([ball.position.x, ball.position.y + 0.45, ball.position.z], cam, w, h), text: `it ${s.frame.iteration} · J = ${sci(s.frame.cost)}`, kind: 'distance', color: COLORS.ball, opacity: 1 })
      }
    }
  }
  overlay.value = L
})

watch(() => store.mode, (m, old) => {
  const cam = camera.value as THREE.PerspectiveCamera | undefined
  if (!cam || old !== 'lab' || m === 'lab') return
  const dir = new THREE.Vector3()
  cam.getWorldDirection(dir)
  const tgt = cam.position.clone().add(dir.multiplyScalar(15))
  blend.from = { position: [cam.position.x, cam.position.y, cam.position.z], target: [tgt.x, tgt.y, tgt.z], fov: cam.fov }
  blend.v = 0
  gsap.to(blend, { v: 1, duration: props.reducedMotion ? 0 : 1.2, ease: 'power2.inOut' })
})
watch(() => props.reducedMotion, (v) => cameraCtl?.setReducedMotion(v))
watch(() => store.traces, () => { builtPart = -1 })

const lights: THREE.Light[] = []
function onLost(ev: Event) { ev.preventDefault(); emit('contextlost') }
onMounted(() => {
  scene.value.add(root)
  scene.value.fog = new THREE.FogExp2(SEMANTIC_HEX.ground, 0.022)
  const amb = new THREE.AmbientLight('#9fb6ff', 0.75)
  const key = new THREE.DirectionalLight('#ffffff', 1.4)
  key.position.set(4, 8, 6)
  const fill = new THREE.PointLight('#22d3ee', 30, 40)
  fill.position.set(-6, 3, 6)
  lights.push(amb, key, fill)
  scene.value.add(amb, key, fill)
  renderer.domElement.addEventListener('webglcontextlost', onLost)
})
onBeforeUnmount(() => {
  renderer.domElement.removeEventListener('webglcontextlost', onLost)
  gsap.killTweensOf(blend)
  clearPart()
  scene.value.remove(root)
  lights.forEach((l) => scene.value.remove(l))
  haloTex.dispose()
})
</script>

<template>
  <!-- everything is created imperatively above; this component renders no Tres elements of its own -->
  <TresGroup />
</template>
