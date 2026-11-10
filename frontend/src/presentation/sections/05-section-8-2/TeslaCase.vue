<script setup lang="ts">
/**
 * Case study, DS4A p. 366: how Tesla uses machine learning. Vehicles send sensor data to the cloud, building dense
 * data maps (speeds, hazards) that are used to keep improving self-driving. Canvas 2D, a pure function of time t;
 * clearly labelled illustrative (no real fleet data). Reduced motion: a still frame.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { cssRGB } from '../../theme'

const props = defineProps<{ reduced: boolean }>()
const cv = ref<HTMLCanvasElement | null>(null)
let raf = 0
const ROADS = [{ y: 0.42 }, { y: 0.7 }, { y: 0.9 }]
const COLS = [0.18, 0.46, 0.78]
const CARS = Array.from({ length: 11 }, (_, i) => ({ road: i % 3, speed: 0.04 + ((i * 37) % 11) / 260, phase: (i * 0.137) % 1, vertical: i % 4 === 3, col: i % 3 }))

function draw(t: number) {
  const c = cv.value
  if (!c) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const W = c.clientWidth, H = c.clientHeight
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
  const g = c.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, W, H)
  const T = (k: string, a = 1) => { const [r, gg, b] = cssRGB(c, k); return `rgba(${r},${gg},${b},${a})` }
  // cloud + data map (cells brighten with the number of packets received so far)
  const cx = W * 0.5, cy = H * 0.13
  g.fillStyle = T('data', .12); g.strokeStyle = T('data'); g.lineWidth = 2
  g.beginPath(); g.ellipse(cx, cy, 140, 42, 0, 0, Math.PI * 2); g.fill(); g.stroke()
  g.fillStyle = T('soft'); g.font = "600 15px 'Space Grotesk', system-ui"; g.textAlign = 'center'; g.fillText('CLOUD · fleet data map', cx, cy + 5)
  const cells = 24
  for (let k = 0; k < cells; k++) {
    const heat = Math.min(1, ((t * 0.9 + k * 1.7) % 12) / 12 + (k % 5 === 0 ? 0.3 : 0))
    g.fillStyle = k % 7 === 3 ? T('human', 0.15 + heat * 0.7) : T('data', 0.1 + heat * 0.5)
    g.fillRect(cx - 132 + (k % 12) * 22, cy + 52 + Math.floor(k / 12) * 18, 18, 14)
  }
  // roads
  g.strokeStyle = T('dim', .3); g.lineWidth = 16; g.lineCap = 'round'
  for (const r of ROADS) { g.beginPath(); g.moveTo(30, H * r.y); g.lineTo(W - 30, H * r.y); g.stroke() }
  for (const x of COLS) { g.beginPath(); g.moveTo(W * x, H * 0.38); g.lineTo(W * x, H * 0.94); g.stroke() }
  // cars and their data packets
  CARS.forEach((car, i) => {
    const u = (car.phase + t * car.speed) % 1
    const x = car.vertical ? W * COLS[car.col] : 30 + u * (W - 60)
    const y = car.vertical ? H * 0.38 + u * H * 0.56 : H * ROADS[car.road].y
    g.fillStyle = T('text')
    g.save(); g.translate(x, y); if (car.vertical) g.rotate(Math.PI / 2); g.fillRect(-14, -7, 28, 14); g.restore()
    for (let k = 0; k < 3; k++) {
      const pp = (t * 0.6 + i * 0.29 + k / 3) % 1
      const px = x + (cx - x) * pp, py = y + (cy + 20 - y) * pp - Math.sin(pp * Math.PI) * 40
      g.fillStyle = (i + k) % 6 === 0 ? T('human', 1 - pp) : T('data-soft', 1 - pp)
      g.beginPath(); g.arc(px, py, 3.2, 0, Math.PI * 2); g.fill()
    }
  })
}
function loop(now: number) { draw(now / 1000); raf = requestAnimationFrame(loop) }
onMounted(() => { if (props.reduced) draw(6); else raf = requestAnimationFrame(loop) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="tesla" data-testid="m-tesla">
    <canvas ref="cv" class="cv" role="img" aria-label="Illustration: cars send sensor data to the cloud, building a data map" />
    <div class="side">
      <p class="lead">Every Tesla, self-driving or not, sends sensor data to the company through the cloud.</p>
      <ul>
        <li><i class="d c" /> speeds, positions and traffic insights</li>
        <li><i class="d a" /> hazards detected by onboard sensors</li>
      </ul>
      <p>The data builds dense data maps, which are used to keep learning and improving the self-driving technology. That is <b>data ingestion at scale</b>.</p>
      <p class="src">Case study, DS4A p. 366 · animation is illustrative</p>
    </div>
  </div>
</template>

<style scoped>
.tesla { display: grid; grid-template-columns: 1.6fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.cv { width: 100%; height: min(52vh, 480px); }
.lead { font: 500 clamp(17px, 1.4vw, 24px) / 1.4 'Inter', system-ui; color: rgb(var(--c-text)); }
ul { margin: 16px 0; display: grid; gap: 8px; list-style: none; padding: 0; color: rgb(var(--c-soft)); font-size: max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)); }
.d { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin-right: 8px; }
.d.c { background: rgb(var(--c-data-soft)); } .d.a { background: rgb(var(--c-human)); }
p { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); line-height: 1.5; }
b { color: rgb(var(--c-data)); }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
