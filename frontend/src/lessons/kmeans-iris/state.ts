/**
 * Visual state of the K-Means lesson as a PURE function of timeline position t.
 * Every coordinate, label, distance and mean is read from the backend trace; this file only decides how much of
 * each recorded event is visible at time t (interpolation for motion, never for values).
 */
import { CLUSTER_HEX, SPECIES_HEX } from '../../presentation/theme'
import { clamp, easeInOutCubic, easeOutCubic, lerp3, progress, seeded, smoothstep } from '../../engine/easing'
import { distanceStages } from '../../engine/FormulaAnimationController'
import type { Vec3 } from '../../engine/types'
import type { KStep, KTimeline } from './timeline'
import type { KMeansTrace } from './types'

// one Iris vocabulary with the presentation (theme.ts): species keep their colours; clusters use hues no species uses
export const CLUSTER_COLORS = CLUSTER_HEX
export const SPECIES_COLORS: Record<string, string> = SPECIES_HEX
export const NEUTRAL = '#94a3b8'

export type RGB = [number, number, number]
export const hexToRgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]
const mixRgb = (a: RGB, b: RGB, p: number): RGB => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]
const NEUTRAL_RGB = hexToRgb(NEUTRAL)
const CLUSTER_RGB = CLUSTER_COLORS.map(hexToRgb)

export interface DistanceLine { from: Vec3; to: Vec3; centroid: number; grow: number; opacity: number; nearest: boolean; value: number; showValue: boolean }

export interface VisualState {
  t: number
  step: KStep | null
  stepProgress: number
  positions: Float32Array   // n*3
  colors: Float32Array      // n*3
  sizes: Float32Array       // n
  petalScale: Float32Array  // n (flowers in the intro)
  flowerPositions: Vec3[]
  axesOpacity: number
  centroids: { index: number; pos: Vec3; scale: number; color: string }[]
  trails: Vec3[][]
  distanceLines: DistanceLine[]
  spokes: { opacity: number; labels: number[] | null }
  focus: number | null
  /** labels shown right now (-1 = unassigned) */
  labels: number[]
  colorMode: 'species' | 'neutral' | 'cluster'
  speciesMix: number
  completedIterations: number
  inertiaSeries: { iteration: number; inertia: number }[]
  dust: number
}

/** Decorative garden layout (seeded, deterministic). It is NOT data: it is where the flowers stand before they become points. */
export function gardenLayout(n: number): Vec3[] {
  const r = seeded(20261111)
  return Array.from({ length: n }, () => [(r() - 0.5) * 20, -4.4 + r() * 0.5, -9 + r() * 12] as Vec3)
}

function stepProgressOf(step: KStep, t: number) {
  return progress(t, step.start, step.duration)
}

