/**
 * Builds the K-Means lesson timeline from a real trace: steps, scenes, narration cues, camera keys, markers.
 * No algorithm values are computed here — only WHEN each recorded event is shown.
 */
import type { CameraKey, LessonTimeline, NarrationCue, SceneSpan, TimelineStep, Vec3 } from '../../engine/types'
import { makeCoordMap, type CoordMap } from './coords'
import type { KMeansTrace, LessonManifest } from './types'

export type KStepKind =
  | 'garden' | 'morph' | 'hold' | 'hide-species' | 'init-centroid' | 'distance-example' | 'assign-all'
  | 'update' | 'assign' | 'converge' | 'reveal-clusters' | 'reveal-species' | 'explore'

export interface KPayload {
  iteration?: number
  centroid?: number
  point?: number
}

export type KStep = TimelineStep<KStepKind, KPayload>

export interface KTimeline extends LessonTimeline<KStep> {
  coords: CoordMap
  examples: number[]
}

const D = {
  garden: 5, morph: 8, hold: 5, hide: 9, initIntro: 5, initEach: 2.4, example: 8, assignAll: 4, update: 6,
  assignLater: 1.8, updateLater: 2.2, converge: 6, revealClusters: 6, revealSpecies: 8, explore: 4,
}

/** Three teaching examples from iteration 1: clear-cut, typical and borderline (deterministic). */
export function pickExamples(trace: KMeansTrace): number[] {
  const dist = trace.iterations[0]?.distances ?? []
  if (!dist.length) return []
  // skip points that coincide with a centroid (e.g. the seeds): a distance of 0 teaches nothing
  const candidates = dist.map((row, i) => ({ i, row })).filter(({ row }) => Math.min(...row) > 1e-9)
  const pool = candidates.length ? candidates : dist.map((row, i) => ({ i, row }))
  if (trace.k === 1) return [pool[0].i]
  const margins = pool.map(({ i, row }) => {
    const s = [...row].sort((a, b) => a - b)
    return { i, m: s[1] - s[0] }
  })
  const sorted = [...margins].sort((a, b) => a.m - b.m || a.i - b.i)
  const borderline = sorted[0].i
  const clear = sorted[sorted.length - 1].i
  const typical = sorted[Math.floor(sorted.length / 2)].i
  return [...new Set([clear, typical, borderline])]
}

export function fillTemplate(text: string, trace: KMeansTrace): string {
  const iters = trace.iterations.length
  const init = trace.initialization.method === 'k-means++'
    ? 'With K-Means++, the first centroid is a random flower; each next one is chosen with probability proportional to its squared distance from the centroids already placed.'
    : 'With random initialization, K flowers chosen at random become the starting centroids.'
  const stop = trace.stop_reason === 'converged_labels'
    ? `After ${iters} iterations no flower changes cluster any more — the algorithm has converged.`
    : trace.stop_reason === 'converged_tol'
      ? `After ${iters} iterations the centroids move less than the tolerance — the algorithm has converged.`
      : `The iteration limit of ${trace.max_iter} was reached before convergence.`
  return text.replace(/\{k\}/g, String(trace.k)).replace(/\{n\}/g, String(trace.n))
    .replace(/\{inertia\}/g, trace.final_inertia.toFixed(2)).replace(/\{init_sentence\}/g, init).replace(/\{stop_sentence\}/g, stop)
}

const KEYWORDS = ['observation', 'features', 'point', 'coordinates', 'unsupervised', 'centroid', 'centroids', 'K', 'nearest',
  'distance', 'mean', 'inertia', 'converged', 'species', 'clusters', 'cluster', 'square', 'K-Means++']

