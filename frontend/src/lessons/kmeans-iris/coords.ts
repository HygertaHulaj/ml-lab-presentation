import type { Vec3 } from '../../engine/types'

/**
 * One linear map from data space (two features, in cm or z-scores) to scene units, used for points AND centroids.
 * Both axes share the same scale so that Euclidean distances drawn in the scene are true to the data.
 */
export interface CoordMap {
  scale: number
  cx: number
  cy: number
  toScene: (p: number[]) => Vec3
  /** scene-space bounds of the data, for axes */
  bounds: { x0: number; x1: number; y0: number; y1: number }
  ticks: { x: { v: number; s: number }[]; y: { v: number; s: number }[] }
}

export function makeCoordMap(points: number[][], width = 12, height = 7.2): CoordMap {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1])
  const [xmin, xmax] = [Math.min(...xs), Math.max(...xs)]
  const [ymin, ymax] = [Math.min(...ys), Math.max(...ys)]
  const pad = 0.08
  const rx = (xmax - xmin || 1) * (1 + pad), ry = (ymax - ymin || 1) * (1 + pad)
  const scale = Math.min(width / rx, height / ry)
  const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2
  const toScene = (p: number[]): Vec3 => [(p[0] - cx) * scale, (p[1] - cy) * scale, 0]
  const bounds = { x0: -rx * scale / 2, x1: rx * scale / 2, y0: -ry * scale / 2, y1: ry * scale / 2 }
  const ticks = (lo: number, hi: number, c: number) => {
    const step = niceStep((hi - lo) / 5)
    const out: { v: number; s: number }[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push({ v: +v.toFixed(6), s: (v - c) * scale })
    return out
  }
  return {
    scale, cx, cy, toScene, bounds,
    ticks: { x: ticks(cx - rx / 2, cx + rx / 2, cx), y: ticks(cy - ry / 2, cy + ry / 2, cy) },
  }
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p
}
