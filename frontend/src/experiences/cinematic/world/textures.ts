/** Canvas-generated textures (no external image assets). All synthetic and deterministic. */
import * as THREE from 'three'
import { rng } from './math'
import { synthBrainSlice, type SliceOptions } from './mri'

export const FONT = {
  display: "600 {px}px 'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
  body: "500 {px}px 'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "500 {px}px 'JetBrains Mono', Consolas, ui-monospace, monospace",
}
export const font = (f: keyof typeof FONT, px: number) => FONT[f].replace('{px}', String(px))

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function canvasTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Paint intensity data (0..1) to a canvas, optionally tinted (holographic). */
export function paintSlice(data: Float32Array, size: number, tint: [number, number, number] = [1, 1, 1], alphaFromValue = false) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let k = 0; k < data.length; k++) {
    const v = data[k]
    img.data[k * 4] = Math.min(255, v * 255 * tint[0])
    img.data[k * 4 + 1] = Math.min(255, v * 255 * tint[1])
    img.data[k * 4 + 2] = Math.min(255, v * 255 * tint[2])
    img.data[k * 4 + 3] = alphaFromValue ? Math.min(255, v * v * 400) : 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

const sliceCache = new Map<string, HTMLCanvasElement>()
export function sliceCanvas(o: SliceOptions, tint?: [number, number, number], alpha = false) {
  const key = JSON.stringify([o, tint, alpha])
  let c = sliceCache.get(key)
  if (!c) {
    c = paintSlice(synthBrainSlice(o), o.size, tint, alpha)
    sliceCache.set(key, c)
  }
  return c
}

/** Synthetic chest radiograph-like image (stylised: ribs, lungs, spine, heart). */
export function chestXray(size: number, seed: number) {
  const r = rng(seed)
  const c = makeCanvas(size, size)
  const g = c.getContext('2d')!
  g.fillStyle = '#050505'
  g.fillRect(0, 0, size, size)
  const s = size / 256
  g.fillStyle = '#5a5a5a'
  g.beginPath()
  g.ellipse(128 * s, 150 * s, 104 * s, 120 * s, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#121212'
  for (const sx of [-1, 1]) {
    g.beginPath()
    g.ellipse((128 + sx * 48) * s, 140 * s, 40 * s, 80 * s, sx * -0.1, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = 'rgba(220,220,220,0.55)'
  g.lineWidth = 4 * s
  for (let i = 0; i < 9; i++) {
    for (const sx of [-1, 1]) {
      g.beginPath()
      const y = (70 + i * 17) * s
      g.moveTo(128 * s, y)
      g.quadraticCurveTo((128 + sx * 70) * s, y - 12 * s, (128 + sx * 96) * s, y + (18 + r() * 4) * s)
      g.stroke()
    }
  }
  g.fillStyle = '#c8c8c8'
  g.fillRect(122 * s, 30 * s, 12 * s, 230 * s)
  g.fillStyle = 'rgba(200,200,200,0.55)'
  g.beginPath()
  g.ellipse(140 * s, 175 * s, 34 * s, 30 * s, 0.4, 0, Math.PI * 2)
  g.fill()
  return c
}

/** Synthetic axial CT-like slice (body outline, organs as soft ellipses, vertebra). */
export function ctSlice(size: number, seed: number) {
  const r = rng(seed)
  const c = makeCanvas(size, size)
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, size, size)
  const s = size / 256
  g.fillStyle = '#6b6b6b'
  g.beginPath(); g.ellipse(128 * s, 132 * s, 110 * s, 78 * s, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#8a8a8a'
  g.beginPath(); g.ellipse((96 + r() * 10) * s, 120 * s, 40 * s, 32 * s, 0.3, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#7a7a7a'
  g.beginPath(); g.ellipse(166 * s, 118 * s, 26 * s, 22 * s, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#e6e6e6'
  g.beginPath(); g.ellipse(128 * s, 182 * s, 14 * s, 12 * s, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#303030'
  g.beginPath(); g.ellipse(128 * s, 150 * s, 9 * s, 9 * s, 0, 0, Math.PI * 2); g.fill()
  return c
}

/** A wide atlas of scan thumbnails (brain MRI, chest X-ray, CT) for the streaming scan wall. */
export function thumbnailAtlas(cols: number, rows: number, cell = 96) {
  const c = makeCanvas(cols * cell, rows * cell)
  const g = c.getContext('2d')!
  g.fillStyle = '#02040a'
  g.fillRect(0, 0, c.width, c.height)
  const r = rng(5)
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const kind = Math.floor(r() * 3)
      const src = kind === 0 ? sliceCanvas({ size: 96, z: r() * 1.4 - 0.7, seed: 100 + i * 7 + j }) : kind === 1 ? chestXray(96, i * 13 + j) : ctSlice(96, i * 5 + j)
      g.drawImage(src, i * cell + 4, j * cell + 4, cell - 8, cell - 8)
      g.strokeStyle = 'rgba(56,214,240,0.35)'
      g.lineWidth = 1
      g.strokeRect(i * cell + 3.5, j * cell + 3.5, cell - 7, cell - 7)
      g.fillStyle = 'rgba(159,176,200,0.8)'
      g.font = font('mono', 8)
      g.fillText(['MR', 'XR', 'CT'][kind] + '·' + String(1000 + j * cols + i), i * cell + 7, j * cell + cell - 8)
    }
  return c
}

/** Soft round glow for sprites/points. */
export function glowCanvas(size = 128, inner = 'rgba(255,255,255,1)') {
  const c = makeCanvas(size, size)
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gr.addColorStop(0, inner)
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  return c
}

/** Lit-window facade texture for background city blocks. */
export function windowsCanvas(seed: number, w = 128, h = 256) {
  const r = rng(seed)
  const c = makeCanvas(w, h)
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, w, h)
  for (let y = 4; y < h - 4; y += 10)
    for (let x = 4; x < w - 4; x += 9) {
      const v = r()
      if (v < 0.22) {
        g.fillStyle = v < 0.07 ? '#f2c27a' : v < 0.14 ? '#9fd8ff' : '#5c7aa8'
        g.globalAlpha = 0.35 + r() * 0.65
        g.fillRect(x, y, 5, 6)
      }
    }
  g.globalAlpha = 1
  return c
}

/** Rounded-rect helper. */
export function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Holographic panel: translucent glass card with a title strip; `body` draws content. */
export function holoPanel(w: number, h: number, title: string, accent: string, body: (g: CanvasRenderingContext2D, w: number, h: number) => void, index?: number) {
  const c = makeCanvas(w, h)
  const g = c.getContext('2d')!
  g.clearRect(0, 0, w, h)
  rrect(g, 4, 4, w - 8, h - 8, 22)
  const bg = g.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, 'rgba(14,30,60,0.82)')
  bg.addColorStop(1, 'rgba(6,12,28,0.72)')
  g.fillStyle = bg
  g.fill()
  g.strokeStyle = accent
  g.globalAlpha = 0.85
  g.lineWidth = 3
  g.stroke()
  g.globalAlpha = 1
  g.fillStyle = accent
  g.fillRect(28, 66, 64, 4)
  if (index !== undefined) {
    g.font = font('mono', 22)
    g.fillStyle = 'rgba(159,176,200,0.9)'
    g.fillText(String(index).padStart(2, '0'), 28, 50)
  }
  g.font = font('display', 30)
  g.fillStyle = '#e8eef8'
  g.fillText(title.toUpperCase(), index !== undefined ? 72 : 28, 50)
  body(g, w, h)
  return c
}

export function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y)
      y += lh
      line = w
    } else line = test
  }
  if (line) g.fillText(line, x, y)
  return y
}
