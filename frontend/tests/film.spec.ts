/** Unit tests for "The Scan That Changed Everything": story data, camera director, synthetic images, real computations. */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { cueAt, iris, narration, sceneAt, storyboard, transitionOverlayAt, validateStory } from '../src/experiences/cinematic/story'
import { CameraDirector } from '../src/experiences/cinematic/world/CameraDirector'
import { SHOTS } from '../src/experiences/cinematic/world/shots'
import { featureMap, KERNELS, STORY_IMAGES, synthBrainSlice, downsample } from '../src/experiences/cinematic/world/mri'
import { ols, nearestNeighbour, thresholdConfusion, conceptData } from '../src/experiences/cinematic/concepts'
import { Character, CAST } from '../src/experiences/cinematic/world/characters/Character'

describe('shared story data', () => {
  it('is internally consistent (contiguous scenes, cues inside scenes, readable caption speed)', () => {
    expect(validateStory()).toEqual([])
  })
  it('runs about 2–3 minutes with the nine scenes of the brief', () => {
    expect(storyboard.duration).toBeGreaterThanOrEqual(120)
    expect(storyboard.duration).toBeLessThanOrEqual(180)
    expect(storyboard.scenes.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
  it('keeps the responsible-AI wording in the script', () => {
    const all = narration.map((c) => c.text).join(' ')
    expect(all).toContain('not a diagnosis')
    expect(all).toContain("hasn't replaced the doctor")
    expect(all).toMatch(/may become/) // more data does not guarantee improvement
    expect(storyboard.scenes.find((s) => s.id === 's6-mistakes')!.loop).toContain('Validation')
  })
  it('finds the scene and caption at a time', () => {
    expect(sceneAt(0).id).toBe('s1-hospital')
    expect(sceneAt(80).id).toBe('s5-machine')
    expect(sceneAt(171.9).id).toBe('s9-reveal')
    expect(cueAt(37)?.speaker).toBe('noe')
    expect(cueAt(44)?.speaker).toBe('salizar')
    expect(cueAt(0.1)).toBeNull()
  })
  it('peaks full-screen transitions at their midpoint and leaves the rest of the film clear', () => {
    const s3 = storyboard.scenes.find((s) => s.id === 's3-question')!.transition
    expect(transitionOverlayAt(s3.at! + s3.duration! / 2).amount).toBeCloseTo(1, 5)
    expect(transitionOverlayAt(30).amount).toBe(0)
    expect(transitionOverlayAt(171).amount).toBe(0)
  })
  it('bundles the real Iris data (150 × 4, Fisher 1936)', () => {
    expect(iris.observations).toHaveLength(150)
    expect(iris.observations[0]).toEqual([5.1, 3.5, 1.4, 0.2])
    expect(new Set(iris.labels)).toEqual(new Set([0, 1, 2]))
  })
})

describe('camera plan', () => {
  it('matches the storyboard shot list exactly (ids and boundaries)', () => {
    const fromBoard = storyboard.scenes.flatMap((s) => s.shots.map((sh) => [sh.id, sh.start, sh.end]))
    expect(SHOTS.map((s) => [s.id, s.start, s.end])).toEqual(fromBoard)
  })
  const dir = new CameraDirector(SHOTS)
  it('is a pure function of time', () => {
    const a = dir.poseAt(33.3), b = dir.poseAt(33.3)
    expect(a.position.toArray()).toEqual(b.position.toArray())
    expect(a.quaternion.toArray()).toEqual(b.quaternion.toArray())
  })
  it('never jumps at a shot boundary unless the shot is a declared cut', () => {
    for (let i = 1; i < SHOTS.length; i++) {
      const s = SHOTS[i]
      if (s.cut) continue
      const before = dir.poseAt(s.start - 0.01), after = dir.poseAt(s.start + 0.01)
      expect(before.position.distanceTo(after.position), `jump into shot ${s.id}`).toBeLessThan(0.5)
      expect(before.quaternion.angleTo(after.quaternion), `turn into shot ${s.id}`).toBeLessThan(0.2)
    }
  })
  it('only cuts behind a full-screen transition', () => {
    for (const s of SHOTS.filter((x) => x.cut)) expect(transitionOverlayAt(s.start).amount, `cut ${s.id}`).toBeGreaterThan(0.3)
  })
  it('holds still compositions in reduced-motion mode', () => {
    const r = new CameraDirector(SHOTS, true)
    expect(r.poseAt(16).position.toArray()).toEqual(r.poseAt(23).position.toArray())
  })
})

describe('synthetic MRI and real feature computation', () => {
  it('is deterministic and normalised to 0..1', () => {
    const a = synthBrainSlice({ size: 64, ...STORY_IMAGES.hero }), b = synthBrainSlice({ size: 64, ...STORY_IMAGES.hero })
    expect(Array.from(a)).toEqual(Array.from(b))
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...a)).toBeLessThanOrEqual(1)
  })
  it('places the focal pattern where the story says', () => {
    const N = 128
    const withL = synthBrainSlice({ size: N, ...STORY_IMAGES.hero }), without = synthBrainSlice({ size: N, seed: STORY_IMAGES.hero.seed })
    const { x, y } = STORY_IMAGES.hero.lesion
    const i = Math.round(((x + 1) / 2) * N), j = Math.round(((1 - y) / 2) * N)
    expect(withL[j * N + i] - without[j * N + i]).toBeGreaterThan(0.15)
  })
  it('computes convolution → ReLU → 2×2 max-pool correctly', () => {
    // 4×4 image with a vertical edge; Sobel-x responds on the edge
    const img = new Float32Array([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1])
    const fm = featureMap(img, 4, KERNELS[0].k)
    expect(fm.size).toBe(2)
    // raw conv at (1,1) = 4 (interior edge), max over the top-left 2×2 block; output normalised by the max
    expect(fm.max).toBe(4)
    expect(Math.min(...fm.data)).toBeGreaterThanOrEqual(0)
    expect(fm.data[0]).toBe(1)
  })
  it('downsamples by box averaging', () => {
    const img = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    expect(Array.from(downsample(img, 4, 2))).toEqual([0.5, 0, 0, 0.5])
  })
})

describe('scene-9 concept previews use real computations on Iris', () => {
  it('ols recovers a known line', () => {
    const f = ols([0, 1, 2, 3].map((x) => ({ x, y: 2 + 3 * x })))
    expect(f.a).toBeCloseTo(2)
    expect(f.b).toBeCloseTo(3)
    expect(f.r2).toBeCloseTo(1)
  })
  it('nearest neighbour and confusion counts are consistent', () => {
    expect(nearestNeighbour([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }])).toEqual([1, 0, 1])
    const m = thresholdConfusion([1, 2, 3, 4], [0, 0, 1, 1], 1, 2.5)
    expect(m).toMatchObject({ tp: 2, fp: 0, fn: 0, tn: 2, accuracy: 1 })
    const d = conceptData()
    expect(d.conf.tp + d.conf.fp + d.conf.fn + d.conf.tn).toBe(100) // versicolor + virginica
    expect(d.fit.b).toBeGreaterThan(0) // petal width grows with petal length
  })
})

describe('character rig', () => {
  it('poses, blinks and looks without producing NaNs', () => {
    const c = new Character(CAST.noe)
    c.root.position.set(0, 0, 0)
    c.setState({ t: 1.23, poses: [['holdTablet', 1]], expression: [['curious', 1]], lookAt: new THREE.Vector3(1, 1.6, 2), walk: { phase: 1, amount: 1 }, talk: 1 })
    c.root.updateMatrixWorld(true)
    c.root.traverse((o) => {
      for (const v of [...o.position.toArray(), ...o.rotation.toArray().slice(0, 3)]) expect(Number.isFinite(v as number)).toBe(true)
    })
    expect(c.joints.head.rotation.y).toBeGreaterThan(0) // turned toward a target on its left
    c.dispose()
  })
})
