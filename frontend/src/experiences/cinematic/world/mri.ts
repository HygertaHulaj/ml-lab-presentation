/**
 * Synthetic, non-identifiable "MRI-like" brain slices, generated procedurally (no patient data).
 * Pure functions returning intensity arrays in 0..1 so they can be unit-tested and reused for:
 *  - textures (monitors, holograms, scan wall)
 *  - the pixel field in "Enter the Machine" (column height = real intensity of this synthetic image)
 *  - the feature maps (real convolution + ReLU + max-pool over these intensities)
 */
import { clamp, valueNoise2D } from './math'

export interface SliceOptions {
  size: number
  /** -1..1 through the head (0 = mid slice); changes skull radius and ventricle size */
  z?: number
  seed?: number
  /** bright focal pattern (the "finding") in normalised coords -1..1 */
  lesion?: { x: number; y: number; r: number; strength?: number } | null
  /** elongated bright vessel-like artifact (the false positive in scene 6) */
  artifact?: { x: number; y: number; len: number; angle: number } | null
}

export function synthBrainSlice(o: SliceOptions): Float32Array {
  const { size, z = 0, seed = 11, lesion = null, artifact = null } = o
  const noise = valueNoise2D(seed)
  const out = new Float32Array(size * size)
  const scale = Math.sqrt(Math.max(0.05, 1 - z * z * 0.85))
  const vent = Math.max(0, 1 - Math.abs(z) * 2.2)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size) * 2 - 1
      const y = -(((j + 0.5) / size) * 2 - 1)
      const ex = x / (0.74 * scale), ey = (y + 0.02) / (0.9 * scale)
      const r = Math.sqrt(ex * ex + ey * ey)
      const th = Math.atan2(ey, ex)
      const nz = noise(x * 3 + 10, y * 3 + 4, 3)
      let v = 0
      if (r < 1.06 && r >= 1.0) v = 0.28 + 0.1 * nz // scalp
      else if (r < 1.0 && r >= 0.93) v = 0.82 + 0.1 * nz // skull (bright, fat-like)
      else if (r < 0.93 && r >= 0.885) v = 0.08 // CSF gap
      else if (r < 0.885) {
        const fold = Math.sin(th * 23 + nz * 5.5) * 0.035
        const sulcus = Math.abs(Math.sin(th * 23 + nz * 5.5 + r * 9)) < 0.17 && r > 0.55
        v = r > 0.7 + fold ? 0.5 : 0.74 // grey vs white matter (T1-like contrast)
        if (sulcus) v = 0.16
        v += (noise(x * 14, y * 14, 2) - 0.5) * 0.1
        // midline fissure
        if (Math.abs(x) < 0.012 + 0.01 * nz && r > 0.28) v = 0.1
        // lateral ventricles
        if (vent > 0) {
          for (const s of [-1, 1]) {
            const vx = (x - s * 0.12 * scale) / (0.07 * vent + 0.01), vy = (y + 0.04) / (0.24 * vent + 0.01)
            const rx = vx * Math.cos(0.35 * s) - vy * Math.sin(0.35 * s), ry = vx * Math.sin(0.35 * s) + vy * Math.cos(0.35 * s)
            if (rx * rx + ry * ry < 1) v = 0.07
          }
        }
        if (lesion) {
          const d2 = ((x - lesion.x) ** 2 + (y - lesion.y) ** 2) / (lesion.r * lesion.r)
          v += (lesion.strength ?? 0.4) * Math.exp(-d2 * 1.6) * (0.85 + 0.3 * nz)
        }
        if (artifact) {
          const ca = Math.cos(artifact.angle), sa = Math.sin(artifact.angle)
          const u = (x - artifact.x) * ca + (y - artifact.y) * sa
          const w = -(x - artifact.x) * sa + (y - artifact.y) * ca
          if (Math.abs(u) < artifact.len) v += 0.38 * Math.exp(-(w * w) / 0.00035) * (1 - Math.abs(u) / artifact.len)
        }
      }
      out[j * size + i] = clamp(v)
    }
  }
  return out
}

/** 3×3 kernels of a tiny illustrative first layer (classic hand-chosen filters, the kind early CNN layers learn). */
export const KERNELS: { name: string; k: number[] }[] = [
  { name: 'vertical edges', k: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
  { name: 'horizontal edges', k: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
  { name: 'spots', k: [-1, -1, -1, -1, 8, -1, -1, -1, -1] },
  { name: 'bright blobs', k: [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16) },
]

/** Real 2-D convolution (zero padding) → ReLU → 2×2 max-pool. Output is normalised to 0..1 per map for display. */
export function featureMap(img: Float32Array, size: number, kernel: number[]): { data: Float32Array; size: number; max: number } {
  const conv = new Float32Array(size * size)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      let s = 0
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const x = i + di, y = j + dj
          if (x < 0 || y < 0 || x >= size || y >= size) continue
          s += img[y * size + x] * kernel[(dj + 1) * 3 + (di + 1)]
        }
      conv[j * size + i] = Math.max(0, s) // ReLU
    }
  const h = Math.floor(size / 2)
  const pooled = new Float32Array(h * h)
  let max = 0
  for (let j = 0; j < h; j++)
    for (let i = 0; i < h; i++) {
      const a = Math.max(conv[2 * j * size + 2 * i], conv[2 * j * size + 2 * i + 1], conv[(2 * j + 1) * size + 2 * i], conv[(2 * j + 1) * size + 2 * i + 1])
      pooled[j * h + i] = a
      if (a > max) max = a
    }
  if (max > 0) for (let k = 0; k < pooled.length; k++) pooled[k] /= max
  return { data: pooled, size: h, max }
}

/** Downsample by box averaging (for the pixel field). */
export function downsample(img: Float32Array, size: number, to: number): Float32Array {
  const f = size / to
  const out = new Float32Array(to * to)
  for (let j = 0; j < to; j++)
    for (let i = 0; i < to; i++) {
      let s = 0, n = 0
      for (let y = Math.floor(j * f); y < Math.floor((j + 1) * f); y++)
        for (let x = Math.floor(i * f); x < Math.floor((i + 1) * f); x++) { s += img[y * size + x]; n++ }
      out[j * to + i] = n ? s / n : 0
    }
  return out
}

/** The images used in the story (all synthetic). */
export const STORY_IMAGES = {
  /** scene 3/4/5: the slice Dr. Salizar studies; contains a faint focal pattern (illustrative) */
  hero: { seed: 11, lesion: { x: 0.34, y: 0.22, r: 0.1, strength: 0.32 } },
  /** scene 6: a vessel-like bright streak that the model wrongly flags */
  falsePositive: { seed: 23, artifact: { x: -0.3, y: -0.18, len: 0.16, angle: 0.6 } },
  /** scene 7: the new image the system flags for review */
  flagged: { seed: 37, lesion: { x: -0.28, y: 0.3, r: 0.085, strength: 0.42 } },
} as const
