/**
 * Pure geometry and timing for the programming-vs-learning pipelines. Every frame is a function of one progress
 * value p (0..1), so the animations can be replayed, reversed and synchronised exactly.
 */
import type { RuleVsLearned } from '../../api'

export type LaneMode = 'traditional' | 'training' | 'inference' | 'ml-full'

export interface Sample { x: number; truth: boolean; predHuman?: boolean; predLearned?: boolean }

export const LANE = { w: 1000, h: 420, queueX: 120, boxX0: 350, boxX1: 650, boxY0: 118, boxY1: 302, outX: 870, midY: 210 }

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Deterministic display subset of the unseen flowers: 2 per class plus the first error of each rule (if any). */
export function pickTestSamples(d: RuleVsLearned, n = 6): Sample[] {
  const t = d.test
  const all = t.x.map((x, i) => ({ i, x, truth: t.positive[i], predHuman: t.pred_human[i], predLearned: t.pred_learned[i] }))
  const chosen = new Set<number>()
  const add = (s?: { i: number }) => { if (s && chosen.size < n) chosen.add(s.i) }
  add(all.find((s) => s.predLearned !== s.truth))
  add(all.find((s) => s.predHuman !== s.truth && !chosen.has(s.i)))
  for (const cls of [false, true]) all.filter((s) => s.truth === cls && !chosen.has(s.i)).slice(0, 2).forEach(add)
  for (const s of all) add(s)
  return [...chosen].map((i) => all[i]).sort((a, b) => a.x - b.x).map(({ x, truth, predHuman, predLearned }) => ({ x, truth, predHuman, predLearned }))
}

/** Balanced, deterministic subset of the labelled training flowers that are drawn (the learner uses all of them). */
export function pickTrainSamples(d: RuleVsLearned, perClass = 4): Sample[] {
  const out: Sample[] = []
  for (const cls of [false, true]) d.train.x.forEach((x, i) => { if (d.train.positive[i] === cls && out.filter((s) => s.truth === cls).length < perClass) out.push({ x, truth: cls }) })
  return out.sort((a, b) => a.x - b.x)
}

export const slotY = (i: number, n: number) => LANE.midY + (i - (n - 1) / 2) * Math.min(44, 260 / n)

/** Local travel progress of token i of n at lane progress p (tokens leave the queue one after another). */
export function tokenProgress(p: number, i: number, n: number) {
  const start = 0.12 + (i * 0.56) / n
  return clamp((p - start) / 0.24)
}

export interface TokenPose { x: number; y: number; opacity: number; stage: 'queue' | 'inside' | 'out' }
/** Through-pipeline tokens (traditional, inference): queue → box → output slot. */
export function passPose(p: number, i: number, n: number): TokenPose {
  const l = tokenProgress(p, i, n)
  const y0 = slotY(i, n)
  if (l <= 0) return { x: LANE.queueX, y: y0, opacity: 1, stage: 'queue' }
  if (l < 0.42) { const e = ease(l / 0.42); return { x: LANE.queueX + (LANE.boxX0 - LANE.queueX) * e, y: y0 + (LANE.midY - y0) * e, opacity: 1 - clamp((l - 0.32) / 0.1), stage: 'queue' } }
  if (l < 0.58) return { x: (LANE.boxX0 + LANE.boxX1) / 2, y: LANE.midY, opacity: 0, stage: 'inside' }
  const e = ease((l - 0.58) / 0.42)
  return { x: LANE.boxX1 + (LANE.outX - LANE.boxX1) * e, y: LANE.midY + (y0 - LANE.midY) * e, opacity: clamp((l - 0.58) / 0.1), stage: 'out' }
}
/** Training tokens are absorbed by the learning algorithm. */
export function absorbPose(p: number, i: number, n: number): TokenPose {
  const l = tokenProgress(p, i, n)
  const y0 = slotY(i, n)
  if (l <= 0) return { x: LANE.queueX, y: y0, opacity: 1, stage: 'queue' }
  const e = ease(clamp(l / 0.7))
  return { x: LANE.queueX + ((LANE.boxX0 + LANE.boxX1) / 2 - LANE.queueX) * e, y: y0 + (LANE.midY - y0) * e, opacity: 1 - clamp((l - 0.45) / 0.25), stage: l < 0.7 ? 'queue' : 'inside' }
}

/** For 'ml-full' (compare view): the first half trains, the second half runs inference. */
export function splitFull(p: number): { phase: 'training' | 'inference'; p: number } {
  return p < 0.5 ? { phase: 'training', p: p * 2 } : { phase: 'inference', p: (p - 0.5) * 2 }
}

/** Index of the candidate threshold the learner is "trying" at progress p (training scans while tokens arrive). */
export function scanIndex(p: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor(clamp((p - 0.15) / 0.65) * count)))
}

/** Results (✓/✗ against the truth) are revealed at the end of a pass. */
export const resultsShown = (p: number) => p >= 0.9
/** The trained model card leaves the learner at the end of training. */
export const modelReady = (p: number) => p >= 0.86
