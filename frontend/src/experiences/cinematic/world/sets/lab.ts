/**
 * Radiology lab (scenes 1C–3, 6–8): room, desks, streaming scan wall, PACS monitors, the RadiologyML research
 * workstation, holograms, and the cast. Choreography is written in absolute film seconds (see storyboard.json).
 */
import * as THREE from 'three'
import { Character, CAST, type CharacterState } from '../characters/Character'
import type { ExpressionName, PoseName } from '../characters/poses'
import { clamp, lerp, smooth, span, window01, type V3 } from '../math'
import { rimUniforms } from '../materials'
import { clinicalPathHologram, loopHologram, scanScreen, workstationScreen, type ScanOverlay } from '../screens'
import { canvasTexture, glowCanvas, sliceCanvas, thumbnailAtlas } from '../textures'
import { storyboard } from '../../story'
import { disposeGroup, F, LAB, type FilmSet } from './types'

export const LAB_POINTS = {
  door: [-8.6, -20.6] as [number, number],
  P1: [-2.2, -23.2] as [number, number],
  P2: [-0.1, -25.0] as [number, number],
  N3: [-1.3, -24.5] as [number, number],
  S: [1.3, -26.1] as [number, number],
  doorR: [8.4, -27.6] as [number, number],
  SP: [3.1, -25.6] as [number, number],
  monitor: [2.3, F + 1.32, -27.25] as V3,
  workstation: [7.78, F + 1.42, -23.6] as V3,
  scanWall: [0, F + 1.95, -29.88] as V3,
  holo: [-0.9, F + 2.35, -27.4] as V3,
}

// ------------------------------------------------------------------------------------------------ choreography helpers
const ang = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1])
const lerpAngle = (a: number, b: number, p: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * p
}
interface Track { pos: [number, number]; rot: number; walk: number; phase: number }
/** Piecewise path: [time, x, z] keys; walking where the position changes; facing = direction of travel unless given. */
function track(t: number, raw: [number, number, number, number?][]): Track {
  // resolve missing facings: keep the direction of the previous walk
  const keys = raw.map((k) => [...k] as [number, number, number, number?])
  for (let i = 0; i < keys.length; i++) {
    if (keys[i][3] !== undefined) continue
    const prev = keys[i - 1]
    keys[i][3] = prev ? (Math.hypot(keys[i][1] - prev[1], keys[i][2] - prev[2]) > 0.05 ? ang([prev[1], prev[2]], [keys[i][1], keys[i][2]]) : prev[3]) : 0
  }
  if (t <= keys[0][0]) return { pos: [keys[0][1], keys[0][2]], rot: keys[0][3] ?? 0, walk: 0, phase: 0 }
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, x0, z0, r0] = keys[i], [t1, x1, z1, r1] = keys[i + 1]
    if (t >= t0 && t <= t1) {
      const moving = Math.hypot(x1 - x0, z1 - z0) > 0.05
      const p = moving ? smooth(clamp((t - t0) / (t1 - t0))) * 0.15 + clamp((t - t0) / (t1 - t0)) * 0.85 : 0
      const pos: [number, number] = [lerp(x0, x1, p), lerp(z0, z1, p)]
      const travel = ang([x0, z0], [x1, z1])
      let rot: number
      if (moving) rot = lerpAngle(r0 ?? travel, travel, smooth(span(t, t0, t0 + 0.5)))
      else rot = lerpAngle(r0 ?? 0, r1 ?? r0 ?? 0, smooth(clamp((t - t0) / Math.min(1.2, t1 - t0))))
      const dist = Math.hypot(x1 - x0, z1 - z0) * p
      const walkAmt = moving ? Math.min(smooth(span(t, t0, t0 + 0.4)), 1 - smooth(span(t, t1 - 0.4, t1))) : 0
      return { pos, rot, walk: walkAmt, phase: dist * 4.4 }
    }
  }
  const k = keys[keys.length - 1]
  return { pos: [k[1], k[2]], rot: k[3] ?? 0, walk: 0, phase: 0 }
}
/** Blend weights: [name, from, to] windows with soft edges. */
function blend<N extends string>(t: number, windows: [N, number, number][], soft = 0.6): [N, number][] {
  return windows.map(([n, a, b]) => [n, window01(t, a, b, soft, soft)] as [N, number]).filter(([, w]) => w > 0.001)
}
const head = (x: number, z: number, y = 1.6): THREE.Vector3 => new THREE.Vector3(x, F + y, z)

