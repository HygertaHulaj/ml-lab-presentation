/** Small deterministic helpers for the film. Everything visual is a pure function of the film time `t`. */
export type V3 = [number, number, number]

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const mix3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)]
/** 0..1 progress of t across [a, b]. */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a || 1))
export const smooth = (p: number) => p * p * (3 - 2 * p)
export const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2
export const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
export const easeInCubic = (p: number) => p * p * p
export const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
/** Rises 0→1 over [a, a+fi], holds, falls 1→0 over [b-fo, b]. */
export const window01 = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) =>
  Math.min(smooth(span(t, a, a + fi)), 1 - smooth(span(t, b - fo, b)))

/** mulberry32 — deterministic PRNG, for decorative layout only. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seeded 2-D value noise with smooth interpolation, range ≈ 0..1. */
export function valueNoise2D(seed: number) {
  const r = rng(seed)
  const N = 256
  const perm = new Uint16Array(N * 2)
  const vals = new Float32Array(N)
  for (let i = 0; i < N; i++) { perm[i] = i; vals[i] = r() }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i]
  const h = (x: number, y: number) => vals[perm[(perm[x & 255] + y) & 511]]
  const n = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = smooth(x - xi), yf = smooth(y - yi)
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), xf), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), xf), yf)
  }
  return (x: number, y: number, octaves = 3) => {
    let a = 0, f = 1, amp = 0.5, tot = 0
    for (let o = 0; o < octaves; o++) { a += amp * n(x * f, y * f); tot += amp; f *= 2.03; amp *= 0.5 }
    return a / tot
  }
}
