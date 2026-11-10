/**
 * "Pixels become data points": samples the bright pixels of an image (the film's final frame) and flies them
 * onto the presentation's ambient field. `render(p)` is a pure function of progress p (0..1), so the transition
 * can be scrubbed, reversed or skipped; GSAP only drives p.
 */
import { fieldPoints, fieldPos, isLightTheme, themeFieldColors } from '../../visualizations/shared/ParticleField'

interface Particle { sx: number; sy: number; tx: number; ty: number; col: [number, number, number]; tcol: [number, number, number]; r: number; tr: number; delay: number }

export class PixelDissolve {
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private w = 0
  private h = 0
  private light = false

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  /** Build particles from an image source drawn with object-fit: contain into the canvas. */
  prepare(src: CanvasImageSource, srcW: number, srcH: number, t0 = 0) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = this.canvas.clientWidth
    this.h = this.canvas.clientHeight
    this.canvas.width = Math.round(this.w * dpr)
    this.canvas.height = Math.round(this.h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // sample on a small offscreen copy
    const scale = Math.min(this.w / srcW, this.h / srcH)
    const dw = srcW * scale, dh = srcH * scale, ox = (this.w - dw) / 2, oy = (this.h - dh) / 2
    const SW = 240, SH = Math.round((240 * srcH) / srcW)
    const off = document.createElement('canvas')
    off.width = SW; off.height = SH
    const og = off.getContext('2d', { willReadFrequently: true })!
    let data: Uint8ClampedArray
    try {
      og.drawImage(src, 0, 0, SW, SH)
      data = og.getImageData(0, 0, SW, SH).data
    } catch {
      data = new Uint8ClampedArray(SW * SH * 4) // tainted/unavailable source: no particles, the field still fades in
    }
    const field = fieldPoints()
    const tones = themeFieldColors(this.canvas)
    this.light = isLightTheme(this.canvas)
    const out: Particle[] = []
    let k = 0
    for (let y = 0; y < SH; y += 2) {
      for (let x = 0; x < SW; x += 2) {
        const i = (y * SW + x) * 4
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 765
        if (lum < 0.28) continue
        const f = field[k % field.length]
        const [tx, ty] = fieldPos(f, t0, this.w, this.h)
        out.push({
          sx: ox + (x / SW) * dw, sy: oy + (y / SH) * dh, tx, ty,
          col: [data[i], data[i + 1], data[i + 2]], tcol: tones[f.tone],
          r: Math.max(0.8, (dw / SW) * 0.9 * lum), tr: f.r, delay: ((x / SW) * 0.35 + Math.abs(y / SH - 0.5) * 0.25),
        })
        k++
      }
    }
    this.particles = out.slice(0, 2600)
    return this.particles.length
  }

  get count() { return this.particles.length }

  /** Draw the transition at progress p. Each particle travels with its own small delay (a sweep across the frame). */
  render(p: number) {
    const g = this.ctx
    g.clearRect(0, 0, this.w, this.h)
    g.globalCompositeOperation = this.light ? 'source-over' : 'lighter'
    for (const q of this.particles) {
      const lp = Math.min(1, Math.max(0, (p - q.delay * 0.6) / 0.6))
      const e = lp < 0.5 ? 4 * lp ** 3 : 1 - (-2 * lp + 2) ** 3 / 2
      const x = q.sx + (q.tx - q.sx) * e + Math.sin(e * Math.PI) * (q.ty - q.sy) * 0.08
      const y = q.sy + (q.ty - q.sy) * e - Math.sin(e * Math.PI) * 40
      const c0 = q.col, c1 = q.tcol
      const r = c0[0] + (c1[0] - c0[0]) * e, gg = c0[1] + (c1[1] - c0[1]) * e, b = c0[2] + (c1[2] - c0[2]) * e
      const a = 0.9 * (1 - Math.max(0, p - 0.85) / 0.15 * 0.6)
      g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a.toFixed(3)})`
      g.beginPath(); g.arc(x, y, q.r + (q.tr - q.r) * e, 0, Math.PI * 2); g.fill()
    }
    g.globalCompositeOperation = 'source-over'
  }

  clear() { this.ctx.clearRect(0, 0, this.w, this.h); this.particles = [] }
}
