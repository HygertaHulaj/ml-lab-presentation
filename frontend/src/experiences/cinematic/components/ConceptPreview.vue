<script setup lang="ts">
/** One of the four scene-9 concept previews, drawn on a canvas as a pure function of the local progress `p` (0..1). */
import { onMounted, ref, watch } from 'vue'
import { conceptData } from '../concepts'

const props = defineProps<{ kind: 'classification' | 'regression' | 'clustering' | 'evaluation'; p: number; title: string; caption: string }>()
const cv = ref<HTMLCanvasElement | null>(null)
const D = conceptData()
const W = 260, H = 160

function draw() {
  const c = cv.value
  if (!c) return
  const g = c.getContext('2d')!
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr }
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, W, H)
  const p = props.p
  const box = (xs: number[], ys: number[]) => {
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    return { X: (x: number) => 12 + ((x - x0) / (x1 - x0)) * (W - 24), Y: (y: number) => H - 12 - ((y - y0) / (y1 - y0)) * (H - 24) }
  }
  const dot = (x: number, y: number, col: string, r = 2.6) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  if (props.kind === 'classification') {
    const { X, Y } = box(D.cls.map((q) => q.x), D.cls.map((q) => q.y))
    D.cls.forEach((q) => dot(X(q.x), Y(q.y), q.c === 0 ? '#38d6f0' : '#8b7cf6'))
    // perpendicular bisector of the two class means (in data units)
    const mx = (D.m0.x + D.m1.x) / 2, my = (D.m0.y + D.m1.y) / 2, dx = D.m1.x - D.m0.x, dy = D.m1.y - D.m0.y
    const L = 3 * p
    g.strokeStyle = '#f2b54a'; g.lineWidth = 2
    g.beginPath(); g.moveTo(X(mx + dy * L), Y(my - dx * L)); g.lineTo(X(mx - dy * L), Y(my + dx * L)); g.stroke()
  } else if (props.kind === 'regression') {
    const { X, Y } = box(D.reg.map((q) => q.x), D.reg.map((q) => q.y))
    const f = D.fit
    D.reg.forEach((q, i) => {
      dot(X(q.x), Y(q.y), '#9fd8ff', 2.2)
      if (p > 0.55 && i % 3 === 0) { g.strokeStyle = 'rgba(224,102,102,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(q.x), Y(q.y)); g.lineTo(X(q.x), Y(f.a + f.b * q.x)); g.stroke() }
    })
    const xa = Math.min(...D.reg.map((q) => q.x)), xb = Math.max(...D.reg.map((q) => q.x))
    const xe = xa + (xb - xa) * Math.min(1, p * 1.6)
    g.strokeStyle = '#f2b54a'; g.lineWidth = 2.2
    g.beginPath(); g.moveTo(X(xa), Y(f.a + f.b * xa)); g.lineTo(X(xe), Y(f.a + f.b * xe)); g.stroke()
  } else if (props.kind === 'clustering') {
    const { X, Y } = box(D.clu.map((q) => q.x), D.clu.map((q) => q.y))
    const k = Math.floor(D.clu.length * Math.min(1, p * 1.3))
    g.strokeStyle = 'rgba(139,124,246,0.65)'; g.lineWidth = 1.2
    for (let i = 0; i < k; i++) { const a = D.clu[i], b = D.clu[D.nn[i]]; g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(b.x), Y(b.y)); g.stroke() }
    D.clu.forEach((q) => dot(X(q.x), Y(q.y), '#cbd5e1', 2.2))
  } else {
    const m = D.conf
    const cells: [string, number, string][] = [['TP', m.tp, '#5fd39a'], ['FN', m.fn, '#e06666'], ['FP', m.fp, '#e06666'], ['TN', m.tn, '#5fd39a']]
    cells.forEach(([lbl, v, col], i) => {
      const x = 70 + (i % 2) * 70, y = 14 + Math.floor(i / 2) * 64
      const a = Math.min(1, Math.max(0, p * 4 - i * 0.6))
      g.globalAlpha = 0.25 + 0.6 * a * (v / 50)
      g.fillStyle = col; g.fillRect(x, y, 64, 58)
      g.globalAlpha = 1
      g.fillStyle = '#e8eef8'; g.font = "600 20px 'Space Grotesk', system-ui"; g.textAlign = 'center'
      g.fillText(a > 0.2 ? String(v) : '', x + 32, y + 32)
      g.font = "500 11px 'Inter', system-ui"; g.fillStyle = '#9fb0c8'; g.fillText(lbl, x + 32, y + 50)
    })
    g.textAlign = 'left'
    g.font = "500 11px 'Inter', system-ui"; g.fillStyle = '#9fb0c8'
    g.fillText('pred +', 78, 152); g.fillText('pred −', 150, 152)
    g.save(); g.translate(58, 100); g.rotate(-Math.PI / 2); g.fillText('actual', 0, 0); g.restore()
  }
}
onMounted(draw)
watch(() => props.p, draw)
</script>

<template>
  <figure class="concept">
    <canvas ref="cv" :style="{ width: W + 'px', height: H + 'px' }" role="img" :aria-label="title + ': ' + caption" />
    <figcaption>
      <strong>{{ title }}</strong>
      <span>{{ caption }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.concept { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 14px; background: rgba(8, 16, 34, 0.72); border: 1px solid rgba(56, 214, 240, 0.25); backdrop-filter: blur(6px); }
figcaption { display: flex; flex-direction: column; gap: 2px; }
strong { font: 600 15px 'Space Grotesk', system-ui, sans-serif; color: #e8eef8; letter-spacing: 0.02em; }
span { font: 500 12px 'Inter', system-ui, sans-serif; color: #9fb0c8; max-width: 260px; }
</style>