export function createLab(): FilmSet & { characters: Record<string, Character>; setOpacity(o: number): void } {
  const group = new THREE.Group()
  const props = new THREE.Group()
  group.add(props)
  const mats: THREE.Material[] = []
  const std = (color: string, rough = 0.7, metal = 0.1, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })
    mats.push(m)
    return m
  }
  const basic = (p: THREE.MeshBasicMaterialParameters) => { const m = new THREE.MeshBasicMaterial({ toneMapped: false, ...p }); mats.push(m); return m }
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: V3, r?: V3) => {
    const o = new THREE.Mesh(g, m)
    o.position.set(...p)
    if (r) o.rotation.set(...r)
    props.add(o)
    return o
  }
  const W = LAB.x1 - LAB.x0, D = LAB.z0 - LAB.z1, cz = (LAB.z0 + LAB.z1) / 2

  // room shell (inward facing)
  const floor = mesh(new THREE.PlaneGeometry(W, D), std('#0c1320', 0.42, 0.15), [0, F + 0.001, cz], [-Math.PI / 2, 0, 0])
  floor.receiveShadow = true
  mesh(new THREE.PlaneGeometry(W, D), std('#0e1522', 0.9), [0, F + LAB.h, cz], [Math.PI / 2, 0, 0])
  mesh(new THREE.PlaneGeometry(W, LAB.h), std('#121b2b', 0.85), [0, F + LAB.h / 2, LAB.z1 + 0.01])
  mesh(new THREE.PlaneGeometry(D, LAB.h), std('#101827', 0.85), [LAB.x0 + 0.01, F + LAB.h / 2, cz], [0, Math.PI / 2, 0])
  mesh(new THREE.PlaneGeometry(D, LAB.h), std('#101827', 0.85), [LAB.x1 - 0.01, F + LAB.h / 2, cz], [0, -Math.PI / 2, 0])
  // floor guide line (cyan) and ceiling light strips
  mesh(new THREE.PlaneGeometry(0.05, D - 1), basic({ color: '#1c6f86' }), [-4.2, F + 0.004, cz], [-Math.PI / 2, 0, 0])
  const stripM = basic({ color: '#dbe9ff' })
  for (const x of [-5, 0, 5]) mesh(new THREE.BoxGeometry(0.22, 0.04, D - 2.5), stripM, [x, F + LAB.h - 0.03, cz])
  // doors
  for (const [x, z, ry] of [[LAB.x0 + 0.02, -20.6, Math.PI / 2], [LAB.x1 - 0.02, -27.6, -Math.PI / 2]] as const) {
    mesh(new THREE.PlaneGeometry(1.2, 2.3), std('#1b2840', 0.5, 0.3), [x, F + 1.15, z], [0, ry, 0])
    mesh(new THREE.PlaneGeometry(1.3, 0.04), basic({ color: '#38d6f0' }), [x + (ry > 0 ? 0.01 : -0.01), F + 2.33, z], [0, ry, 0])
  }

  // scan wall: streaming thumbnails
  const atlas = canvasTexture(thumbnailAtlas(32, 6, 96))
  atlas.wrapS = THREE.RepeatWrapping
  atlas.repeat.set(0.5, 1)
  const wall = mesh(new THREE.PlaneGeometry(12, 2.6), basic({ map: atlas, color: '#b8d8f0' }), LAB_POINTS.scanWall)
  void wall
  mesh(new THREE.PlaneGeometry(12.3, 2.9), std('#05080e', 0.4, 0.5), [0, F + 1.95, LAB.z1 + 0.005])
  const scanLine = mesh(new THREE.PlaneGeometry(0.05, 2.6), basic({ color: '#38d6f0', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), [0, F + 1.95, LAB.z1 + 0.03])

  // desks + monitors for the two radiologists (left side, facing the left wall)
  const deskM = std('#1d2738', 0.45, 0.4), legM = std('#0d121b', 0.5, 0.6), frameM = std('#0a0d14', 0.35, 0.6)
  const desk = (x: number, z: number, w: number, d: number, ry = 0) => {
    const g = new THREE.Group()
    g.position.set(x, F, z)
    g.rotation.y = ry
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), deskM)
    top.position.y = 0.76
    g.add(top)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.05), legM)
      l.position.set(sx * (w / 2 - 0.08), 0.38, sz * (d / 2 - 0.08))
      g.add(l)
    }
    props.add(g)
    return g
  }
  const monitor = (parent: THREE.Object3D, p: V3, w: number, h: number, tex: THREE.Texture, ry = 0) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04), frameM)
    f.position.set(...p)
    f.rotation.y = ry
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic({ map: tex }))
    s.position.z = 0.021
    f.add(s)
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, p[1] - 0.78, 0.06), frameM)
    stand.position.set(0, -(p[1] - 0.78) / 2 - h / 2 + 0.02, -0.04)
    f.add(stand)
    parent.add(f)
    return s
  }
  const radDesks: [number, number][] = [[-7.6, -22.6], [-7.6, -26.2]]
  radDesks.forEach(([x, z], i) => {
    const d = desk(x, z, 0.9, 1.8, 0)
    const tex = canvasTexture(sliceCanvas({ size: 192, seed: 60 + i * 9, z: -0.2 + i * 0.3 }))
    monitor(d, [-0.25, 1.22, -0.42], 0.62, 0.42, tex, Math.PI / 2)
    monitor(d, [-0.25, 1.22, 0.38], 0.62, 0.42, canvasTexture(sliceCanvas({ size: 192, seed: 80 + i, z: 0.35 })), Math.PI / 2)
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), std('#222b3c', 0.6))
    chair.position.set(x + 0.85, F + 0.46, z)
    props.add(chair)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.48), std('#222b3c', 0.6))
    back.position.set(x + 1.12, F + 0.8, z)
    props.add(back)
  })

  // Dr. Salizar's PACS station (centre-back): main screen whose content changes through the story
  const st = desk(2.3, -27.35, 2.2, 0.8)
  const screens: Record<string, THREE.Texture> = {}
  const screenFor = (img: 'hero' | 'falsePositive' | 'flagged', ov: ScanOverlay) => {
    const k = img + ov
    if (!screens[k]) screens[k] = canvasTexture(scanScreen(img, ov))
    return screens[k]
  }
  const pacs = monitor(st, [0, 1.32, 0.1], 1.32, 0.825, screenFor('hero', 'none'))
  monitor(st, [-1.0, 1.22, 0.22], 0.55, 0.36, canvasTexture(sliceCanvas({ size: 160, seed: 11, z: 0.4 })), 0.35)
  const lamp = new THREE.PointLight('#ffc78a', 3, 4, 1.5)
  lamp.position.set(3.4, F + 1.3, -27)
  group.add(lamp)

  // research workstation (right wall)
  const ws = desk(7.9, -23.6, 0.9, 2.4, 0)
  const wsTex = canvasTexture(workstationScreen())
  const wsScreen = monitor(ws, [-0.15, 1.42, 0], 2.0, 1.17, wsTex, -Math.PI / 2)
  const wsMat = wsScreen.material as THREE.MeshBasicMaterial
  const wsLight = new THREE.PointLight('#7fe3ff', 0, 6, 1.4)
  wsLight.position.set(6.6, F + 1.5, -23.6)
  group.add(wsLight)

  // holograms (scene 6 loop, scene 7 clinical path)
  const loopStages = storyboard.scenes.find((s) => s.id === 's6-mistakes')!.loop!
  const loopTex = Array.from({ length: loopStages.length }, (_, i) => canvasTexture(loopHologram(loopStages, i)))
  const pathTex = [0, 1, 2, 3].map((i) => canvasTexture(clinicalPathHologram(i)))
  const holoM = basic({ map: loopTex[0], transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  const holo = mesh(new THREE.PlaneGeometry(3.4, 1.9), holoM, LAB_POINTS.holo)
  const holoBeamM = basic({ color: '#f2b54a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  mesh(new THREE.CylinderGeometry(0.02, 0.35, 1.2, 16, 1, true), holoBeamM, [LAB_POINTS.holo[0], F + 0.95, LAB_POINTS.holo[2] + 0.4])

  // lights
  const hemi = new THREE.HemisphereLight('#7a94c8', '#141820', 1.7)
  group.add(hemi)
  const key = new THREE.DirectionalLight('#ffe6cc', 1.5)
  key.position.set(-4, F + 6, -14)
  key.target.position.set(0, F, -25)
  group.add(key, key.target)
  const fill = new THREE.DirectionalLight('#8fb8ff', 0.6)
  fill.position.set(6, F + 3, -20)
  fill.target.position.set(0, F + 1, -25)
  group.add(fill, fill.target)
  for (const [x, z] of [[-5, -21.5], [0, -24], [5, -21.5], [0, -28]] as const) {
    const l = new THREE.PointLight('#d6e6ff', 9, 9, 1.5)
    l.position.set(x, F + 3.3, z)
    group.add(l)
  }
  const wallLight = new THREE.PointLight('#38d6f0', 8, 8, 1.6)
  wallLight.position.set(0, F + 1.9, -28.6)
  group.add(wallLight)

  // blob shadows
  const shadowTex = canvasTexture(glowCanvas(64, 'rgba(0,0,0,1)'))
  const mkShadow = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), basic({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false, color: '#000' }))
    m.rotation.x = -Math.PI / 2
    group.add(m)
    return m
  }

  // cast
  const ch = {
    noe: new Character(CAST.noe),
    salizar: new Character(CAST.salizar),
    specialist: new Character(CAST.specialist),
    radA: new Character(CAST.radA),
    radB: new Character(CAST.radB),
  }
  const shadows: Record<string, THREE.Mesh> = {}
  for (const [k, c] of Object.entries(ch)) { group.add(c.root); shadows[k] = mkShadow() }
  const tabletTex = canvasTexture(sliceCanvas({ size: 128, seed: 140, z: 0.1 }))
  if (ch.noe.tabletScreen) (ch.noe.tabletScreen.material as THREE.MeshBasicMaterial).map = tabletTex

  const place = (c: Character, key: string, x: number, z: number, rot: number, st: CharacterState) => {
    c.root.position.set(x, F, z)
    c.root.rotation.y = rot
    c.setState(st)
    shadows[key].position.set(x, F + 0.006, z)
  }

  let opacity = 1
  function setOpacity(o: number) {
    if (Math.abs(o - opacity) < 1e-4) return
    opacity = o
    for (const m of mats) { m.transparent = true; (m as THREE.MeshBasicMaterial).opacity = o * ((m.userData.baseOpacity as number | undefined) ?? 1); m.depthWrite = o > 0.6 }
    props.visible = o > 0.01
    for (const k of ['salizar', 'specialist', 'radA', 'radB'] as const) ch[k].setOpacity(o)
  }
  mats.forEach((m) => (m.userData.baseOpacity = (m as THREE.MeshBasicMaterial).opacity))

  return {
    group,
    characters: ch,
    setOpacity,
    update(t) {
      // scan wall stream + scanning line
      atlas.offset.x = (t * 0.018) % 1
      scanLine.position.x = -6 + ((t * 0.9) % 12)

      // screens
      const pacsTex = t < 95 ? screenFor('hero', 'none') : t < 102.6 ? screenFor('falsePositive', 'fp') : t < 115 ? screenFor('falsePositive', 'fpCorrected') : t < 126 ? screenFor('flagged', 'flag') : screenFor('flagged', 'confirmed')
      const pm = pacs.material as THREE.MeshBasicMaterial
      if (pm.map !== pacsTex) { pm.map = pacsTex; pm.needsUpdate = true }
      const wake = smooth(span(t, 43.6, 45.8))
      wsMat.color.setScalar(t < 50 ? lerp(0.08, 1.25, wake) : 0.35)
      wsLight.intensity = t < 50 ? wake * 10 : 2

      // holograms
      const loopVis = window01(t, 103.4, 115.2, 0.8, 0.8)
      const pathVis = window01(t, 128.4, 140.5, 0.8, 1.2)
      holoM.opacity = Math.max(loopVis, pathVis) * opacity
      holoBeamM.opacity = Math.max(loopVis, pathVis) * 0.25 * opacity
      holo.visible = holoM.opacity > 0.01
      const li = clamp(Math.floor((t - 103.4) / 1.6), 0, loopStages.length - 1)
      const pi = clamp(Math.floor((t - 128.4) / 1.4), 0, 3)
      const ht = pathVis > loopVis ? pathTex[pi] : loopTex[li]
      if (holoM.map !== ht) { holoM.map = ht; holoM.needsUpdate = true }
      holo.position.y = LAB_POINTS.holo[1] + Math.sin(t * 1.3) * 0.03

      rimUniforms.uRimColor.value.set('#38d6f0')
      rimUniforms.uRimStrength.value = 0.22

      const L = LAB_POINTS
      const salizarHead = head(L.S[0], L.S[1], 1.72)
      const monitorV = new THREE.Vector3(...L.monitor)
      const wsV = new THREE.Vector3(...L.workstation)

      // ---------------- Noé
      {
        const tr = t < 50
          ? track(t, [[15.2, ...L.door, Math.PI / 2], [23, ...L.P1], [24.6, ...L.P1, Math.PI * 0.97], [35, ...L.P1, Math.PI * 0.97], [36.6, ...L.P2], [37.4, ...L.P2, ang(L.P2, L.S)], [50, ...L.P2, ang(L.P2, L.S)]])
          : track(t, [[95, ...L.N3, ang(L.N3, [L.monitor[0], L.monitor[2]])], [135, ...L.N3, ang(L.N3, [L.monitor[0], L.monitor[2]])], [137.2, ...L.N3, 0.15], [200, ...L.N3, 0.15]])
        let look: THREE.Vector3 | null = null
        if (t < 20.5) look = head(-7.0, -22.6, 1.1)
        else if (t < 24) look = head(-1.5, -26, 1.8)
        else if (t < 35) look = new THREE.Vector3(Math.sin((t - 24) * 0.55) * 4.2, F + 2.15, -29.8)
        else if (t < 44.6) look = salizarHead
        else if (t < 50) look = wsV
        else if (t < 135) look = t > 128 ? head(L.S[0], L.S[1], 1.7) : monitorV
        else look = new THREE.Vector3(L.N3[0] + Math.sin(t * 0.3) * 2, F + 2.6 + Math.sin(t * 0.2), L.N3[1] + 6)
        const poses = blend<PoseName>(t, [
          ['holdTablet', 15, 28.5], ['readTablet', 27.8, 31.2], ['holdTablet', 30.6, 36], ['idle', 35.5, 200], ['lookAround', 24.6, 29.5],
          ['explain', 37.6, 41.6], ['listen', 42, 46], ['armsCrossed', 100, 113], ['chinThink', 141, 152],
        ])
        const expr = blend<ExpressionName>(t, [
          ['curious', 14, 28.2], ['concerned', 28, 37.2], ['curious', 37, 42.2], ['surprised', 45.4, 47.4], ['smile', 47, 50],
          ['focused', 95, 116], ['surprised', 116, 118.4], ['focused', 118, 128], ['smile', 128.5, 135.5], ['thoughtful', 135.3, 200],
        ], 0.8)
        place(ch.noe, 'noe', tr.pos[0], tr.pos[1], tr.rot, {
          t, poses: poses.length ? poses : [['idle', 1]], expression: expr.length ? expr : [['neutral', 1]], lookAt: look,
          walk: { phase: tr.phase, amount: tr.walk }, talk: t > 36.2 && t < 42 ? 0.9 : 0,
        })
        ch.noe.setOpacity(t < 154 ? 1 : 1 - smooth(span(t, 154, 157.5)))
      }

      // ---------------- Dr. Salizar
      {
        const faceMon = ang(L.S, [L.monitor[0], L.monitor[2]])
        const faceNoe = ang(L.S, L.P2)
        const faceNoe3 = ang(L.S, L.N3)
        const faceSp = ang(L.S, L.SP)
        const tr = track(t, [[0, ...L.S, faceMon], [34.6, ...L.S, faceMon], [36, ...L.S, faceNoe], [44, ...L.S, faceNoe], [45.6, ...L.S, faceNoe + 0.5], [50, ...L.S, faceNoe + 0.5],
          [95, ...L.S, faceMon], [104.5, ...L.S, faceMon], [106, ...L.S, faceNoe3], [112, ...L.S, faceNoe3], [113.5, ...L.S, faceMon], [121.5, ...L.S, faceMon], [122.8, ...L.S, faceSp], [124.5, ...L.S, faceSp], [125.6, ...L.S, faceMon], [128.4, ...L.S, faceMon], [129.8, ...L.S, faceNoe3], [200, ...L.S, faceNoe3]])
        let look: THREE.Vector3 = monitorV
        if (t > 34.6 && t < 44.4) look = head(L.P2[0], L.P2[1], 1.62)
        else if (t >= 44.4 && t < 50) look = wsV
        else if (t > 104.8 && t < 112.6) look = head(L.N3[0], L.N3[1], 1.62)
        else if (t > 121.6 && t < 124.8) look = head(L.SP[0], L.SP[1], 1.78)
        else if (t > 129.4) look = head(L.N3[0], L.N3[1], 1.62)
        const poses = blend<PoseName>(t, [
          ['chinThink', 0, 34.8], ['lean', 0, 34.8], ['listen', 35, 42.6], ['gestureL', 43.6, 48.6], ['idle', 34.6, 200],
          ['lean', 95, 104], ['chinThink', 95, 100.4], ['touchScreen', 100.4, 103.2], ['explain', 106, 112], ['lean', 115, 121.4], ['touchScreen', 118, 120.6], ['explain', 129.6, 135],
        ])
        const expr = blend<ExpressionName>(t, [
          ['focused', 0, 35], ['neutral', 34.8, 42.6], ['smile', 42.4, 50], ['focused', 95, 104.6], ['smile', 104.6, 113], ['surprised', 115.6, 117.6], ['focused', 117.4, 128.4], ['smile', 128.4, 200],
        ], 0.7)
        place(ch.salizar, 'salizar', tr.pos[0], tr.pos[1], tr.rot, { t, poses, expression: expr, lookAt: look, talk: t > 43 && t < 46.8 ? 0.85 : 0, nod: t > 122 && t < 124 ? 0.6 : 0 })
      }

      // ---------------- specialist (scene 7)
      {
        const vis = t > 120 && t < 145
        ch.specialist.root.visible = vis
        shadows.specialist.visible = vis
        if (vis) {
          const tr = track(t, [[120.6, ...L.doorR, -Math.PI / 2], [124.2, ...L.SP], [125.4, ...L.SP, ang(L.SP, [L.monitor[0], L.monitor[2]])], [129, ...L.SP, ang(L.SP, [L.monitor[0], L.monitor[2]])], [130.4, ...L.SP, ang(L.SP, L.N3)], [200, ...L.SP, ang(L.SP, L.N3)]])
          const look = t < 122.5 ? salizarHead : t < 129.5 ? monitorV : head(L.N3[0], L.N3[1], 1.6)
          const poses = blend<PoseName>(t, [['idle', 120, 200], ['lean', 124.6, 129], ['chinThink', 124.8, 128.6], ['armsCrossed', 130, 200]])
          place(ch.specialist, 'specialist', tr.pos[0], tr.pos[1], tr.rot, { t, poses, expression: blend<ExpressionName>(t, [['neutral', 120, 124.6], ['focused', 124.4, 129.2], ['concerned', 129, 200]]), lookAt: look, walk: { phase: tr.phase, amount: tr.walk }, nod: t > 126.2 && t < 128 ? 1 : 0 })
        }
      }

      // ---------------- background radiologists, seated, working
      ;(['radA', 'radB'] as const).forEach((k, i) => {
        const [x, z] = radDesks[i]
        const typing = 0.5 + 0.5 * Math.sin(t * (2.2 + i))
        const look = t > 128.5 && t < 136 ? head(L.S[0], L.S[1], 1.6) : new THREE.Vector3(x - 0.3, F + 1.2, z + Math.sin(t * 0.4 + i) * 0.4)
        place(ch[k], k, x + 0.85, z, -Math.PI / 2, { t: t + i * 1.7, poses: [['sit', 1], ['typing', 0.6 + 0.2 * typing]], expression: [['focused', 1]], lookAt: look })
      })

      // dissolve into the data landscape (scene 8)
      setOpacity(1 - smooth(span(t, 139, 143.5)))
      group.visible = t < 50 || (t >= 94.6 && t < 160)
    },
    dispose() {
      Object.values(ch).forEach((c) => c.dispose())
      Object.values(screens).forEach((s) => s.dispose())
      loopTex.forEach((x) => x.dispose())
      pathTex.forEach((x) => x.dispose())
      disposeGroup(group)
    },
  }
}
