/**
 * The learning journey as pure functions: every flower's pose = f(stage, p). Nothing is accumulated, so any stage
 * can be entered, replayed, scrubbed or reversed and always shows the same picture.
 * Stages: 0 overview · 1 collect · 2 prepare · 3 features · 4 split · 5 train · 6 predict · 7 evaluate
 */
import { SPECIES_TOKEN } from '../../theme'
import type { JRecord, LearningJourney } from '../../api'

export const STAGES = ['Overview', 'Collect', 'Prepare', 'Features', 'Split', 'Train', 'Predict', 'Evaluate'] as const
export const SCENE = { w: 1200, h: 660 }
export const PLOT = { x0: 110, x1: 760, y0: 590, y1: 90 }
export const GRID = { x0: 120, y0: 120, cols: 15, dx: 44, dy: 48 }
export const VAULT = { x0: 880, y0: 170, cols: 9, dx: 30, dy: 34, w: 290, h: 220 }
export const CM = { x0: 860, y0: 150, cell: 100 }
export const SPECIES_COLOR: Record<string, string> = Object.fromEntries(Object.entries(SPECIES_TOKEN).map(([k, t]) => [k, `rgb(var(--c-${t}))`]))

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
/** staggered local progress for item k of n inside the window [a, b] of the stage */
export const stagger = (p: number, k: number, n: number, a = 0.05, b = 0.9, travel = 0.25) => {
  const start = a + ((b - a - travel) * k) / Math.max(1, n - 1)
  return clamp((p - start) / travel)
}

export interface Ctx {
  j: LearningJourney
  index: Map<number, number>
  test: Set<number>
  vault: Map<number, number>
  removed: Set<number>
  dupPair: Set<number>
  pred: Map<number, { predicted: string; correct: boolean }>
  cmSlot: Map<number, { row: number; col: number; k: number }>
  scale: { x: (v: number) => number; y: (v: number) => number }
}

export function buildCtx(j: LearningJourney): Ctx {
  const [fx, fy] = j.features
  const bx = j.model.bounds[fx], by = j.model.bounds[fy]
  const scale = {
    x: (v: number) => PLOT.x0 + ((v - bx[0]) / (bx[1] - bx[0])) * (PLOT.x1 - PLOT.x0),
    y: (v: number) => PLOT.y0 - ((v - by[0]) / (by[1] - by[0] + 0.25)) * (PLOT.y0 - PLOT.y1),
  }
  const index = new Map(j.records.map((r, i) => [r.id, i]))
  const test = new Set(j.split.test_ids)
  const vault = new Map(j.split.test_ids.map((id, k) => [id, k]))
  const removed = new Set(j.prepare.duplicates.map((d) => d.removed))
  const dupPair = new Set(j.prepare.duplicates.flatMap((d) => [d.removed, d.same_as]))
  const pred = new Map(j.predictions.map((p) => [p.id, { predicted: p.predicted, correct: p.correct }]))
  const counter = new Map<string, number>()
  const cmSlot = new Map<number, { row: number; col: number; k: number }>()
  for (const p of j.predictions) {
    const row = j.classes.indexOf(p.truth), col = j.classes.indexOf(p.predicted)
    const key = `${row}-${col}`
    const k = counter.get(key) ?? 0
    counter.set(key, k + 1)
    cmSlot.set(p.id, { row, col, k })
  }
  return { j, index, test, vault, removed, dupPair, pred, cmSlot, scale }
}

export interface Pose { x: number; y: number; r: number; fill: string; stroke: string; opacity: number; mark?: 'ok' | 'bad' | 'dup' | null }

const gridPos = (i: number) => ({ x: GRID.x0 + (i % GRID.cols) * GRID.dx, y: GRID.y0 + Math.floor(i / GRID.cols) * GRID.dy })
const vaultPos = (k: number) => ({ x: VAULT.x0 + 18 + (k % VAULT.cols) * VAULT.dx, y: VAULT.y0 + 30 + Math.floor(k / VAULT.cols) * VAULT.dy })
const cmPos = (s: { row: number; col: number; k: number }) => ({
  x: CM.x0 + s.col * CM.cell + 14 + (s.k % 6) * 14,
  y: CM.y0 + s.row * CM.cell + 18 + Math.floor(s.k / 6) * 14,
})

