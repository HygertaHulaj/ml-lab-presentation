/**
 * FilmWorld — the whole film as one Three.js world rendered from a single number: film time `t`.
 * Framework-agnostic: the Vue player and the Remotion composition both create a FilmWorld on a canvas and call
 * `render(t)`. Owns the renderer, post-processing (bloom + grade), sets, camera director, and disposal.
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { CameraDirector, type CameraState } from './CameraDirector'
import { SHOTS } from './shots'
import { createExterior } from './sets/exterior'
import { createLab } from './sets/lab'
import { createDigital, createJourney } from './sets/digital'
import { createDataField } from './sets/datafield'
import { disposeSharedCharacterGeometry } from './characters/Character'
import type { FilmSet, FrameCtx } from './sets/types'
import { clamp, lerp, smooth, span } from './math'
import { sceneAt, tokens, type SetId } from '../story'

export type Quality = 'high' | 'low'
export interface FilmWorldOptions { canvas: HTMLCanvasElement; width: number; height: number; pixelRatio?: number; quality?: Quality; reducedMotion?: boolean; preserveDrawingBuffer?: boolean }

const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uVignette: { value: 0.9 }, uGrain: { value: 0.035 }, uAberration: { value: 0.0012 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color('#bff4ff') } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain; uniform float uAberration; uniform float uFlash; uniform vec3 uFlashColor; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float ab = uAberration * dot(d, d) * 4.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + d*ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d*ab).b);
      float vig = smoothstep(0.85, 0.25, length(d) * uVignette);
      col *= mix(0.55, 1.0, vig);
      col += (rand(vUv * 913.0 + fract(uTime * 7.31)) - 0.5) * uGrain;
      col = mix(col, uFlashColor, uFlash);
      gl_FragColor = vec4(col, 1.0);
    }`,
}

const FOG: Record<SetId, { color: string; density: number; bg: string }> = {
  exterior: { color: '#0b1528', density: 0.0075, bg: '#04070e' },
  lab: { color: '#070b14', density: 0.012, bg: '#070b14' },
  digital: { color: '#03060d', density: 0.022, bg: '#02040a' },
  journey: { color: '#04050d', density: 0.02, bg: '#03040a' },
  landscape: { color: '#050a18', density: 0.01, bg: '#040814' },
  reveal: { color: '#040814', density: 0.006, bg: '#03060f' },
}

export class FilmWorld {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private grade: ShaderPass
  private sets: FilmSet[]
  private lab: ReturnType<typeof createLab>
  private director: CameraDirector
  private cam: CameraState = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 45, shotId: '' }
  private fog = new THREE.FogExp2('#000', 0.01)
  private bg = new THREE.Color()
  private ctx: FrameCtx
  private quality: Quality
  reducedMotion: boolean
  lastShot = ''

  constructor(o: FilmWorldOptions) {
    this.quality = o.quality ?? 'high'
    this.reducedMotion = !!o.reducedMotion
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: this.quality === 'high', powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserveDrawingBuffer })
    this.renderer.setPixelRatio(o.pixelRatio ?? Math.min(2, window.devicePixelRatio || 1))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.camera = new THREE.PerspectiveCamera(45, o.width / o.height, 0.05, 900)
    this.scene.fog = this.fog
    this.scene.background = this.bg
    this.scene.add(this.camera)

    this.lab = createLab()
    this.sets = [createExterior(), this.lab, createDigital(), createJourney(), createDataField()]
    for (const s of this.sets) this.scene.add(s.group)
    this.director = new CameraDirector(SHOTS, this.reducedMotion)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(o.width, o.height), 0.8, 0.5, 0.82)
    this.bloom.enabled = this.quality === 'high'
    this.composer.addPass(this.bloom)
    this.grade = new ShaderPass(GradeShader)
    this.composer.addPass(this.grade)
    this.composer.addPass(new OutputPass())
    this.ctx = { reduced: this.reducedMotion, camera: this.camera, aspect: o.width / o.height }
    this.setSize(o.width, o.height)
  }

  setSize(w: number, h: number) {
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.camera.aspect = w / h
    this.ctx.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v
    this.director.reducedMotion = v
    this.ctx.reduced = v
  }

  setQuality(q: Quality) {
    this.quality = q
    this.bloom.enabled = q === 'high'
  }

  /** Render the frame at film time t (seconds). `flash` = 0..1 full-screen transition amount (from story.transitionOverlayAt). */
  render(t: number, flash = 0) {
    const scene = sceneAt(t)
    // environment per set, with a soft blend across the lab → landscape dissolve
    let set: SetId = scene.set
    if (t < 13.6) set = 'exterior'
    else if (t < 50) set = 'lab'
    const f = FOG[set]
    let density = f.density
    const c = new THREE.Color(f.color), bg = new THREE.Color(f.bg)
    if (set === 'landscape') {
      const p = smooth(span(t, 139, 143.5))
      c.lerp(new THREE.Color(FOG.lab.color), 1 - p)
      bg.lerp(new THREE.Color(FOG.lab.bg), 1 - p)
      density = lerp(FOG.lab.density, f.density, p)
    }
    if (t > 12.4 && t < 14.4) density = lerp(FOG.exterior.density, FOG.lab.density, span(t, 12.4, 14.4))
    this.fog.color.copy(c)
    this.fog.density = density
    this.bg.copy(bg)
    // the exterior is only needed until the camera is inside
    this.sets[0].group.visible = t < 15.5

    this.director.poseAt(t, this.cam)
    this.lastShot = this.cam.shotId
    this.camera.position.copy(this.cam.position)
    this.camera.quaternion.copy(this.cam.quaternion)
    const fovScale = this.ctx.aspect < 1 ? 1.5 : 1
    this.camera.fov = clamp(this.cam.fov * fovScale, 10, 100)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()

    for (const s of this.sets) s.update(t, this.ctx)

    const bloomTarget = tokens.bloom[set] ?? 0.8
    this.bloom.strength = bloomTarget * 0.85
    this.grade.uniforms.uTime.value = t
    this.grade.uniforms.uFlash.value = flash
    this.composer.render()
  }

  /** Iris particles at the end are in world space; used by the Vue overlay to project axis labels. */
  project(v: THREE.Vector3, w: number, h: number) {
    const p = v.clone().project(this.camera)
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z < 1 }
  }

  dispose() {
    for (const s of this.sets) s.dispose()
    disposeSharedCharacterGeometry()
    this.composer.dispose()
    this.bloom.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
