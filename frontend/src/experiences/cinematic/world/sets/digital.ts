/**
 * Scene 4 (RadiologyML hall) and scene 5 (the journey inside the model), both in the digital world at DIG.
 * Scene 5 is computed, not drawn: column heights are the pixel intensities of the synthetic slice, the number panel
 * prints those exact values, and the feature maps are a real convolution → ReLU → max-pool of the same image.
 */
import * as THREE from 'three'
import { clamp, easeOutCubic, lerp, rng, smooth, span, window01, type V3 } from '../math'
import { downsample, featureMap, KERNELS, STORY_IMAGES, synthBrainSlice } from '../mri'
import { canvasTexture, font, glowCanvas, holoPanel, paintSlice, sliceCanvas, wrapText } from '../textures'
import { workstationScreen } from '../screens'
import { storyboard } from '../../story'
import { disposeGroup, DIG, JOURNEY_Z, type FilmSet } from './types'

const C = { cyan: '#38d6f0', electric: '#3b7bff', violet: '#8b7cf6', amber: '#f2b54a', green: '#5fd39a', text: '#e8eef8', dim: '#9fb0c8' }

function circuitFloor(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uFade; varying vec2 vUv; varying vec3 vW;
      float line(float x, float w){ float f = abs(fract(x) - 0.5); return smoothstep(w, 0.0, 0.5 - f); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 p = vW.xz;
        float g1 = max(line(p.x/2.0, 0.02), line(p.y/2.0, 0.02));
        float g2 = max(line(p.x/10.0, 0.006), line(p.y/10.0, 0.006));
        vec2 cell = floor(p/2.0);
        float h = hash(cell);
        float pulseX = smoothstep(0.92, 1.0, fract(p.x/24.0 - uTime*0.35 + h)) * line(p.y/2.0, 0.03);
        float pulseY = smoothstep(0.92, 1.0, fract(p.y/24.0 + uTime*0.28 + h*2.0)) * line(p.x/2.0, 0.03);
        float d = length(p);
        float fade = exp(-d*0.022);
        vec3 c = uColor * (g1*0.28 + g2*0.55) + vec3(0.6,0.9,1.0)*(pulseX + pulseY)*1.4;
        gl_FragColor = vec4(c*fade, (g1*0.5 + g2 + pulseX + pulseY)*fade*uFade);
      }`,
  })
}

export function createDigital(): FilmSet {
  const group = new THREE.Group()
  group.position.set(...DIG)
  const r = rng(77)
  const glowTex = canvasTexture(glowCanvas())

  const floorM = circuitFloor(C.electric)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorM)
  floor.rotation.x = -Math.PI / 2
  group.add(floor)

  // light columns in the distance
  const colsN = 60
  const colPos = new Float32Array(colsN * 6)
  for (let i = 0; i < colsN; i++) {
    const a = r() * Math.PI * 2, d = 30 + r() * 60, h = 8 + r() * 30
    colPos.set([Math.cos(a) * d, 0, Math.sin(a) * d - 30, Math.cos(a) * d, h, Math.sin(a) * d - 30], i * 6)
  }
  const colGeo = new THREE.BufferGeometry()
  colGeo.setAttribute('position', new THREE.BufferAttribute(colPos, 3))
  group.add(new THREE.LineSegments(colGeo, new THREE.LineBasicMaterial({ color: '#2a5bd8', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })))

  // ---------------------------------------------------------------- scene 4: holographic MRI volume
  const brain = new THREE.Group()
  brain.position.set(0, 4.2, 0)
  group.add(brain)
  const SL = 36
  const sliceMats: THREE.MeshBasicMaterial[] = []
  for (let i = 0; i < SL; i++) {
    const z = (i / (SL - 1)) * 2 - 1
    const prof = Math.sqrt(Math.max(0.04, 1 - z * z))
    const m = new THREE.MeshBasicMaterial({
      map: canvasTexture(sliceCanvas({ size: 128, z: z * 0.95, seed: 11, lesion: Math.abs(z) < 0.18 ? STORY_IMAGES.hero.lesion : null }, [0.32, 0.7, 0.95], true)),
      transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    })
    sliceMats.push(m)
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6.4 * (0.55 + 0.45 * prof), 6.4 * (0.55 + 0.45 * prof)), m)
    p.rotation.x = -Math.PI / 2
    p.position.y = z * 2.5
    brain.add(p)
  }
  const ringM = new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 48), ringM)
  const lx = STORY_IMAGES.hero.lesion.x * 3.2, lz = -STORY_IMAGES.hero.lesion.y * 3.2
  ring.position.set(lx, 0, lz)
  brain.add(ring)
  const ring2 = ring.clone()
  ring2.material = ringM
  ring2.rotation.x = -Math.PI / 2
  brain.add(ring2)
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.26, 96), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }))
  baseRing.rotation.x = -Math.PI / 2
  baseRing.position.y = 0.02
  group.add(baseRing)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 8.5, 48, 1, true), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
  beam.position.y = 4.2
  group.add(beam)

  // boot screen the camera flies through (continuity from the workstation monitor)
  const bootM = new THREE.MeshBasicMaterial({ map: canvasTexture(workstationScreen()), transparent: true, toneMapped: false, depthWrite: false })
  const boot = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.7), bootM)
  boot.position.set(0, 5, 17)
  group.add(boot)

  // data streams into the volume
  const streams: THREE.CatmullRomCurve3[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3
    const far = new THREE.Vector3(Math.cos(a) * 40, 2 + r() * 14, Math.sin(a) * 40 - 10)
    streams.push(new THREE.CatmullRomCurve3([far, new THREE.Vector3(Math.cos(a + 0.5) * 18, 6 + r() * 5, Math.sin(a + 0.5) * 18), new THREE.Vector3(Math.cos(a + 0.9) * 6, 5, Math.sin(a + 0.9) * 6), new THREE.Vector3(0, 4.2, 0)]))
  }
  const PER = 70
  const sPos = new Float32Array(streams.length * PER * 3)
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  const sMat = new THREE.PointsMaterial({ map: glowTex, size: 0.45, color: '#7fe3ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const sPts = new THREE.Points(sGeo, sMat)
  sPts.frustumCulled = false
  group.add(sPts)
  const tubeM = new THREE.MeshBasicMaterial({ color: '#2a6bd8', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  for (const s of streams) group.add(new THREE.Mesh(new THREE.TubeGeometry(s, 80, 0.03, 6), tubeM))

  // pipeline panels
  const pipe = storyboard.scenes.find((s) => s.id === 's4-radiologyml')!.pipeline!
  const hero = synthBrainSlice({ size: 128, ...STORY_IMAGES.hero })
  const maps = KERNELS.map((k) => featureMap(hero, 128, k.k))
  const panelDraw: ((g: CanvasRenderingContext2D, w: number, h: number) => void)[] = [
    (g) => { g.drawImage(sliceCanvas({ size: 256, ...STORY_IMAGES.hero }), 40, 96, 300, 300); g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'Synthetic MRI slice. 256 × 256 pixels, each one a brightness value.', 370, 140, 360, 34) },
    (g) => {
      g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'Resize to a fixed size. Scale intensities to 0–1 so every scanner speaks the same units.', 40, 120, 700, 34)
      const hist = new Array(24).fill(0); for (const v of hero) hist[Math.min(23, Math.floor(v * 24))]++
      const mx = Math.max(...hist.slice(1))
      hist.forEach((v, i) => { const hh = Math.min(1, v / mx) * 190; g.fillStyle = C.cyan; g.fillRect(60 + i * 28, 400 - hh, 20, hh) })
      g.fillStyle = C.dim; g.font = font('mono', 20); g.fillText('0', 60, 430); g.fillText('1', 700, 430); g.fillText('intensity histogram', 280, 430)
    },
    (g) => {
      g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'Learned filters respond to edges, spots and textures.', 40, 120, 700, 34)
      maps.forEach((m, i) => { g.drawImage(paintSlice(m.data, m.size, [0.75, 0.6, 1.2]), 40 + i * 178, 190, 160, 160); g.fillStyle = C.dim; g.font = font('body', 18); g.fillText(KERNELS[i].name, 44 + i * 178, 380) })
    },
    (g) => {
      g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'The model combines the features into an output for one question:', 40, 120, 700, 34)
      g.font = font('display', 36); g.fillStyle = C.text; g.fillText('Pattern present?', 40, 250)
      g.font = font('display', 30); g.fillStyle = C.amber; g.fillText('→ likely', 40, 310)
      g.font = font('body', 20); g.fillStyle = C.dim; g.fillText('(fictional, illustrative output)', 40, 400)
    },
    (g) => {
      g.font = font('display', 120); g.fillStyle = C.amber; g.fillText('0.82', 40, 250)
      g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'A model score, not the probability of disease, and not a guarantee. Scores can be wrong or poorly calibrated.', 40, 320, 700, 34)
    },
    (g) => {
      g.font = font('body', 26); g.fillStyle = C.text; wrapText(g, 'A radiologist reviews every flag, decides, and can override the model.', 40, 130, 700, 38)
      g.font = font('display', 30); g.fillStyle = C.green; g.fillText('Clinicians make the diagnosis.', 40, 330)
    },
  ]
  const panels: THREE.Mesh[] = []
  const panelTimes = storyboard.scenes.find((s) => s.id === 's4-radiologyml')!.audio.sfx.map((x) => x.t)
  pipe.forEach((title, i) => {
    const accent = i === 4 ? C.amber : i === 5 ? C.green : C.cyan
    const tex = canvasTexture(holoPanel(800, 480, title, accent, panelDraw[i], i + 1))
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    const a = lerp(1.35, -1.35, i / (pipe.length - 1))
    m.position.set(Math.sin(a) * 7.6, 4.6 + (i % 2) * 0.5, Math.cos(a) * 7.6)
    m.rotation.y = a
    m.userData.t = panelTimes[i]
    panels.push(m)
    group.add(m)
  })
  const linkPos: number[] = []
  for (let i = 0; i < panels.length - 1; i++) linkPos.push(...panels[i].position.toArray(), ...panels[i + 1].position.toArray())
  const linkGeo = new THREE.BufferGeometry()
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3))
  linkGeo.setDrawRange(0, 0)
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }))
  group.add(links)
  const light = new THREE.PointLight('#38d6f0', 30, 30, 1.2)
  light.position.set(0, 6, 0)
  group.add(light)

  return {
    group,
    update(t, ctx) {
      group.visible = t > 49.4 && t < 70.8
      if (!group.visible) return
      floorM.uniforms.uTime.value = t
      brain.rotation.y = (t - 50) * 0.12
      const reveal = smooth(span(t, 50.5, 54))
      // at the end, the camera dives into the mid slice: every other slice fades
      const solo = smooth(span(t, 68.2, 70))
      const dist = ctx.camera.position.distanceTo(brain.getWorldPosition(new THREE.Vector3()))
      const near = clamp((dist - 3) / 7, 0.25, 1)
      sliceMats.forEach((m, i) => {
        const mid = Math.abs(i - (SL - 1) / 2) < 0.6
        m.opacity = (0.04 + reveal * 0.11) * near * (mid ? 1 + solo * 5 : 1 - solo)
      })
      ringM.opacity = window01(t, 55.5, 70, 1, 0.6) * (0.55 + 0.45 * Math.sin(t * 5))
      ring.lookAt(ctx.camera.position)
      bootM.opacity = 1 - smooth(span(t, 50, 51.2))
      boot.visible = bootM.opacity > 0.01
      // stream particles
      let k = 0
      const v = new THREE.Vector3()
      streams.forEach((s, si) => {
        for (let p = 0; p < PER; p++) {
          const u = (p / PER + t * (0.06 + si * 0.004)) % 1
          s.getPoint(u, v)
          sPos[k++] = v.x; sPos[k++] = v.y; sPos[k++] = v.z
        }
      })
      sGeo.attributes.position.needsUpdate = true
      sMat.opacity = reveal * (1 - solo)
      // panels
      let shown = 0
      panels.forEach((p) => {
        const a = smooth(span(t, p.userData.t as number, (p.userData.t as number) + 0.7))
        const mm = p.material as THREE.MeshBasicMaterial
        mm.opacity = a * (1 - solo)
        p.scale.setScalar(0.85 + 0.15 * easeOutCubic(a))
        p.visible = mm.opacity > 0.01
        if (a > 0.5) shown++
      })
      linkGeo.setDrawRange(0, Math.max(0, shown - 1) * 2)
      ;(links.material as THREE.LineBasicMaterial).opacity = 0.5 * (1 - solo)
    },
    dispose() { disposeGroup(group); glowTex.dispose() },
  }
}

// ==================================================================================================== scene 5
export const JOURNEY = { origin: [DIG[0], DIG[1], DIG[2] + JOURNEY_Z] as V3, N: 64, cell: 0.2, mapsZ: -14, mapsX: [-10.8, -3.6, 3.6, 10.8], l1Z: -26, l2Z: -32, outZ: -38 }

export function createJourney(): FilmSet & { stageAt(t: number): number } {
  const group = new THREE.Group()
  group.position.set(...JOURNEY.origin)
  const r = rng(91)
  const glowTex = canvasTexture(glowCanvas())
  const floorM = circuitFloor(C.violet)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorM)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.4
  group.add(floor)

  // pixel field: heights = real intensities of the synthetic slice
  const N = JOURNEY.N, cell = JOURNEY.cell
  const full = synthBrainSlice({ size: 256, ...STORY_IMAGES.hero })
  const img = downsample(full, 256, N)
  const box = new THREE.BoxGeometry(cell * 0.86, 1, cell * 0.86)
  box.translate(0, 0.5, 0)
  const pix = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.0 }), N * N)
  const pixMat = pix.material as THREE.MeshStandardMaterial
  pixMat.onBeforeCompile = (sh) => {
    // emissive from instance colour so the image reads as a glowing display
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = vColor.rgb * 0.32;')
  }
  const col = new THREE.Color()
  const half = (N * cell) / 2
  const patch = { i0: Math.round(((STORY_IMAGES.hero.lesion.x + 1) / 2) * N) - 4, j0: Math.round(((1 - STORY_IMAGES.hero.lesion.y) / 2) * N) - 4 }
  const inPatch = (i: number, j: number) => i >= patch.i0 && i < patch.i0 + 8 && j >= patch.j0 && j < patch.j0 + 8
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const v = img[j * N + i]
      pix.setColorAt(j * N + i, inPatch(i, j) ? col.setRGB(v * 0.95, v * 0.62, v * 0.22) : col.setRGB(v * 0.32, v * 0.6, v * 0.82))
    }
  group.add(pix)
  const pm = new THREE.Matrix4()

  // number panel: the actual 8×8 values of the patch
  const numC = holoPanel(900, 900, 'Pixel values (8 × 8 patch)', C.amber, (g) => {
    g.font = font('mono', 30)
    for (let jj = 0; jj < 8; jj++)
      for (let ii = 0; ii < 8; ii++) {
        const v = img[(patch.j0 + jj) * N + patch.i0 + ii]
        g.fillStyle = `rgba(242,181,74,${0.45 + v * 0.55})`
        g.fillText(v.toFixed(2), 50 + ii * 104, 150 + jj * 88)
      }
    g.font = font('body', 24); g.fillStyle = C.dim
    g.fillText(`The whole image: ${N} × ${N} = ${(N * N).toLocaleString('en')} numbers`, 50, 860)
  })
  const numM = new THREE.MeshBasicMaterial({ map: canvasTexture(numC), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  const pxX = (i: number) => -half + (i + 0.5) * cell
  const pxZ = (j: number) => -half + (j + 0.5) * cell
  const patchCenter = new THREE.Vector3(pxX(patch.i0 + 3.5), 0, pxZ(patch.j0 + 3.5))
  const nums = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), numM)
  nums.position.set(patchCenter.x, 3.3, patchCenter.z)
  group.add(nums)

  // feature maps: real convolution → ReLU → 2×2 max-pool of the 64×64 image (→ 32×32)
  const fm = KERNELS.map((k) => featureMap(img, N, k.k))
  const fN = fm[0].size
  const fcell = 6 / fN
  const fbox = new THREE.BoxGeometry(fcell * 0.85, fcell * 0.85, 1)
  fbox.translate(0, 0, 0.5)
  const fmesh = new THREE.InstancedMesh(fbox, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 1 }), fN * fN * fm.length)
  fm.forEach((m, mi) => {
    for (let j = 0; j < fN; j++)
      for (let i = 0; i < fN; i++) {
        const v = m.data[j * fN + i]
        fmesh.setColorAt(mi * fN * fN + j * fN + i, col.setRGB(0.25 + v * 0.55, 0.2 + v * 0.45, 0.45 + v * 0.75).multiplyScalar(0.18 + v * 0.7))
      }
  })
  group.add(fmesh)
  const mapLabels = KERNELS.map((k, mi) => {
    const c = holoPanel(700, 150, k.name, C.violet, () => {})
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.77), new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))
    mm.position.set(JOURNEY.mapsX[mi], 7.2, JOURNEY.mapsZ)
    group.add(mm)
    return mm
  })

  // small dense network (illustrative)
  const layers = [{ n: 16, z: JOURNEY.l1Z, sp: 0.75 }, { n: 8, z: JOURNEY.l2Z, sp: 1.0 }, { n: 2, z: JOURNEY.outZ, sp: 2.4 }]
  const nodes: THREE.Vector3[][] = layers.map((L) => Array.from({ length: L.n }, (_, i) => new THREE.Vector3((i - (L.n - 1) / 2) * L.sp, 3.5 + Math.sin(i * 1.7) * 0.4, L.z)))
  const nodeGeo = new THREE.SphereGeometry(0.2, 20, 14)
  const nodeMats: THREE.MeshBasicMaterial[] = []
  nodes.flat().forEach((p) => {
    const m = new THREE.MeshBasicMaterial({ color: C.electric, toneMapped: false, transparent: true })
    nodeMats.push(m)
    const s = new THREE.Mesh(nodeGeo, m)
    s.position.copy(p)
    group.add(s)
  })
  // edges with travelling pulses (shader uses per-vertex progress)
  const ePos: number[] = [], eProg: number[] = [], eSeed: number[] = []
  const sources = JOURNEY.mapsX.map((x) => new THREE.Vector3(x, 3.5, JOURNEY.mapsZ))
  const pairs: [THREE.Vector3, THREE.Vector3][] = []
  sources.forEach((a) => nodes[0].forEach((b) => pairs.push([a, b])))
  for (let l = 0; l < nodes.length - 1; l++) nodes[l].forEach((a) => nodes[l + 1].forEach((b) => pairs.push([a, b])))
  for (const [a, b] of pairs) {
    const s = r()
    ePos.push(...a.toArray(), ...b.toArray()); eProg.push(0, 1); eSeed.push(s, s)
  }
  const eGeo = new THREE.BufferGeometry()
  eGeo.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3))
  eGeo.setAttribute('aProg', new THREE.Float32BufferAttribute(eProg, 1))
  eGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(eSeed, 1))
  const eMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: 'attribute float aProg; attribute float aSeed; varying float vP; varying float vS; void main(){ vP = aProg; vS = aSeed; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uTime; uniform float uOn; varying float vP; varying float vS;
      void main(){ float head = fract(uTime*0.55 + vS); float pulse = smoothstep(0.12, 0.0, abs(vP - head));
      vec3 c = mix(vec3(0.16,0.3,0.8), vec3(0.75,0.95,1.0), pulse); gl_FragColor = vec4(c, (0.07 + pulse*0.8)*uOn); }`,
  })
  const edges = new THREE.LineSegments(eGeo, eMat)
  edges.frustumCulled = false
  group.add(edges)

  // prediction vs expert label (illustrative)
  const predC = holoPanel(760, 420, 'Model prediction', C.amber, (g) => {
    g.font = font('display', 40); g.fillStyle = C.text; g.fillText('Pattern likely', 40, 170)
    g.font = font('display', 34); g.fillStyle = C.amber; g.fillText('score 0.82', 40, 230)
    g.font = font('body', 22); g.fillStyle = C.dim; wrapText(g, 'Illustrative network. Trees, k-NN and linear models work differently.', 40, 310, 680, 32)
  })
  const labC = holoPanel(760, 420, 'Expert label', C.green, (g) => {
    g.font = font('display', 40); g.fillStyle = C.text; g.fillText('Pattern present', 40, 170)
    g.font = font('body', 24); g.fillStyle = C.dim; wrapText(g, 'During training, the gap between prediction and label (the loss) is used to adjust the weights.', 40, 240, 680, 34)
  })
  const mkBill = (c: HTMLCanvasElement, p: V3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.88), new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))
    m.position.set(...p)
    group.add(m)
    return m
  }
  const pred = mkBill(predC, [-2.4, 6.4, JOURNEY.outZ - 1])
  const lab = mkBill(labC, [2.4, 6.4, JOURNEY.outZ - 1])
  const checkM = new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide })
  const check = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 40), checkM)
  check.position.set(0, 7.6, JOURNEY.outZ - 0.9)
  group.add(check)

  // floating data motes
  const MOTES = 900
  const mPos = new Float32Array(MOTES * 3)
  for (let i = 0; i < MOTES; i++) mPos.set([(r() - 0.5) * 50, r() * 14, -r() * 60 + 10], i * 3)
  const mGeo = new THREE.BufferGeometry()
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3))
  const motes = new THREE.Points(mGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.18, color: '#8b7cf6', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }))
  group.add(motes)
  const light = new THREE.PointLight('#8bd8ff', 14, 30, 1.2)
  light.position.set(0, 8, 2)
  group.add(light, new THREE.HemisphereLight('#4060c0', '#05060c', 0.6))

  const stageAt = (t: number) => (t < 72 ? 0 : t < 76.4 ? 1 : t < 81 ? 2 : t < 87 ? 3 : t < 91 ? 4 : 5)

  return {
    group,
    stageAt,
    update(t, ctx) {
      group.visible = t > 69.2 && t < 95.8
      if (!group.visible) return
      floorM.uniforms.uTime.value = t
      eMat.uniforms.uTime.value = t
      // pixels rise as a wave from the centre; heights are the real intensities
      const rise = t - 72
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const v = img[j * N + i]
          const d = Math.hypot(i - N / 2, j - N / 2) / (N / 2)
          const p = ctx.reduced ? (t > 72 ? 1 : 0) : easeOutCubic(clamp((rise - d * 1.6) / 1.6))
          let h = 0.03 + p * v * 2.2
          if (inPatch(i, j)) h += smooth(span(t, 77, 78.4)) * 0.6
          pm.makeScale(1, h, 1).setPosition(pxX(i), 0, pxZ(j))
          pix.setMatrixAt(j * N + i, pm)
        }
      pix.instanceMatrix.needsUpdate = true
      numM.opacity = window01(t, 77.4, 82.6, 0.8, 0.9)
      nums.lookAt(ctx.camera.position)
      // feature maps grow out of their planes
      const fOn = smooth(span(t, 80.6, 83))
      fm.forEach((m, mi) => {
        const lp = smooth(span(t, 80.8 + mi * 0.35, 82.4 + mi * 0.35))
        for (let j = 0; j < fN; j++)
          for (let i = 0; i < fN; i++) {
            const v = m.data[j * fN + i]
            pm.makeScale(1, 1, 0.02 + lp * v * 1.2).setPosition(JOURNEY.mapsX[mi] - 3 + (i + 0.5) * fcell, 0.5 + 6 - (j + 0.5) * fcell, JOURNEY.mapsZ)
            fmesh.setMatrixAt(mi * fN * fN + j * fN + i, pm)
          }
        ;(mapLabels[mi].material as THREE.MeshBasicMaterial).opacity = lp
      })
      fmesh.instanceMatrix.needsUpdate = true
      ;(fmesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.02, fOn)
      // network activity
      eMat.uniforms.uOn.value = smooth(span(t, 85.5, 88))
      let ni = 0
      nodes.forEach((layer, li) => layer.forEach((_, i) => {
        const on = smooth(span(t, 87 + li * 1.2, 88 + li * 1.2))
        const m = nodeMats[ni++]
        const isOut = li === 2
        m.color.set(isOut ? (i === 0 ? C.amber : '#3a4a6a') : C.electric).multiplyScalar(0.4 + on * (isOut && i === 0 ? 2.2 : 1.1))
        m.opacity = 0.25 + on * 0.75
      }))
      const pv = smooth(span(t, 90.2, 91.2)), lv = smooth(span(t, 91.4, 92.4)), cv = smooth(span(t, 92.6, 93.2))
      ;(pred.material as THREE.MeshBasicMaterial).opacity = pv
      ;(lab.material as THREE.MeshBasicMaterial).opacity = lv
      checkM.opacity = cv
      const cam = ctx.camera.position
      pred.lookAt(cam); lab.lookAt(cam); check.lookAt(cam)
      pred.position.x = lerp(-2.4, -1.95, cv); lab.position.x = lerp(2.4, 1.95, cv)
      motes.rotation.y = t * 0.01
    },
    dispose() { disposeGroup(group); glowTex.dispose() },
  }
}
