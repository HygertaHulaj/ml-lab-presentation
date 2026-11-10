/**
 * Real (tiny) computations behind the four concept previews of scene 9, on the real Iris data.
 * They are deliberately simple, closed-form methods; the full interactive algorithms run on the backend.
 */
import { iris } from './story'

export interface Pt { x: number; y: number; c: number }

/** Ordinary least squares y = a + b·x. */
export function ols(pts: { x: number; y: number }[]) {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n
  let sxy = 0, sxx = 0
  for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2 }
  const b = sxy / sxx
  const a = my - b * mx
  const ssr = pts.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0)
  const sst = pts.reduce((s, p) => s + (p.y - my) ** 2, 0)
  return { a, b, r2: 1 - ssr / sst }
}

/** Index of each point's nearest other point (Euclidean). */
export function nearestNeighbour(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => {
    let best = -1, bd = Infinity
    pts.forEach((q, j) => { if (j === i) return; const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < bd) { bd = d; best = j } })
    return best
  })
}

/** Threshold classifier on one feature; positive = class `pos`. Returns confusion counts and metrics. */
export function thresholdConfusion(values: number[], labels: number[], pos: number, threshold: number) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  values.forEach((v, i) => {
    const pred = v >= threshold, actual = labels[i] === pos
    if (pred && actual) tp++
    else if (pred && !actual) fp++
    else if (!pred && actual) fn++
    else tn++
  })
  const n = tp + fp + fn + tn
  return { tp, fp, fn, tn, accuracy: (tp + tn) / n, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1) }
}

const PL = 2, PW = 3
/** Data for the four previews. */
export function conceptData() {
  const obs = iris.observations, lab = iris.labels
  // classification: setosa (0) vs versicolor (1), petal length × width, boundary = perpendicular bisector of class means
  const cls = obs.map((o, i) => ({ x: o[PL], y: o[PW], c: lab[i] })).filter((p) => p.c < 2)
  const mean = (c: number) => { const s = cls.filter((p) => p.c === c); return { x: s.reduce((a, p) => a + p.x, 0) / s.length, y: s.reduce((a, p) => a + p.y, 0) / s.length } }
  const m0 = mean(0), m1 = mean(1)
  // regression: petal width from petal length, all 150 flowers
  const reg = obs.map((o) => ({ x: o[PL], y: o[PW] }))
  const fit = ols(reg)
  // clustering preview: unlabelled sepal measurements, linked to their nearest neighbour (similarity)
  const clu = obs.map((o) => ({ x: o[0], y: o[1] }))
  const nn = nearestNeighbour(clu)
  // evaluation: versicolor (1) vs virginica (2) with a petal-length threshold half-way between the class means
  const vv = obs.map((o, i) => ({ v: o[PL], c: lab[i] })).filter((p) => p.c > 0)
  const mv = (c: number) => { const s = vv.filter((p) => p.c === c); return s.reduce((a, p) => a + p.v, 0) / s.length }
  const thr = (mv(1) + mv(2)) / 2
  const conf = thresholdConfusion(vv.map((p) => p.v), vv.map((p) => p.c), 2, thr)
  return { cls, m0, m1, reg, fit, clu, nn, conf, thr }
}
