/**
 * Scenes 8–9: the lab dissolves into a field of data. The first 150 particles are the REAL Iris measurements
 * (shared/story/iris.json): they organise by their features, show nearest-class-mean regions, help spell
 * MACHINE LEARNING, and finally settle — unlabelled — into the sepal-length × sepal-width scatter the K-Means lab starts from.
 */
import * as THREE from 'three'
import { clamp, easeInOutCubic, lerp, rng, smooth, span, type V3 } from '../math'
import { canvasTexture, font, glowCanvas, makeCanvas } from '../textures'
import { iris } from '../../story'
import { disposeGroup, F, type FilmSet } from './types'
import { LAB_POINTS } from './lab'

export const FIELD = {
  center: [LAB_POINTS.N3[0], F, LAB_POINTS.N3[1]] as V3,
  text: [LAB_POINTS.N3[0], F + 4.0, -31] as V3,
  textWidth: 15,
}
const SPECIES = ['#38d6f0', '#8b7cf6', '#f2b54a']
const COUNT = 3200

/** Final 2-D scatter layout (sepal length × sepal width), shared with the overlay that labels the axes. */
export const SCATTER = { x0: 4.0, x1: 8.2, y0: 1.8, y1: 4.6, w: 9.6, h: 4.6 }
export function scatterPos(sl: number, sw: number): V3 {
  const [cx, cy, cz] = FIELD.text
  return [cx + ((sl - SCATTER.x0) / (SCATTER.x1 - SCATTER.x0) - 0.5) * SCATTER.w, cy + ((sw - SCATTER.y0) / (SCATTER.y1 - SCATTER.y0) - 0.5) * SCATTER.h, cz]
}

function textPoints(n: number, seed: number): [number, number][] {
  const W = 1400, H = 420
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.font = font('display', 190).replace('600', '700')
  g.fillText('MACHINE', W / 2, 185)
  g.fillText('LEARNING', W / 2, 395)
  const data = g.getImageData(0, 0, W, H).data
  const pts: [number, number][] = []
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if (data[(y * W + x) * 4 + 3] > 140) pts.push([x / W - 0.5, 0.5 - y / H])
  const r = rng(seed)
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]] }
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) out.push(pts.length ? pts[i % pts.length] : [0, 0])
  return out
}

