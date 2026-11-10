/**
 * Engine + K-Means lesson tests against a REAL trace captured from POST /api/v1/simulations/kmeans (fixtures/).
 * They check that what is drawn at any time t equals what the backend computed — independent of playback history.
 */
import { describe, expect, it } from 'vitest'
import sim from './fixtures/kmeans-sim.json'
import lesson from './fixtures/kmeans-lesson.json'
import { buildTimeline, fillTemplate, pickExamples } from '../src/lessons/kmeans-iris/timeline'
import { mathAt, stateAt } from '../src/lessons/kmeans-iris/state'
import type { KMeansTrace, LessonManifest } from '../src/lessons/kmeans-iris/types'
import { CinematicCameraController } from '../src/engine/CinematicCameraController'
import { NarrationSynchronizer } from '../src/engine/NarrationSynchronizer'
import { SceneTransitionManager, stepAt, stepBoundaries } from '../src/engine/SceneTransitionManager'
import { LessonTimelineController } from '../src/engine/LessonTimelineController'
import { distanceStages } from '../src/engine/FormulaAnimationController'

const trace = sim.trace as unknown as KMeansTrace
const manifest = lesson as unknown as LessonManifest
const tl = buildTimeline(trace, manifest)
const end = (kind: string, iteration?: number) => {
  const s = tl.steps.find((x) => x.kind === kind && (iteration === undefined || x.payload.iteration === iteration))!
  return s.start + s.duration
}
const close = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9)

describe('timeline structure', () => {
  it('has the seven scenes in order, contiguous, covering the whole duration', () => {
    expect(tl.scenes.map((s) => s.id)).toEqual(['enter', 'problem', 'init', 'distance', 'update', 'iterate', 'results'])
    tl.scenes.forEach((s, i) => { if (i) expect(s.start).toBeCloseTo(tl.scenes[i - 1].end) })
    expect(tl.scenes.at(-1)!.end).toBeCloseTo(tl.duration)
  })
  it('has one update step per recorded iteration, in order', () => {
    const ups = tl.steps.filter((s) => s.kind === 'update').map((s) => s.payload.iteration)
    expect(ups).toEqual(trace.iterations.map((i) => i.iteration))
    expect(tl.markers).toHaveLength(trace.iterations.length)
  })
  it('uses distinct worked examples that are not centroid seeds', () => {
    const ex = pickExamples(trace)
    expect(new Set(ex).size).toBe(ex.length)
    ex.forEach((i) => expect(Math.min(...trace.iterations[0].distances[i])).toBeGreaterThan(0))
  })
  it('fills narration placeholders from the trace, with a stop sentence matching the stop reason', () => {
    const s = fillTemplate('{k} {n} {stop_sentence}', trace)
    expect(s).toContain(`${trace.k} ${trace.n}`)
    expect(s).toContain(trace.stop_reason === 'max_iterations' ? 'iteration limit' : 'converged')
    expect(tl.cues.every((c) => !/\{\w+\}/.test(c.text))).toBe(true)
  })
})

describe('stateAt is a pure function of t (seeking cannot desynchronise)', () => {
  it('gives identical state regardless of the order times are visited', () => {
    const ts = [0, 3, 12, 40, tl.duration * 0.6, tl.duration - 1]
    const forward = ts.map((t) => stateAt(tl, trace, t))
    const backward = [...ts].reverse().map((t) => stateAt(tl, trace, t)).reverse()
    forward.forEach((f, i) => {
      expect(Array.from(f.positions)).toEqual(Array.from(backward[i].positions))
      expect(f.labels).toEqual(backward[i].labels)
      expect(f.centroids.map((c) => c.pos)).toEqual(backward[i].centroids.map((c) => c.pos))
    })
  })
  it('places every point at its data coordinate after the intro morph (float32 GPU buffer precision)', () => {
    const s = stateAt(tl, trace, end('morph') + 0.01)
    trace.points.forEach((p, i) => {
      const [x, y] = tl.coords.toScene(p)
      expect(s.positions[i * 3]).toBeCloseTo(x, 5)
      expect(s.positions[i * 3 + 1]).toBeCloseTo(y, 5)
    })
  })
  it('never shows cluster colours before the first assignment, and never uses species during the algorithm', () => {
    const init = stateAt(tl, trace, tl.scenes.find((s) => s.id === 'init')!.start + 1)
    expect(init.labels.every((l) => l === -1)).toBe(true)
    expect(init.colorMode).toBe('neutral')
    const mid = stateAt(tl, trace, tl.scenes.find((s) => s.id === 'iterate')!.start + 1)
    expect(mid.speciesMix).toBe(0)
  })
  it('shows exactly the trace labels after each assignment and the trace centroids after each update', () => {
    expect(stateAt(tl, trace, end('assign-all') + 0.01).labels).toEqual(trace.iterations[0].labels)
    for (const it of trace.iterations) {
      const s = stateAt(tl, trace, end('update', it.iteration) + 0.01)
      s.centroids.forEach((c) => expect(close(c.pos, tl.coords.toScene(it.centroids_after[c.index]))).toBe(true))
      if (it.iteration > 1) expect(stateAt(tl, trace, end('assign', it.iteration) + 0.01).labels).toEqual(it.labels)
    }
  })
  it('keeps centroids fixed during assignment and moves them only during update', () => {
    const a = tl.steps.find((s) => s.kind === 'assign')
    if (!a) return
    const s0 = stateAt(tl, trace, a.start + 0.01), s1 = stateAt(tl, trace, a.start + a.duration - 0.01)
    expect(s0.centroids.map((c) => c.pos)).toEqual(s1.centroids.map((c) => c.pos))
  })
  it('draws distance lines with the trace distances and highlights the trace label as nearest', () => {
    const ex = tl.steps.find((s) => s.kind === 'distance-example')!
    const i = ex.payload.point!
    const s = stateAt(tl, trace, ex.start + ex.duration * 0.95)
    expect(s.distanceLines.map((l) => l.value)).toEqual(trace.iterations[0].distances[i])
    expect(s.distanceLines.find((l) => l.nearest)!.centroid).toBe(trace.iterations[0].labels[i])
  })
  it('does not leave points enlarged after an iteration finishes', () => {
    const s = stateAt(tl, trace, end('converge') - 0.1)
    expect(Math.max(...Array.from(s.sizes))).toBeCloseTo(1, 6)
  })
  it('shows inertia only for completed iterations', () => {
    const it2 = tl.steps.find((s) => s.kind === 'assign' && s.payload.iteration === 2)
    if (!it2) return
    expect(stateAt(tl, trace, it2.start + 0.01).inertiaSeries).toHaveLength(1)
    expect(stateAt(tl, trace, tl.duration).inertiaSeries.map((x) => x.inertia)).toEqual(trace.iterations.map((x) => x.inertia))
  })
})

