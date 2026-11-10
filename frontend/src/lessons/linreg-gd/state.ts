/**
 * Pure visual state of the regression / gradient-descent lessons: stateAt(timeline, traces, t) → what to draw.
 * Data → scene coordinates are fixed per part (makeCoords). Between two recorded frames the picture is eased so the
 * motion is smooth; every number displayed comes from the nearest recorded frame (`frame`), never from the tween.
 */
import { stepAt } from '../../engine/SceneTransitionManager'
import { clamp, easeInOutCubic, progress } from '../../engine/easing'
import type { Vec3 } from '../../engine/types'
import type { GdStepKind, GdTimeline } from './timeline'
import type { LessonPart, LinRegFrame, LinRegTrace } from './types'

export interface Range { lo: number; hi: number }
export interface Coords {
  kind: 'plane' | 'line'
  x1: Range; x2: Range | null; y: Range
  /** data → scene */
  point(x1: number, x2: number | null, y: number): Vec3
  /** scene extents of the data box */
  box: { x: [number, number]; y: [number, number]; z: [number, number] }
  /** line mode: θ (standardized) → bowl position */
  bowl?: { t0: Range; t1: Range; jMin: number; jMax: number; at(theta0: number, theta1: number, cost: number): Vec3; x: [number, number]; z: [number, number]; y: [number, number] }
}

const range = (vs: number[], withZero = false): Range => {
  const min = Math.min(...vs, ...(withZero ? [0] : [])), max = Math.max(...vs, ...(withZero ? [0] : []))
  const pad = (max - min) * 0.05 || 1
  // non-negative data (budgets, counts, ratings) never get a negative axis end
  return { lo: min >= 0 ? Math.max(0, min - pad) : min - pad, hi: max + pad }
}
const map = (v: number, r: Range, a: number, b: number) => a + ((v - r.lo) / (r.hi - r.lo)) * (b - a)

export function makeCoords(part: LessonPart, tr: LinRegTrace): Coords {
  const x1 = range(tr.points.x[0])
  const x2 = tr.points.x[1] ? range(tr.points.x[1]) : null
  const y = range(tr.points.y, true) // includes 0: gradient descent starts by predicting 0
  if (part.kind === 'plane') {
    const box = { x: [-4.5, 4.5] as [number, number], y: [-2.4, 2.6] as [number, number], z: [-3, 3] as [number, number] }
    return {
      kind: 'plane', x1, x2, y, box,
      point: (a, b, c) => [map(a, x1, ...box.x), map(c, y, ...box.y), map(b ?? 0, x2 ?? { lo: 0, hi: 1 }, box.z[1], box.z[0])],
    }
  }
  const box = { x: [-8.2, -1.6] as [number, number], y: [-2.4, 2.4] as [number, number], z: [0, 0] as [number, number] }
  const c: Coords = { kind: 'line', x1, x2: null, y, box, point: (a, _b, cc) => [map(a, x1, ...box.x), map(cc, y, ...box.y), 0] }
  if (tr.surface) {
    const s = tr.surface
    const flat = s.cost.flat()
    const jMin = Math.min(...flat), jMax = Math.max(...flat)
    const t0 = { lo: s.theta0[0], hi: s.theta0[s.theta0.length - 1] }
    const t1 = { lo: s.theta1[0], hi: s.theta1[s.theta1.length - 1] }
    const bx: [number, number] = [1.6, 8.4], bz: [number, number] = [-3.1, 3.1], by: [number, number] = [-2.5, 2.3]
    c.bowl = {
      t0, t1, jMin, jMax, x: bx, z: bz, y: by,
      // height: the cost above its minimum, mildly compressed (power 0.6) so the floor and the end of the descent stay visible
      // θ outside the sampled grid (a diverging run) is clamped to just beyond the bowl's rim
      at: (a, b, j) => [clamp(map(a, t0, ...bx), bx[0] - 1, bx[1] + 1), by[0] + (by[1] - by[0]) * Math.pow(clamp((j - jMin) / (jMax - jMin || 1), 0, 1.6), 0.6), clamp(map(b, t1, bz[1], bz[0]), bz[0] - 1, bz[1] + 1)],
    }
  }
  return c
}

