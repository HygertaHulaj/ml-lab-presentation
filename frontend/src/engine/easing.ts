import type { Vec3 } from './types'

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const lerp3 = (a: Vec3, b: Vec3, p: number): Vec3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)]
export const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
/** Progress of `t` inside [start, start + duration], clamped to 0..1. */
export const progress = (t: number, start: number, duration: number) => (duration <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / duration))

/** Deterministic pseudo-random numbers (mulberry32) — used only for decorative layout, never for algorithm values. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