export function createDataField(): FilmSet {
  const group = new THREE.Group()
  const r = rng(303)
  const [cx, , cz] = FIELD.center
  const obs = iris.observations
  const nI = obs.length

  // positions per state
  const A = new Float32Array(COUNT * 3), D = new Float32Array(COUNT * 3), T = new Float32Array(COUNT * 3), S = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rad = 3 + Math.cbrt(r()) * 12
    A.set([cx + Math.sin(v) * Math.cos(u) * rad, F + 2.5 + Math.cos(v) * rad * 0.45, cz + Math.sin(v) * Math.sin(u) * rad], i * 3)
  }
  const dataPos = (o: number[]): V3 => [cx + (o[2] - 3.76) * 1.55, F + 0.6 + o[3] * 1.45, cz - 2.5 - (o[0] - 5.84) * 2.0]
  for (let i = 0; i < COUNT; i++) {
    if (i < nI) D.set(dataPos(obs[i]), i * 3)
    else D.set(A.subarray(i * 3, i * 3 + 3), i * 3)
  }
  const tp = textPoints(COUNT, 7)
  const [tx, ty, tz] = FIELD.text
  for (let i = 0; i < COUNT; i++) T.set([tx + tp[i][0] * FIELD.textWidth, ty + tp[i][1] * FIELD.textWidth * 0.3, tz + (r() - 0.5) * 0.25], i * 3)
  for (let i = 0; i < COUNT; i++) {
    if (i < nI) S.set(scatterPos(obs[i][0], obs[i][1]), i * 3)
    else { const k = i * 3; S.set([A[k] + (A[k] - cx) * 1.5, A[k + 1] + 6, A[k + 2] - 10], k) }
  }

  const pos = new Float32Array(COUNT * 3)
  const colr = new Float32Array(COUNT * 3)
  const size = new Float32Array(COUNT)
  const alpha = new Float32Array(COUNT)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
  const tex = canvasTexture(glowCanvas(64))
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uMap: { value: tex }, uScale: { value: 600 } },
    vertexShader: `attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale;
      void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize*uScale/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC*t.rgb, t.a*vA); }',
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  group.add(pts)

  // nearest-class-mean regions on the floor (computed from the real data: an honest, simple classifier)
  const means = [0, 1, 2].map((c) => {
    const rows = obs.filter((_, i) => iris.labels[i] === c)
    return [rows.reduce((s, o) => s + o[2], 0) / rows.length, rows.reduce((s, o) => s + o[0], 0) / rows.length]
  })
  const RC = makeCanvas(256, 256)
  const rg = RC.getContext('2d')!
  const region = { x0: cx - 4.8, x1: cx + 5.2, z0: cz - 7, z1: cz + 1.6 }
  for (let j = 0; j < 64; j++)
    for (let i = 0; i < 64; i++) {
      const wx = lerp(region.x0, region.x1, (i + 0.5) / 64), wz = lerp(region.z0, region.z1, (j + 0.5) / 64)
      const pl = (wx - cx) / 1.55 + 3.76, sl = -(wz - cz + 2.5) / 2.0 + 5.84
      let best = 0, bd = Infinity
      means.forEach(([mpl, msl], c) => { const d = (pl - mpl) ** 2 + (sl - msl) ** 2; if (d < bd) { bd = d; best = c } })
      rg.fillStyle = SPECIES[best]
      rg.globalAlpha = 0.3
      rg.fillRect(i * 4, j * 4, 4, 4)
    }
  const regionM = new THREE.MeshBasicMaterial({ map: canvasTexture(RC), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const regionMesh = new THREE.Mesh(new THREE.PlaneGeometry(region.x1 - region.x0, region.z1 - region.z0), regionM)
  regionMesh.rotation.x = -Math.PI / 2
  regionMesh.position.set((region.x0 + region.x1) / 2, F + 0.03, (region.z0 + region.z1) / 2)
  group.add(regionMesh)

  // connections: each iris point to its class mean position (feature relationships)
  const meanPos = [0, 1, 2].map((c) => {
    const idx = obs.map((_, i) => i).filter((i) => iris.labels[i] === c)
    const p = [0, 0, 0]
    idx.forEach((i) => { p[0] += D[i * 3]; p[1] += D[i * 3 + 1]; p[2] += D[i * 3 + 2] })
    return p.map((v) => v / idx.length)
  })
  const lp: number[] = [], lc: number[] = []
  obs.forEach((_, i) => {
    const m = meanPos[iris.labels[i]]
    const c = new THREE.Color(SPECIES[iris.labels[i]])
    lp.push(D[i * 3], D[i * 3 + 1], D[i * 3 + 2], m[0], m[1], m[2])
    lc.push(c.r, c.g, c.b, c.r, c.g, c.b)
  })
  const lGeo = new THREE.BufferGeometry()
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
  lGeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3))
  const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  group.add(new THREE.LineSegments(lGeo, lMat))

  // scatter axes for the final frame
  const [sx0, sy0, sz] = scatterPos(SCATTER.x0, SCATTER.y0)
  const [sx1, sy1] = scatterPos(SCATTER.x1, SCATTER.y1)
  const axGeo = new THREE.BufferGeometry()
  axGeo.setAttribute('position', new THREE.Float32BufferAttribute([sx0, sy0, sz, sx1, sy0, sz, sx0, sy0, sz, sx0, sy1, sz], 3))
  const axM = new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0 })
  group.add(new THREE.LineSegments(axGeo, axM))

  const cyan = new THREE.Color('#9fe9ff'), white = new THREE.Color('#e8f6ff'), sp = SPECIES.map((c) => new THREE.Color(c)), dim = new THREE.Color('#3b6bd8')
  const tmp = new THREE.Color()

  return {
    group,
    update(t, ctx) {
      group.visible = t > 138.5
      if (!group.visible) return
      mat.uniforms.uScale.value = 360 * (ctx.camera.fov < 60 ? 1 : 0.8)
      const step = (a: number, b: number, d: number) => (ctx.reduced ? (t >= (a + b) / 2 ? 1 : 0) : easeInOutCubic(clamp((t - a - d) / (b - a))))
      const fadeIn = smooth(span(t, 139, 143))
      for (let i = 0; i < COUNT; i++) {
        const k = i * 3
        const isI = i < nI
        const stag = (i % 97) / 97
        const pD = isI ? step(143, 148, stag * 1.2) : 0
        const pT = step(155, 160.5, stag * 1.4)
        const pS = step(166, 170.4, stag * 0.8)
        const drift = ctx.reduced ? 0 : Math.sin(t * 0.6 + i) * 0.08
        for (let a = 0; a < 3; a++) {
          const base = lerp(A[k + a], D[k + a], pD)
          const toT = lerp(base, T[k + a], pT)
          pos[k + a] = lerp(toT, S[k + a], pS) + (a === 1 ? drift * (1 - pT) : 0)
        }
        // colour: cyan → species (scene 8) → white (letters) → unlabelled cyan (scatter)
        if (isI) {
          tmp.copy(cyan).lerp(sp[iris.labels[i]], smooth(span(t, 146, 148.5)))
          tmp.lerp(white, pT).lerp(cyan, pS)
        } else tmp.copy(dim).lerp(white, pT * 0.9)
        colr[k] = tmp.r; colr[k + 1] = tmp.g; colr[k + 2] = tmp.b
        const sh = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.3)
        size[i] = isI ? lerp(lerp(0.34, 0.55, pD), 0.26, pT) * (1 - pS) + pS * 0.5 : lerp(0.14, 0.34, pT)
        alpha[i] = fadeIn * (isI ? 1 : lerp(0.35, 0.95 * sh, pT) * (1 - pS))
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
      geo.attributes.aSize.needsUpdate = true
      geo.attributes.aAlpha.needsUpdate = true
      regionM.opacity = Math.min(smooth(span(t, 148.5, 151.5)), 1 - smooth(span(t, 154.5, 156.5))) * 0.18
      lMat.opacity = Math.min(smooth(span(t, 146.5, 148.5)), 1 - smooth(span(t, 151, 153))) * 0.5
      axM.opacity = smooth(span(t, 168.5, 170.5)) * 0.8
    },
    dispose() { disposeGroup(group); tex.dispose() },
  }
}