export interface GdState {
  part: number
  kind: GdStepKind
  p: number
  /** 0 = lying on the floor, 1 = at their data positions */
  rise: number
  /** recorded frame shown in numbers, and the eased position between frames used for drawing */
  frame: LinRegFrame
  frameIndex: number
  drawIntercept: number
  drawSlopes: number[]
  drawTheta: number[]
  fitOpacity: number
  residualOpacity: number
  bowlOpacity: number
  olsOpacity: number
  modelsOpacity: number
  /** 0..1 share of the recorded path drawn as the ball's trail */
  trail: number
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const AFTER: Record<'plane' | 'line', GdStepKind[]> = {
  plane: ['rise', 'guess', 'descend', 'converged', 'read', 'models'],
  line: ['rise', 'guess', 'residuals', 'bowl', 'descend', 'converged', 'read', 'models'],
}

export function stateAt(tl: GdTimeline, parts: LessonPart[], traces: LinRegTrace[], t: number): GdState {
  const step = stepAt(tl.steps, t) ?? tl.steps[0]
  const part = Math.min(step.payload.part, traces.length - 1)
  const tr = traces[part]
  const kind = step.kind
  const p = progress(t, step.start, step.duration)
  const frames = tr.frames
  const order = AFTER[parts[part].kind]
  const at = (k: GdStepKind) => order.indexOf(k)
  const pos = kind === 'title' ? -1 : kind === 'outro' ? 99 : at(kind)
  const before = (k: GdStepKind) => pos < at(k)

  // which (possibly fractional) frame: 0 before the descent, the last after it, eased through it
  let f = 0
  if (kind === 'descend') f = easeInOutCubic(clamp(p / 0.92)) * (frames.length - 1)
  else if (!before('descend') || kind === 'outro') f = frames.length - 1
  const i0 = Math.floor(f), i1 = Math.min(frames.length - 1, i0 + 1), k = f - i0
  const A = frames[i0], B = frames[i1]
  const fin = (v: number) => (Number.isFinite(v) ? v : 0)

  const rise = kind === 'title' ? 0 : kind === 'rise' ? easeInOutCubic(clamp(p / 0.8)) : 1
  const fitOpacity = kind === 'title' || kind === 'rise' ? 0 : kind === 'guess' ? clamp(p * 2.5) : kind === 'models' || kind === 'outro' ? 0.55 : 1
  // residuals are drawn only when the drawn line/plane is the full model (no predictor held at its mean)
  const RES: GdStepKind[] = parts[part].kind === 'line' ? ['residuals', 'bowl', 'descend', 'converged'] : ['guess', 'descend', 'converged']
  const residualOpacity = !tr.exact_display || !RES.includes(kind) ? 0
    : kind === RES[0] ? clamp((p - 0.3) * 3) : kind === 'converged' ? 1 - clamp(p * 1.5) * 0.6 : 0.85
  const bowlOpacity = parts[part].kind !== 'line' || !tr.surface ? 0 : kind === 'bowl' ? clamp(p * 1.8) : before('bowl') ? 0 : kind === 'outro' || kind === 'models' ? 0.4 : 1
  const olsOpacity = kind === 'converged' ? clamp(p * 2) : kind === 'read' ? 1 : 0
  const modelsOpacity = kind === 'models' ? clamp(p * 2) : 0
  const trail = kind === 'descend' ? f / Math.max(1, frames.length - 1) : before('descend') ? 0 : 1

  return {
    part, kind, p, rise, frame: frames[Math.round(f)], frameIndex: Math.round(f),
    drawIntercept: lerp(fin(A.display.intercept), fin(B.display.intercept), k),
    drawSlopes: A.display.slopes.map((s, j) => lerp(fin(s), fin(B.display.slopes[j]), k)),
    drawTheta: A.theta_std.map((s, j) => lerp(fin(s), fin(B.theta_std[j]), k)),
    fitOpacity, residualOpacity, bowlOpacity, olsOpacity, modelsOpacity, trail,
  }
}

/** the fitted value the drawn line/plane gives for a point (display coefficients; other predictors at their means) */
export const fittedAt = (intercept: number, slopes: number[], x1: number, x2: number | null) => intercept + slopes[0] * x1 + (slopes[1] ?? 0) * (x2 ?? 0)
