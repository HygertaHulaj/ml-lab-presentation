<script setup lang="ts">
/**
 * DS4A Fig. 8.24 (pp. 390–391): performance against the amount of training data, for traditional machine learning,
 * a small and a large neural network. Left: the book's idea, drawn as a schematic (it is conceptual, without data).
 * Right (→): the real thing on the handwritten digits, every point computed by the backend.
 */
import { computed, ref } from 'vue'
import type { DeepLearning } from '../../api'

const props = defineProps<{ data: DeepLearning }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 1) { stage.value++; return true } return false }
defineExpose({ advance })

const TONES = ['human', 'ok', 'compute'] // traditional, small, large (red, green, blue in the book)
const W = 460, H = 320, L = 50, B = 42, T = 14, R = 16
// schematic curves (shape only, after the book)
const sx = (u: number) => L + u * (W - L - R)
const sy = (v: number) => H - B - v * (H - B - T)
const shape = (f: (u: number) => number) => Array.from({ length: 61 }, (_, i) => i / 60).map((u, i) => `${i ? 'L' : 'M'}${sx(u).toFixed(1)},${sy(f(u)).toFixed(1)}`).join('')
const SCHEMATIC = [
  { k: 'Traditional machine learning', d: shape((u) => 0.36 * (1 - Math.exp(-u * 9))) },
  { k: 'Small neural network', d: shape((u) => 0.6 / (1 + Math.exp(-(u - 0.22) * 11))) },
  { k: 'Large neural network', d: shape((u) => 0.92 / (1 + Math.exp(-(u - 0.38) * 9))) },
]
// real curves: log x (number of training images), accuracy y
const ns = computed(() => props.data.learning_curves[0].points.map((p) => p.n))
const lx = (n: number) => L + (Math.log(n) - Math.log(ns.value[0])) / (Math.log(ns.value[ns.value.length - 1]) - Math.log(ns.value[0])) * (W - L - R)
const y0 = 0.5
const ly = (a: number) => H - B - ((a - y0) / (1 - y0)) * (H - B - T)
const curves = computed(() => props.data.learning_curves.map((c, i) => ({
  ...c, tone: TONES[i], d: c.points.map((p, k) => `${k ? 'L' : 'M'}${lx(p.n).toFixed(1)},${ly(p.accuracy).toFixed(1)}`).join(''),
  first: c.points[0], last: c.points[c.points.length - 1],
})))
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
</script>

<template>
  <div class="lc" data-testid="m-curves">
    <figure>
      <figcaption><strong>The book's idea</strong> · Fig. 8.24, schematic</figcaption>
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Schematic: performance against data for three kinds of model">
        <line :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" class="axis" /><line :x1="L" :x2="L" :y1="T" :y2="H - B" class="axis" />
        <text :x="(L + W) / 2" :y="H - 12" text-anchor="middle" class="ax">data available for training →</text>
        <text :x="16" :y="(H - B) / 2" text-anchor="middle" class="ax" :transform="`rotate(-90 16 ${(H - B) / 2})`">performance →</text>
        <path v-for="(c, i) in SCHEMATIC" :key="c.k" :d="c.d" class="ln" :style="{ stroke: `rgb(var(--c-${TONES[i]}))` }" />
      </svg>
      <div class="legend"><span v-for="(c, i) in SCHEMATIC" :key="c.k"><i :style="{ background: `rgb(var(--c-${TONES[i]}))` }" />{{ c.k }}</span></div>
    </figure>
    <figure :class="{ hide: stage < 1 }" data-testid="lc-real">
      <figcaption><strong>Measured on {{ data.dataset.n_test }} unseen digits</strong> · computed by the backend</figcaption>
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Measured test accuracy against number of training images">
        <g v-for="t in [0.5, 0.6, 0.7, 0.8, 0.9, 1]" :key="t">
          <line :x1="L" :x2="W - R" :y1="ly(t)" :y2="ly(t)" class="grid" />
          <text :x="L - 6" :y="ly(t) + 4" text-anchor="end" class="tick">{{ Math.round(t * 100) }} %</text>
        </g>
        <text v-for="n in ns" :key="n" :x="lx(n)" :y="H - B + 16" text-anchor="middle" class="tick">{{ n }}</text>
        <text :x="(L + W) / 2" :y="H - 6" text-anchor="middle" class="ax">training images (log scale)</text>
        <g v-for="c in curves" :key="c.method">
          <path :d="c.d" class="ln" :style="{ stroke: `rgb(var(--c-${c.tone}))` }" />
          <circle v-for="p in c.points" :key="p.n" :cx="lx(p.n)" :cy="ly(p.accuracy)" r="3.5" :style="{ fill: `rgb(var(--c-${c.tone}))` }" />
        </g>
      </svg>
      <div class="legend">
        <span v-for="c in curves" :key="c.method" :data-testid="`lc-${c.tone}`"><i :style="{ background: `rgb(var(--c-${c.tone}))` }" />{{ c.method }}: {{ pct(c.first.accuracy) }} → <b>{{ pct(c.last.accuracy) }}</b></span>
      </div>
      <p class="note">Same direction as the book: with the most data the large network is best. But on {{ data.dataset.n_train.toLocaleString('en') }} small 8×8 images the differences are a few points; the book's large gap appears with far bigger data (millions of images).</p>
    </figure>
  </div>
</template>

<style scoped>
.lc { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; width: 100%; align-items: start; }
figure { margin: 0; transition: opacity .5s; }
figure.hide { opacity: 0; }
figcaption { font-size: 14px; color: rgb(var(--c-soft)); margin-bottom: 6px; }
figcaption strong { font: 600 max(17px, var(--up-17, 17px)) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
svg { width: 100%; max-height: 42vh; display: block; }
.axis { stroke: rgba(var(--c-dim), .6); }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.ln { fill: none; stroke-width: 3; }
.legend { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.legend i { display: inline-block; width: 16px; height: 4px; border-radius: 2px; margin-right: 8px; vertical-align: middle; }
.legend b { color: rgb(var(--c-strong)); }
.note { margin-top: 8px; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); line-height: 1.45; }
</style>
