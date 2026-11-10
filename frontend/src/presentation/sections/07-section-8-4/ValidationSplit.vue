<script setup lang="ts">
/**
 * DS4A pp. 380–381, model validation: the 400 car seat stores are divided into training data and test data that is
 * set aside. The counts (319 / 81) are the book's official split, from the backend. Which dot goes where is only a
 * picture (a seeded shuffle); positions are a pure function of progress p.
 */
import { computed } from 'vue'
import { useProgress } from '../../../visualizations/shared/useProgress'
import { DEFS } from './content'

const props = defineProps<{ nTrain: number; nTest: number; reduced: boolean }>()
const { prog, play, finish, playing } = useProgress(2.6, () => props.reduced)

const N = computed(() => props.nTrain + props.nTest)
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }
const dots = computed(() => {
  const r = rng(380)
  const order = Array.from({ length: N.value }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] } // Fisher–Yates
  const isTest = new Set(order.slice(0, props.nTest))
  let tr = 0, te = 0
  return Array.from({ length: N.value }, (_, i) => {
    const sx = 330 + (i % 20) * 17, sy = 40 + Math.floor(i / 20) * 17
    const test = isTest.has(i)
    const k = test ? te++ : tr++
    const ex = test ? 735 + (k % 9) * 19 : 40 + (k % 22) * 17
    const ey = test ? 120 + Math.floor(k / 9) * 19 : 60 + Math.floor(k / 22) * 17
    return { sx, sy, ex, ey, test, delay: (i % 20) / 20 * 0.3 + Math.floor(i / 20) / 20 * 0.15 }
  })
})
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const pos = computed(() => dots.value.map((d) => {
  const t = ease(Math.min(1, Math.max(0, (prog.p - d.delay) / 0.55)))
  return { x: d.sx + (d.ex - d.sx) * t, y: d.sy + (d.ey - d.sy) * t, test: d.test, t }
}))
const split = computed(() => prog.p > 0.6)
function advance(): boolean { if (prog.p === 0 && !playing.value) { play(); return true } return finish() }
defineExpose({ advance })
</script>

<template>
  <div class="vs" data-testid="m-validation">
    <div class="vis">
      <svg viewBox="0 0 960 400" role="img" :aria-label="`${N} stores divided into ${nTrain} training and ${nTest} test stores`">
        <text x="480" y="22" text-anchor="middle" class="lbl" :style="{ opacity: 1 - prog.p * 2 }">the car seat data · {{ N }} stores</text>
        <g :style="{ opacity: split ? 1 : 0, transition: 'opacity .5s' }">
          <text x="40" y="40" class="lbl" style="fill: rgb(var(--c-compute))">training data · {{ nTrain }} stores</text>
          <text x="735" y="100" class="lbl" style="fill: rgb(var(--c-warn))">test data · {{ nTest }} stores</text>
          <rect x="722" y="106" width="186" height="186" rx="12" class="lock" />
          <text x="815" y="316" text-anchor="middle" class="small">set aside: the model never sees these while training</text>
        </g>
        <circle v-for="(d, i) in pos" :key="i" :cx="d.x" :cy="d.y" r="6"
                :style="{ fill: d.test && d.t > 0.02 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-compute))', opacity: 0.9 }" />
      </svg>
      <p class="ratio" :style="{ opacity: split ? 1 : 0 }" data-testid="vs-ratio">{{ nTrain }} / {{ nTest }} ≈ {{ Math.round(nTrain / N * 100) }} % / {{ Math.round(nTest / N * 100) }} % · the book's official split (one convention: 80 % / 20 %, chosen at random)</p>
    </div>
    <div class="defs">
      <div class="card tr"><span>{{ DEFS.training }}</span></div>
      <div class="card te"><span>{{ DEFS.test }}</span></div>
      <div class="card va"><span>{{ DEFS.validation }}</span></div>
      <p class="bpb"><b>Big Picture Break, p. 381.</b> Supervised learning is predictive modelling: what matters is how well a model predicts <i>new</i> observations, the test data.</p>
    </div>
  </div>
</template>

<style scoped>
.vs { display: grid; grid-template-columns: 1.7fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.vis svg { width: 100%; max-height: 50vh; display: block; }
.lbl { font: 600 15px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); letter-spacing: .04em; }
.small { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.lock { fill: rgba(var(--c-warn), .06); stroke: rgb(var(--c-warn)); stroke-dasharray: 6 5; stroke-width: 1.5; }
.ratio { margin-top: 8px; font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-soft)); transition: opacity .5s; }
.defs { display: flex; flex-direction: column; gap: 10px; }
.card { padding: 12px 16px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-left: 3px solid; font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; color: rgb(var(--c-text)); }
.card.tr { border-color: rgb(var(--c-compute)); } .card.te { border-color: rgb(var(--c-warn)); } .card.va { border-color: rgb(var(--c-accent)); }
.bpb { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); line-height: 1.45; }
.bpb b { color: rgb(var(--c-human)); }
</style>
