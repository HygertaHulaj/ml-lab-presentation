/**
 * The presentation's ambient data field: a deterministic constellation of points (seeded), drifting slowly.
 * The intro's pixel dissolve lands its particles exactly on these positions, so the first frame after the film
 * continues the film's last frame. Pure helpers + a small Canvas 2D renderer (cheap; no WebGL needed).
 */
export interface FieldPoint { x: number; y: number; r: number; tone: 0 | 1 | 2; phase: number; speed: number }

import { cssRGB } from '../../presentation/theme'

/** fallback palette; at draw time the colours are read from the theme tokens (data, compute, feature) */
export const FIELD_COLORS: [number, number, number][] = [[63, 182, 196], [91, 159, 216], [155, 140, 240]]
export function themeFieldColors(el: Element): [number, number, number][] {
  return [cssRGB(el, 'data'), cssRGB(el, 'compute'), cssRGB(el, 'feature')]
}
export const isLightTheme = (el: Element) => !!el.closest('[data-theme="light"]')

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map<string, FieldPoint[]>()
/** Normalised (0..1) points, denser toward the centre band. */
export function fieldPoints(n = 420, seed = 8): FieldPoint[] {
  const key = `${n}:${seed}`
  const hit = cache.get(key)
  if (hit) return hit
  const r = mulberry(seed)
  const pts: FieldPoint[] = []
  for (let i = 0; i < n; i++) {
    const y = 0.5 + (r() + r() + r() - 1.5) * 0.55
    pts.push({ x: r(), y: Math.min(0.98, Math.max(0.02, y)), r: 0.6 + r() * r() * 2.4, tone: (r() < 0.55 ? 0 : r() < 0.6 ? 1 : 2) as 0 | 1 | 2, phase: r() * Math.PI * 2, speed: 0.4 + r() * 0.8 })
  }
  cache.set(key, pts)
  return pts
}

/** Screen position of a field point at time t (seconds). Reduced motion: no drift. */
export function fieldPos(p: FieldPoint, t: number, w: number, h: number, reduced = false): [number, number] {
  if (reduced) return [p.x * w, p.y * h]
  const dx = Math.sin(t * 0.07 * p.speed + p.phase) * 0.012
  const dy = Math.cos(t * 0.05 * p.speed + p.phase * 1.3) * 0.01
  return [(p.x + dx) * w, (p.y + dy) * h]
}

export class FieldRenderer {
  private ctx: CanvasRenderingContext2D
  private pts = fieldPoints()
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight
    if (this.canvas.width !== Math.round(w * dpr)) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr) }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return [w, h] as const
  }
  /** alpha: overall visibility 0..1; links: draw faint links between near neighbours (constellation look). */
  draw(t: number, alpha: number, reduced: boolean, links = true) {
    const [w, h] = this.resize()
    const g = this.ctx
    g.clearRect(0, 0, w, h)
    if (alpha <= 0.001) return
    const cols = themeFieldColors(this.canvas)
    const light = isLightTheme(this.canvas)
    if (light) alpha *= 0.7
    g.globalCompositeOperation = light ? 'source-over' : 'lighter'
    const [lr, lg, lb] = cols[0]
    const pos = this.pts.map((p) => fieldPos(p, t, w, h, reduced))
    if (links) {
      g.lineWidth = 0.6
      for (let i = 0; i < pos.length; i += 2) {
        for (let j = i + 1; j < Math.min(pos.length, i + 18); j++) {
          const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1]
          const d2 = dx * dx + dy * dy
          if (d2 < 9000) {
            g.strokeStyle = `rgba(${lr},${lg},${lb},${((light ? 0.14 : 0.09) * (1 - d2 / 9000) * alpha).toFixed(3)})`
            g.beginPath(); g.moveTo(pos[i][0], pos[i][1]); g.lineTo(pos[j][0], pos[j][1]); g.stroke()
          }
        }
      }
    }
    this.pts.forEach((p, i) => {
      const [x, y] = pos[i]
      const [cr, cg, cb] = cols[p.tone]
      const tw = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 1.3 * p.speed + p.phase)
      g.fillStyle = `rgba(${cr},${cg},${cb},${(0.55 * tw * alpha).toFixed(3)})`
      g.beginPath(); g.arc(x, y, p.r, 0, Math.PI * 2); g.fill()
    })
    g.globalCompositeOperation = 'source-over'
  }
}