describe('math panel values match the trace', () => {
  it('distance rows: √(Σ (x−μ)²) equals the recorded distance, nearest equals the recorded label', () => {
    const ex = tl.steps.find((s) => s.kind === 'distance-example')!
    const m = mathAt(tl, trace, ex.start + ex.duration * 0.7)
    if (m.kind !== 'distance') throw new Error('expected distance info')
    m.rows.forEach((r) => expect(Math.sqrt(r.sum)).toBeCloseTo(r.d, 10))
    expect(m.nearest).toBe(trace.iterations[0].labels[m.point])
    expect(m.stage).toBe(distanceStages.stageAt(0.7))
  })
  it('update rows: sum / count equals the recorded new centroid', () => {
    const up = tl.steps.find((s) => s.kind === 'update')!
    const m = mathAt(tl, trace, up.start + 1)
    if (m.kind !== 'update') throw new Error('expected update info')
    m.clusters.filter((c) => c.count > 0).forEach((c) => expect(close(c.sum.map((v) => v / c.count), c.mean)).toBe(true))
  })
  it('K-Means++ init rows show the recorded probability of the chosen point', () => {
    const s = tl.steps.filter((x) => x.kind === 'init-centroid')[1]
    const m = mathAt(tl, trace, s.start + 0.5)
    if (m.kind !== 'init') throw new Error('expected init info')
    const pp = trace.initialization.plusplus_steps[1]
    expect(m.probability).toBe(pp.chosen_probability)
    expect(m.d2! / m.d2sum!).toBeCloseTo(pp.chosen_probability, 12)
  })
})

describe('engine components', () => {
  it('camera: exact poses at keys, eased between, cuts with reduced motion', () => {
    const k = [{ t: 0, position: [0, 0, 10] as [number, number, number], target: [0, 0, 0] as [number, number, number], fov: 40 },
      { t: 10, position: [10, 0, 10] as [number, number, number], target: [0, 0, 0] as [number, number, number], fov: 50 }]
    const c = new CinematicCameraController(k)
    expect(c.poseAt(0).position).toEqual([0, 0, 10])
    expect(c.poseAt(10).fov).toBe(50)
    expect(c.poseAt(5).position[0]).toBeCloseTo(5)
    const r = new CinematicCameraController(k, true)
    expect([0, 10]).toContain(r.poseAt(3).position[0])
  })
  it('narration reveals words monotonically and highlights keywords', () => {
    const n = new NarrationSynchronizer([{ start: 0, end: 4, text: 'each centroid moves to the mean', keywords: ['centroid', 'mean'] }])
    const a = n.cueAt(0.5)!, b = n.cueAt(3)!
    expect(a.words.filter((w) => w.spoken).length).toBeLessThan(b.words.filter((w) => w.spoken).length)
    expect(b.words.filter((w) => w.keyword).map((w) => w.text)).toEqual(['centroid', 'mean'])
    expect(n.cueAt(5)).toBeNull()
  })
  it('scenes and step lookup follow the timeline', () => {
    const sm = new SceneTransitionManager(tl.scenes)
    expect(sm.sceneAt(0).id).toBe('enter')
    expect(sm.sceneAt(tl.duration - 0.01).id).toBe('results')
    const ex = tl.steps.find((s) => s.kind === 'distance-example')!
    expect(stepAt(tl.steps, ex.start + 0.1)!.id).toBe(ex.id)
  })
  it('timeline controller: seek, next/prev step boundaries, rate and clamping', () => {
    const c = new LessonTimelineController(tl.duration)
    c.setDuration(tl.duration, stepBoundaries(tl.steps, tl.duration))
    const seen: number[] = []
    c.subscribe((s) => seen.push(s.t))
    c.seek(-5)
    expect(c.t).toBe(0)
    c.next()
    expect(c.t).toBeCloseTo(tl.steps[1].start)
    c.next()
    c.prev()
    expect(c.t).toBeCloseTo(tl.steps[1].start)
    c.seek(tl.duration + 50)
    expect(c.t).toBe(tl.duration)
    c.setRate(10)
    expect(c.rate).toBe(4)
    expect(c.playing).toBe(false)
    c.dispose()
  })
})