/** Pose of one record at a stage and stage progress p (0..1). */
export function poseAt(c: Ctx, r: JRecord, stage: number, p: number): Pose {
  const i = c.index.get(r.id)!
  const g = gridPos(i)
  const sc = { x: c.scale.x((r as unknown as Record<string, number>)[c.j.features[0]]), y: c.scale.y((r as unknown as Record<string, number>)[c.j.features[1]]) }
  const col = SPECIES_COLOR[r.species] ?? 'rgb(var(--c-dim))'
  const neutral = 'rgb(var(--c-dim))'
  const isTest = c.test.has(r.id)
  const removed = c.removed.has(r.id)
  const base: Pose = { x: g.x, y: g.y, r: 7, fill: neutral, stroke: 'none', opacity: 1, mark: null }

  if (stage <= 0) return { ...base, opacity: 0 }
  if (stage === 1) {
    const l = ease(stagger(p, i, c.j.records.length, 0.02, 0.92, 0.18))
    return { ...base, x: mix(-30, g.x, l), y: mix(g.y + 20, g.y, l), opacity: l }
  }
  if (stage === 2) {
    const dup = c.dupPair.has(r.id)
    const hl = dup && p > 0.4
    const gone = removed ? clamp((p - 0.66) / 0.14) : 0
    return { ...base, r: hl ? 9 : 7, stroke: hl ? 'rgb(var(--c-human))' : 'none', fill: hl ? 'rgb(var(--c-human))' : neutral, opacity: 1 - gone, mark: hl && gone < 1 ? 'dup' : null }
  }
  if (removed) return { ...base, opacity: 0 }
  if (stage === 3) {
    const l = ease(stagger(p, i, c.j.records.length, 0.05, 0.75, 0.3))
    const cl = clamp((p - 0.7) / 0.2)
    return { ...base, x: mix(g.x, sc.x, l), y: mix(g.y, sc.y, l), r: mix(7, 6, l), fill: cl > 0.5 ? col : neutral, opacity: 0.9 }
  }
  const v = vaultPos(c.vault.get(r.id) ?? 0)
  if (stage === 4) {
    if (!isTest) return { ...base, x: sc.x, y: sc.y, r: 6, fill: col, opacity: 0.9 }
    const k = c.vault.get(r.id)!
    const l = ease(stagger(p, k, c.j.split.test_ids.length, 0.15, 0.9, 0.3))
    return { ...base, x: mix(sc.x, v.x, l), y: mix(sc.y, v.y, l), r: 6, fill: 'none', stroke: col, opacity: 1 }
  }
  if (stage === 5) {
    if (isTest) return { ...base, x: v.x, y: v.y, r: 6, fill: 'none', stroke: col, opacity: 0.55 }
    return { ...base, x: sc.x, y: sc.y, r: 6, fill: col, opacity: 0.9 }
  }
  const pr = c.pred.get(r.id)
  if (stage === 6) {
    if (!isTest) return { ...base, x: sc.x, y: sc.y, r: 5, fill: col, opacity: 0.2 }
    const k = c.vault.get(r.id)!
    const l = ease(stagger(p, k, c.j.split.test_ids.length, 0.05, 0.85, 0.22))
    const arrived = l >= 1
    // unseen flowers enter without their label (grey); on arrival they take the predicted colour
    return { ...base, x: mix(v.x, sc.x, l), y: mix(v.y, sc.y, l), r: 7, fill: arrived && pr ? SPECIES_COLOR[pr.predicted] : 'none', stroke: arrived ? 'rgb(var(--c-text))' : neutral, opacity: 1, mark: arrived && pr ? (pr.correct ? 'ok' : 'bad') : null }
  }
  // stage 7: test flowers fly into the confusion matrix (row = truth, column = prediction)
  if (!isTest) return { ...base, x: sc.x, y: sc.y, r: 5, fill: col, opacity: 0.15 }
  const s = c.cmSlot.get(r.id)!
  const k = c.vault.get(r.id)!
  const l = ease(stagger(p, k, c.j.split.test_ids.length, 0.02, 0.7, 0.22))
  const m = cmPos(s)
  return { ...base, x: mix(sc.x, m.x, l), y: mix(sc.y, m.y, l), r: mix(7, 5, l), fill: pr ? SPECIES_COLOR[pr.predicted] : neutral, stroke: 'rgb(var(--c-text))', opacity: 1, mark: l >= 1 ? null : pr && !pr.correct ? 'bad' : null }
}

/** How much of each split line is drawn during training (0..1), in the order the tree learned them. */
export function splitReveal(p: number, order: number, count: number) {
  const span = 0.8 / count
  return clamp((p - 0.08 - order * span) / (span * 0.6))
}
/** Leaf region opacity during training: a leaf appears once all splits above it are drawn. */
export function leafReveal(p: number, depth: number, count: number) {
  const span = 0.8 / count
  return clamp((p - 0.08 - (depth - 1) * span - span * 0.6) / (span * 0.35))
}