export function buildTimeline(trace: KMeansTrace, manifest: LessonManifest, opts: { skipIntro?: boolean } = {}): KTimeline {
  const coords = makeCoordMap(trace.points)
  const steps: KStep[] = []
  const scenes: SceneSpan[] = []
  const cues: NarrationCue[] = []
  const cameraKeys: CameraKey[] = []
  let t = 0
  const add = (kind: KStepKind, sceneId: string, duration: number, label: string, payload: KPayload = {}) => {
    steps.push({ id: `${kind}-${steps.length}`, kind, sceneId, start: t, duration, label, payload })
    t += duration
  }
  const scene = (id: string, body: () => void) => {
    const start = t
    body()
    const m = manifest.scenes.find((s) => s.id === id)
    scenes.push({ id, title: m?.title ?? id, start, end: t })
    // spread the scene's narration lines evenly over its duration
    const lines = m?.narration ?? []
    const span = (t - start) / Math.max(1, lines.length)
    lines.forEach((line, i) => cues.push({ start: start + i * span, end: start + (i + 1) * span - 0.15, text: fillTemplate(line, trace), keywords: KEYWORDS }))
  }
  const cam = (tt: number, position: Vec3, target: Vec3, fov = 45) => cameraKeys.push({ t: tt, position, target, fov })

  // 1 — enter the dataset
  scene('enter', () => {
    cam(t, [0, -2.6, 15], [0, -4.2, -3], 50)
    add('garden', 'enter', opts.skipIntro ? 0.5 : D.garden, 'A garden of 150 Iris flowers')
    cam(t, [2.5, -1.2, 14], [0, -2.5, -1], 48)
    add('morph', 'enter', opts.skipIntro ? 0.5 : D.morph, 'Measurements become coordinates')
    cam(t, [0, 0, 15.5], [0, 0, 0], 45)
    add('hold', 'enter', opts.skipIntro ? 0.5 : D.hold, 'Each flower is now a point')
  })
  // 2 — the problem
  scene('problem', () => {
    add('hide-species', 'problem', D.hide, 'Hide the species: no answers')
    cam(t, [-1.5, 0.6, 15], [0, 0, 0], 45)
  })
  // 3 — initialize centroids
  scene('init', () => {
    add('hold', 'init', D.initIntro, `Choose K = ${trace.k}`)
    for (let j = 0; j < trace.k; j++) add('init-centroid', 'init', D.initEach, `Place centroid μ${j + 1}`, { centroid: j })
    cam(t, [3, 1.5, 14.5], [0, 0, 0], 45)
  })
  // 4 — distance calculation (iteration 1)
  const examples = pickExamples(trace)
  scene('distance', () => {
    for (const i of examples) {
      const p = coords.toScene(trace.points[i])
      cam(t + 0.8, [p[0] + 1.6, p[1] + 0.8, 7.5], [p[0], p[1], 0], 42)
      add('distance-example', 'distance', D.example, `Distances from flower #${i + 1}`, { point: i, iteration: 1 })
      cam(t - 0.6, [p[0] + 1.2, p[1] + 0.6, 8.5], [p[0], p[1], 0], 42)
    }
    cam(t + 1.2, [0, 0, 15.5], [0, 0, 0], 45)
    add('assign-all', 'distance', D.assignAll, 'Assign every flower to its nearest centroid', { iteration: 1 })
  })
  // 5 — update centroids (iteration 1)
  scene('update', () => {
    cam(t, [-2.5, 1.4, 14], [0, 0, 0], 45)
    add('update', 'update', D.update, 'Move each centroid to the mean of its points', { iteration: 1 })
  })
  // 6 — iterate to convergence
  scene('iterate', () => {
    cam(t, [0, 0.4, 15.5], [0, 0, 0], 45)
    for (const it of trace.iterations.slice(1)) {
      add('assign', 'iterate', D.assignLater, `Iteration ${it.iteration}: assign`, { iteration: it.iteration })
      add('update', 'iterate', D.updateLater, `Iteration ${it.iteration}: update`, { iteration: it.iteration })
    }
    add('converge', 'iterate', D.converge, trace.converged ? 'Converged' : 'Iteration limit reached')
    cam(t, [1.5, 0.3, 15], [0, 0, 0], 45)
  })
  // 7 — results and comparison
  scene('results', () => {
    add('reveal-clusters', 'results', D.revealClusters, `The ${trace.k} clusters`)
    add('reveal-species', 'results', D.revealSpecies, 'Reveal the real species')
    add('explore', 'results', D.explore, 'Your turn: explore')
    cam(t, [0, 0, 15.5], [0, 0, 0], 45)
  })

  const markers = steps.filter((s) => s.kind === 'update').map((s) => ({ t: s.start, label: `it ${s.payload.iteration}` }))
  return { steps, scenes, cues, cameraKeys, markers, duration: t, coords, examples }
}