export function stateAt(tl: KTimeline, trace: KMeansTrace, t: number, garden: Vec3[] = gardenLayout(trace.n)): VisualState {
  const n = trace.n, k = trace.k
  const data = trace.points.map((p) => tl.coords.toScene(p))
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n).fill(1)
  const petalScale = new Float32Array(n)
  const labels = new Array<number>(n).fill(-1)
  const species = trace.comparison_labels

  let current: KStep | null = null
  for (const s of tl.steps) if (t >= s.start) current = s
  const cp = current ? stepProgressOf(current, t) : 0
  const reached = (kind: KStep['kind']) => tl.steps.some((s) => s.kind === kind && t >= s.start)
  const doneStep = (s: KStep) => t >= s.start + s.duration

  // ---------------- intro: flowers → points
  const morph = tl.steps.find((s) => s.kind === 'morph')!
  const morphP = progress(t, morph.start, morph.duration)
  for (let i = 0; i < n; i++) {
    const order = (data[i][0] - tl.coords.bounds.x0) / (tl.coords.bounds.x1 - tl.coords.bounds.x0 || 1)
    const local = clamp((morphP - order * 0.5) / 0.5)
    const e = easeInOutCubic(local)
    const flowerHead: Vec3 = [garden[i][0], garden[i][1] + 0.9, garden[i][2]]
    const p = lerp3(flowerHead, data[i], e)
    p[2] += Math.sin(Math.PI * e) * 1.2           // gentle arc out of the garden
    positions.set(p, i * 3)
    petalScale[i] = 1 - smoothstep(0, 0.35, local)
    sizes[i] = 0.6 + 0.4 * smoothstep(0.1, 0.5, local)
  }
  const axesOpacity = smoothstep(morph.start + morph.duration * 0.5, morph.start + morph.duration, t)

  // ---------------- colour mode
  const hide = tl.steps.find((s) => s.kind === 'hide-species')!
  const neutralMix = smoothstep(hide.start, hide.start + 2.2, t)  // species → neutral
  const revealSp = tl.steps.find((s) => s.kind === 'reveal-species')!
  const explore = tl.steps.find((s) => s.kind === 'explore')!
  const speciesMix = smoothstep(revealSp.start + 0.5, revealSp.start + 2.5, t) * (1 - smoothstep(explore.start, explore.start + 1.5, t))

  // ---------------- labels over time (from the trace only)
  const iters = trace.iterations
  const exampleSteps = tl.steps.filter((s) => s.kind === 'distance-example')
  const assignAll = tl.steps.find((s) => s.kind === 'assign-all')!
  const lab1 = iters[0]?.labels ?? []
  if (t >= assignAll.start) {
    const p = progress(t, assignAll.start, assignAll.duration * 0.8)
    for (let i = 0; i < n; i++) {
      const order = (data[i][0] - tl.coords.bounds.x0) / (tl.coords.bounds.x1 - tl.coords.bounds.x0 || 1)
      if (p >= order || tl.examples.includes(i)) labels[i] = lab1[i]
    }
  } else {
    for (const s of exampleSteps) if (t >= s.start + s.duration * 0.9) labels[s.payload.point!] = lab1[s.payload.point!]
  }
  let completedIterations = t >= assignAll.start + assignAll.duration ? 1 : 0
  for (const s of tl.steps) {
    if (s.kind !== 'assign' || t < s.start) continue
    const it = iters[s.payload.iteration! - 1]
    const prev = iters[s.payload.iteration! - 2]
    const p = progress(t, s.start, s.duration * 0.75)
    for (let i = 0; i < n; i++) {
      const changed = prev && prev.labels[i] !== it.labels[i]
      const order = (i / n) * 0.75                  // every switch (and its pulse) finishes before p = 1
      if (!changed || p >= order) labels[i] = it.labels[i]
      if (changed) sizes[i] *= 1 + 0.6 * Math.sin(Math.PI * clamp((p - order) * 4))   // brief pulse on change
    }
    if (doneStep(s)) completedIterations = s.payload.iteration!
  }

  // ---------------- centroids (positions from trace; motion interpolated)
  const centroidsAt: Vec3[] = trace.initialization.centroids.map((c) => tl.coords.toScene(c))
  const trails: Vec3[][] = centroidsAt.map((c) => [c])
  for (const s of tl.steps) {
    if (s.kind !== 'update' || t < s.start) continue
    const it = iters[s.payload.iteration! - 1]
    const move = easeInOutCubic(progress(t, s.start + s.duration * 0.35, s.duration * 0.55))
    for (let j = 0; j < k; j++) {
      const a = tl.coords.toScene(it.centroids_before[j]), b = tl.coords.toScene(it.centroids_after[j])
      centroidsAt[j] = lerp3(a, b, move)
      trails[j].push(centroidsAt[j])
    }
  }
  const initSteps = tl.steps.filter((s) => s.kind === 'init-centroid')
  const centroids = centroidsAt.map((pos, j) => {
    const s = initSteps[j]
    const scale = s ? easeOutCubic(progress(t, s.start, s.duration * 0.4)) : 1
    return { index: j, pos, scale, color: CLUSTER_COLORS[j % CLUSTER_COLORS.length] }
  })

  // ---------------- distance lines for the worked examples
  let distanceLines: DistanceLine[] = []
  let focus: number | null = null
  if (current?.kind === 'distance-example') {
    const i = current.payload.point!
    focus = i
    const d = iters[0].distances[i]
    const nearest = iters[0].labels[i]
    const stage = distanceStages.stageAt(cp)
    const grow = smoothstep(0.1, 0.2, cp)
    const compare = stage === 'compare' || stage === 'assign'
    distanceLines = d.map((value, j) => ({
      from: data[i], to: centroids[j].pos, centroid: j, grow, value,
      nearest: j === nearest,
      opacity: compare ? (j === nearest ? 1 : 0.18) : 0.75,
      showValue: distanceStages.reached('sqrt', cp),
    }))
    sizes[i] *= 1.9
  } else if (current?.kind === 'init-centroid' && trace.initialization.chosen_indices.length) {
    focus = trace.initialization.chosen_indices[current.payload.centroid!] ?? null
  }

  // spokes: during update, link each point to its centroid ("these points are averaged")
  let spokes: VisualState['spokes'] = { opacity: 0, labels: null }
  if (current?.kind === 'update') {
    const it = iters[current.payload.iteration! - 1]
    spokes = { opacity: 0.35 * Math.sin(Math.PI * clamp(cp / 0.95)), labels: it.labels }
  }

  // ---------------- colours
  for (let i = 0; i < n; i++) {
    const sp = hexToRgb(SPECIES_COLORS[species[i]] ?? NEUTRAL)
    let c: RGB = mixRgb(sp, NEUTRAL_RGB, neutralMix)
    if (labels[i] >= 0) c = CLUSTER_RGB[labels[i] % CLUSTER_RGB.length]
    if (speciesMix > 0) c = mixRgb(c, sp, speciesMix)
    colors.set(c, i * 3)
  }

  const inertiaSeries = iters.slice(0, completedIterations).map((it) => ({ iteration: it.iteration, inertia: it.inertia }))
  const colorMode = speciesMix > 0.5 ? 'species' : reached('assign-all') || labels.some((l) => l >= 0) ? 'cluster' : neutralMix > 0.5 ? 'neutral' : 'species'

  return {
    t, step: current, stepProgress: cp, positions, colors, sizes, petalScale, flowerPositions: garden, axesOpacity,
    centroids: t >= (initSteps[0]?.start ?? Infinity) ? centroids.filter((_, j) => t >= initSteps[j].start) : [],
    trails: t >= (initSteps[0]?.start ?? Infinity) ? trails : [],
    distanceLines, spokes, focus, labels, colorMode, speciesMix, completedIterations, inertiaSeries,
    dust: 1 - 0.6 * axesOpacity,
  }
}

