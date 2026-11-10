/**
 * Scene 1 — the hospital at night: rain, wet street with mirrored reflections, a lit facade whose third-floor window
 * is real glass in front of the actual lab set, city blocks, beacons.
 */
import * as THREE from 'three'
import { rng } from '../math'
import { canvasTexture, font, glowCanvas, makeCanvas, windowsCanvas } from '../textures'
import { disposeGroup, F, LAB, type FilmSet } from './types'

const W = 24, H = 30, FLOOR = 3.6, Z = LAB.z0

export function createExterior(): FilmSet {
  const group = new THREE.Group()
  const r = rng(42)
  const concrete = new THREE.MeshStandardMaterial({ color: '#141a26', roughness: 0.85, metalness: 0.1 })
  const trim = new THREE.MeshStandardMaterial({ color: '#202a3c', roughness: 0.6, metalness: 0.3 })

  // sky dome: vertical gradient with a faint warm city glow at the horizon
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(0.012,0.02,0.05); vec3 mid = vec3(0.04,0.07,0.14); vec3 glow = vec3(0.16,0.12,0.12);
        vec3 c = mix(mid, top, smoothstep(0.0, 0.5, h)); c += glow * exp(-abs(h)*14.0) * 0.7; gl_FragColor = vec4(c,1.); }`,
    }),
  )
  group.add(sky)
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(glowCanvas(256, 'rgba(220,235,255,1)')), color: '#cfe2ff', transparent: true, depthWrite: false, fog: false }))
  moon.position.set(-140, 150, -300)
  moon.scale.setScalar(60)
  group.add(moon)

  // ground (slightly transparent + mirrored lights underneath = wet street reflections)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#05080f', roughness: 0.18, metalness: 0.65, transparent: true, opacity: 0.86 }))
  ground.rotation.x = -Math.PI / 2
  group.add(ground)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(600, 14), new THREE.MeshStandardMaterial({ color: '#080b12', roughness: 0.22, metalness: 0.5, transparent: true, opacity: 0.9 }))
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.01, 12)
  group.add(road)
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2, 0.16), new THREE.MeshBasicMaterial({ color: '#8a8f80', transparent: true, opacity: 0.5 }), 40)
  for (let i = 0; i < 40; i++) dashes.setMatrixAt(i, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(-120 + i * 6, 0.02, 12))
  group.add(dashes)

  // building body — built around the lab so the third-floor window looks into the real lab set
  const body = new THREE.Group()
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m = concrete) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z0 - z1), m)
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    body.add(b)
  }
  const zb = Z - 0.4, zBack = Z - 22
  box(-W, W, 0, F, zb, zBack)
  box(-W, W, F + LAB.h, H, zb, zBack)
  box(-W, LAB.x0, F, F + LAB.h, zb, zBack)
  box(LAB.x1, W, F, F + LAB.h, zb, zBack)
  box(LAB.x0, LAB.x1, F, F + LAB.h, LAB.z1, zBack)
  // low wings
  box(-W - 34, -W, 0, 10.8, Z - 4, Z - 20)
  box(W, W + 34, 0, 10.8, Z - 4, Z - 20)
  group.add(body)

  // facade: floor slabs + mullions
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(W * 2 + 0.6, 0.35, 0.7), trim, 9)
  for (let f = 0; f <= 8; f++) slabs.setMatrixAt(f, new THREE.Matrix4().setPosition(0, f * FLOOR, Z + 0.1))
  group.add(slabs)
  const cols = 24
  const mull = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, H, 0.5), trim, cols + 1)
  for (let c = 0; c <= cols; c++) mull.setMatrixAt(c, new THREE.Matrix4().setPosition(-W + (c * 2 * W) / cols, H / 2, Z + 0.1))
  group.add(mull)

  // window panes (lit offices); the lab's band is real glass
  const panes: THREE.Matrix4[] = [], colors: THREE.Color[] = []
  const cw = (2 * W) / cols
  for (let f = 0; f < 8; f++)
    for (let c = 0; c < cols; c++) {
      const x = -W + cw * (c + 0.5), y = f * FLOOR + FLOOR / 2 + 0.1
      if (f === 2 && x >= LAB.x0 - 0.01 && x <= LAB.x1 + 0.01) continue
      const v = r()
      const col = v < 0.5 ? new THREE.Color('#0a1222').multiplyScalar(0.6 + r()) : v < 0.68 ? new THREE.Color('#f3c58a').multiplyScalar(0.28 + r() * 0.22) : v < 0.93 ? new THREE.Color('#8fc4ec').multiplyScalar(0.2 + r() * 0.25) : new THREE.Color('#5ff0e0').multiplyScalar(0.4)
      panes.push(new THREE.Matrix4().setPosition(x, y, Z + 0.02))
      colors.push(col)
    }
  const paneGeo = new THREE.PlaneGeometry(cw - 0.5, FLOOR - 0.75)
  // office interior hint: brighter ceiling band, blinds, a dark desk line
  const pc = makeCanvas(64, 96)
  const pg = pc.getContext('2d')!
  const grad = pg.createLinearGradient(0, 0, 0, 96)
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, '#b8b8b8'); grad.addColorStop(1, '#5a5a5a')
  pg.fillStyle = grad; pg.fillRect(0, 0, 64, 96)
  pg.fillStyle = 'rgba(0,0,0,0.18)'
  for (let y = 4; y < 60; y += 6) pg.fillRect(0, y, 64, 2)
  pg.fillStyle = 'rgba(0,0,0,0.45)'; pg.fillRect(0, 70, 64, 8)
  const paneTex = canvasTexture(pc)
  const paneMesh = new THREE.InstancedMesh(paneGeo, new THREE.MeshBasicMaterial({ toneMapped: false, map: paneTex }), panes.length)
  const mirror = new THREE.InstancedMesh(paneGeo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), panes.length)
  panes.forEach((m, i) => {
    paneMesh.setMatrixAt(i, m)
    paneMesh.setColorAt(i, colors[i])
    const p = new THREE.Vector3().setFromMatrixPosition(m)
    mirror.setMatrixAt(i, new THREE.Matrix4().makeScale(1, -1, 1).setPosition(p.x, -p.y, p.z))
    mirror.setColorAt(i, colors[i].clone().multiplyScalar(0.6))
  })
  group.add(paneMesh, mirror)

  // the lab window: real glass the camera passes through
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(LAB.x1 - LAB.x0, LAB.h - 0.4), new THREE.MeshBasicMaterial({ color: '#7fb4d8', transparent: true, opacity: 0.06, depthWrite: false }))
  glass.position.set(0, F + LAB.h / 2, Z + 0.04)
  group.add(glass)
  const labGlow = new THREE.Mesh(new THREE.PlaneGeometry(LAB.x1 - LAB.x0, 1.2), new THREE.MeshBasicMaterial({ color: '#38d6f0', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }))
  labGlow.scale.y = -1
  labGlow.position.set(0, -(F + 1.8), Z + 0.03)
  group.add(labGlow)

  // signage
  const signC = makeCanvas(1024, 128)
  const g = signC.getContext('2d')!
  g.fillStyle = 'rgba(0,0,0,0)'
  g.fillRect(0, 0, 1024, 128)
  g.font = font('display', 72)
  g.fillStyle = '#dff8ff'
  g.textAlign = 'center'
  g.fillText('UNIVERSITY HOSPITAL', 512, 92)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2), new THREE.MeshBasicMaterial({ map: canvasTexture(signC), transparent: true, toneMapped: false, color: '#bff4ff' }))
  sign.position.set(0, H + 1.6, Z + 0.3)
  group.add(sign)
  const crossM = new THREE.MeshBasicMaterial({ color: '#5ff0d0', toneMapped: false })
  const cross = new THREE.Group()
  cross.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.3), crossM), new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.3), crossM))
  cross.position.set(W - 3, H + 2, Z + 0.3)
  group.add(cross)
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), new THREE.MeshStandardMaterial({ color: '#1b2536', emissive: '#38d6f0', emissiveIntensity: 0.25 }))
  entrance.position.set(0, 4.2, Z + 2)
  group.add(entrance)
  const lobby = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe6b8').multiplyScalar(0.55), toneMapped: false }))
  lobby.position.set(0, 2, Z + 0.03)
  group.add(lobby)

  // city blocks (instanced, shared window texture)
  const cityTex = canvasTexture(windowsCanvas(9))
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#0b1120', roughness: 0.9, emissive: '#ffffff', emissiveMap: cityTex, emissiveIntensity: 0.9 }), 90)
  const m4 = new THREE.Matrix4()
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 70 + r() * 140
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 60
    if (z > -20 && Math.abs(x) < 140) { m4.makeScale(0.001, 0.001, 0.001); city.setMatrixAt(i, m4); continue }
    const w = 8 + r() * 16, h = 12 + r() * 60, dd = 8 + r() * 14
    m4.makeScale(w, h, dd).setPosition(x, h / 2, z)
    city.setMatrixAt(i, m4)
  }
  group.add(city)

  // street lamps
  const lampHeadM = new THREE.MeshBasicMaterial({ color: '#ffcf8a', toneMapped: false })
  const poleM = new THREE.MeshStandardMaterial({ color: '#1a1f2a', roughness: 0.5, metalness: 0.6 })
  for (const x of [-30, -12, 12, 30]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), poleM)
    pole.position.set(x, 3.5, 5)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), lampHeadM)
    head.position.set(x, 7.1, 5)
    const refl = head.clone()
    refl.position.y = -7.1
    group.add(pole, head, refl)
  }
  const lampLights = [-12, 12].map((x) => { const l = new THREE.PointLight('#ffc27a', 60, 30, 1.6); l.position.set(x, 6.8, 5); group.add(l); return l })
  void lampLights
  const facadeLight = new THREE.SpotLight('#5d8fd8', 160, 80, 0.6, 0.6, 1.2)
  facadeLight.position.set(0, 2, 20)
  facadeLight.target.position.set(0, 18, Z)
  group.add(facadeLight, facadeLight.target)
  const moonLight = new THREE.DirectionalLight('#8fb0ff', 0.5)
  moonLight.position.set(-60, 80, -40)
  group.add(moonLight, new THREE.HemisphereLight('#203050', '#05070c', 0.6))

  // beacons (roof + ambulance bay)
  const glowTex = canvasTexture(glowCanvas())
  const mkBeacon = (color: string, p: [number, number, number], s: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    sp.position.set(...p)
    sp.scale.setScalar(s)
    group.add(sp)
    return sp
  }
  const roofBeacon = mkBeacon('#ff5a5a', [-W + 2, H + 1, Z - 10], 3)
  const ambA = mkBeacon('#ff6060', [-9, 1.6, Z + 6], 2.2)
  const ambB = mkBeacon('#5aa0ff', [-7.6, 1.6, Z + 6], 2.2)
  const ambulance = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#e7ebf2', roughness: 0.4 }))
  ambulance.position.set(-8.3, 1.2, Z + 9)
  group.add(ambulance)

  // rain: GPU streaks driven by film time
  const N = 7000
  const pos = new Float32Array(N * 2 * 3), seed = new Float32Array(N * 2), end = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * 100, y = r() * 50, z = -25 + r() * 95, s = r()
    for (let k = 0; k < 2; k++) { pos.set([x, y, z], (i * 2 + k) * 3); seed[i * 2 + k] = s; end[i * 2 + k] = k }
  }
  const rg = new THREE.BufferGeometry()
  rg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  rg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  rg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
  const rainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.32 } },
    vertexShader: `attribute float aSeed; attribute float aEnd; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; float sp = 22.0 + aSeed*10.0; p.y = mod(p.y - uTime*sp + aSeed*50.0, 50.0) + aEnd*0.75; p.x += aEnd*0.08;
      vA = 1.0 - aEnd*0.7; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: 'uniform float uOpacity; varying float vA; void main(){ gl_FragColor = vec4(0.62,0.74,0.92, uOpacity*vA); }',
  })
  const rain = new THREE.LineSegments(rg, rainMat)
  rain.frustumCulled = false
  group.add(rain)

  return {
    group,
    update(t) {
      rainMat.uniforms.uTime.value = t
      const blink = (t * 1.1) % 1 < 0.12 ? 1 : 0.15
      roofBeacon.material.opacity = blink
      const ph = Math.floor(t * 3) % 2
      ambA.material.opacity = ph ? 1 : 0.15
      ambB.material.opacity = ph ? 0.15 : 1
      // fade the rain as the camera enters the building
      rainMat.uniforms.uOpacity.value = t < 12 ? 0.32 : Math.max(0, 0.32 * (1 - (t - 12) / 2.5))
    },
    dispose() { disposeGroup(group) },
  }
}