// ======================================================================= math panel
export type MathInfo =
  | { kind: 'intro'; n: number; features: string[] }
  | { kind: 'problem'; n: number }
  | { kind: 'choose-k'; k: number; method: string; seed: number }
  | { kind: 'init'; method: string; centroid: number; point: number | null; coords: number[]; probability: number | null; d2: number | null; d2sum: number | null; draw: number | null }
  | { kind: 'distance'; point: number; x: number[]; stage: string | null; rows: { centroid: number; mu: number[]; diff: number[]; sq: number[]; sum: number; d: number }[]; nearest: number }
  | { kind: 'assign'; iteration: number; changed: number; inertia: number; counts: number[] }
  | { kind: 'update'; iteration: number; clusters: { centroid: number; count: number; sum: number[]; mean: number[]; before: number[]; movement: number }[]; reseeded: { cluster: number; point_index: number }[]; inertiaAfter: number; shiftSq: number }
  | { kind: 'converge'; stop: string; iterations: number; inertia: number; converged: boolean; lastShiftSq: number; lastChanged: number }
  | { kind: 'results'; k: number; inertia: number; crosstab: Record<string, Record<string, number>> | null; classes: string[] }

export function mathAt(tl: KTimeline, trace: KMeansTrace, t: number): MathInfo {
  let s: KStep | null = null
  for (const x of tl.steps) if (t >= x.start) s = x
  const p = s ? progress(t, s.start, s.duration) : 0
  const iters = trace.iterations
  if (!s || s.sceneId === 'enter') return { kind: 'intro', n: trace.n, features: trace.features }
  switch (s.kind) {
    case 'hide-species':
      return { kind: 'problem', n: trace.n }
    case 'hold':
      return { kind: 'choose-k', k: trace.k, method: trace.initialization.method, seed: trace.initialization.seed }
    case 'init-centroid': {
      const j = s.payload.centroid!
      const ini = trace.initialization
      const pp = ini.plusplus_steps[j]
      const idx = ini.chosen_indices[j] ?? null
      return { kind: 'init', method: ini.method, centroid: j, point: idx, coords: ini.centroids[j],
        probability: pp ? pp.chosen_probability : null, d2: pp?.d2 ? pp.d2[pp.chosen_index] : null,
        d2sum: pp?.d2 ? pp.d2.reduce((a, b) => a + b, 0) : null, draw: pp?.random_draw ?? null }
    }
    case 'distance-example': {
      const i = s.payload.point!
      const x = trace.points[i]
      const C = iters[0].centroids_before
      return { kind: 'distance', point: i, x, stage: distanceStages.stageAt(p), nearest: iters[0].labels[i],
        rows: C.map((mu, j) => {
          const diff = x.map((v, f) => v - mu[f])
          const sq = diff.map((v) => v * v)
          return { centroid: j, mu, diff, sq, sum: sq.reduce((a, b) => a + b, 0), d: iters[0].distances[i][j] }
        }) }
    }
    case 'assign-all':
    case 'assign': {
      const it = iters[s.payload.iteration! - 1]
      return { kind: 'assign', iteration: it.iteration, changed: it.changed, inertia: it.inertia, counts: it.counts }
    }
    case 'update': {
      const it = iters[s.payload.iteration! - 1]
      return { kind: 'update', iteration: it.iteration, reseeded: it.reseeded, inertiaAfter: it.inertia_after_update, shiftSq: it.total_shift_sq,
        clusters: it.centroids_after.map((mean, j) => ({ centroid: j, count: it.counts[j], sum: it.sums[j], mean, before: it.centroids_before[j], movement: it.movement[j] })) }
    }
    case 'converge': {
      const last = iters[iters.length - 1]
      return { kind: 'converge', stop: trace.stop_reason, iterations: iters.length, inertia: trace.final_inertia, converged: trace.converged,
        lastShiftSq: last.total_shift_sq, lastChanged: last.changed }
    }
    default:
      return { kind: 'results', k: trace.k, inertia: trace.final_inertia, crosstab: trace.summary?.crosstab_species_by_cluster ?? null, classes: trace.classes }
  }
}
