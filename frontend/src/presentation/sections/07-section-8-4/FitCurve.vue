<script setup lang="ts">
/**
 * DS4A Figs 8.17–8.21 (pp. 385–387), recomputed: seeded synthetic data like the book's figure (itself simulated, from
 * ISLR). Left: training points, the true relationship, and models of increasing flexibility. Right: training and
 * test MSE against complexity. → walks the book's order: the truth (8.18), gold (8.19), green (8.20), blue (8.21).
 * The slider shows any of the 24 fitted models. Every curve and MSE comes from the backend.
 */
import { computed, ref } from 'vue'
import type { Evaluation } from '../../api'

const props = defineProps<{ data: Evaluation['fit_curve'] }>()
const stage = ref(0)
const custom = ref<number | null>(null)
const TONE: Record<string, string> = { underfit: 'human', 'well fitted': 'compute', overfit: 'ok' }
const NAME: Record<string, string> = { underfit: 'gold', 'well fitted': 'blue', overfit: 'green' }
const ORDER = ['underfit', 'overfit', 'well fitted'] // the book emphasises gold, then green, then blue
const visible = computed(() => ORDER.slice(0, Math.max(0, stage.value)))
const focus = computed(() => (stage.value >= 1 ? ORDER[stage.value - 1] : null))
const CAPTION = [
  'The circles are the training data. The bold curve is the true relationship (black in the book), which in real data we almost never know (Fig. 8.18).',
  'Gold: a straight line. It misses the curve: low complexity, high error on training and test data. Underfit (Fig. 8.19).',
  'Green: very wiggly. It follows the noise of the training points: lowest training error, but its test error rises again. Overfit (Fig. 8.20).',
  'Blue: captures the true relationship. It is chosen by cross-validation on the training points; its test error, checked once afterwards, is close to the lowest (Fig. 8.21).',
]
// left chart
const W = 470, H = 360, L = 40, B = 34, T = 10, R = 10
const x0 = 0, x1 = 100, y0 = 2, y1 = 12
const lx = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R)
const ly = (v: number) => H - B - ((Math.min(y1, Math.max(y0, v)) - y0) / (y1 - y0)) * (H - B - T)
const path = (ys: number[]) => props.data.grid.map((x, i) => `${i ? 'L' : 'M'}${lx(x).toFixed(1)},${ly(ys[i]).toFixed(1)}`).join('')
const curveOf = (c: number) => props.data.curves.find((k) => k.complexity === c)?.curve ?? []
// right chart (log complexity, like the book)
const cx0 = Math.log(2), cx1 = Math.log(25), my1 = computed(() => Math.min(3, Math.ceil(Math.max(...props.data.sweep.map((s) => s.test_mse)) * 2) / 2)) // like the book; higher values are clipped
const rx = (c: number) => L + ((Math.log(c) - cx0) / (cx1 - cx0)) * (W - L - R)
const ry = (v: number) => H - B - (v / my1.value) * (H - B - T)
const line = (k: 'train_mse' | 'test_mse') => props.data.sweep.map((s, i) => `${i ? 'L' : 'M'}${rx(s.complexity).toFixed(1)},${ry(s[k]).toFixed(1)}`).join('')
const yTicks = computed(() => Array.from({ length: my1.value * 2 + 1 }, (_, i) => i / 2))
const mid = computed(() => props.data.sweep.find((s) => s.complexity === 11) ?? props.data.sweep[Math.floor(props.data.sweep.length / 2)])
const cur = computed(() => (custom.value ? props.data.sweep.find((s) => s.complexity === custom.value) : null))
function advance(): boolean { if (stage.value < 3) { stage.value++; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="fc" data-testid="m-fitcurve">
    <div class="charts">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Training data, the true relationship and fitted models">
        <line :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" class="axis" /><line :x1="L" :x2="L" :y1="T" :y2="H - B" class="axis" />
        <text v-for="t in [0, 20, 40, 60, 80, 100]" :key="t" :x="lx(t)" :y="H - B + 16" text-anchor="middle" class="tick">{{ t }}</text>
        <text v-for="t in [2, 4, 6, 8, 10, 12]" :key="'y' + t" :x="L - 6" :y="ly(t) + 4" text-anchor="end" class="tick">{{ t }}</text>
        <text :x="(L + W) / 2" :y="H - 2" text-anchor="middle" class="ax">X</text>
        <circle v-for="(p, i) in data.train" :key="i" :cx="lx(p.x)" :cy="ly(p.y)" r="4.5" class="pt" />
        <path :d="path(data.truth)" class="truth" :style="{ strokeWidth: stage === 0 ? 4 : 2.2 }" />
        <path v-for="m in data.models" v-show="visible.includes(m.label)" :key="m.label" :d="path(m.curve)" class="model"
              :style="{ stroke: `rgb(var(--c-${TONE[m.label]}))`, strokeWidth: focus === m.label && !custom ? 4.5 : 2.4, opacity: custom ? 0.25 : focus === m.label ? 1 : 0.45 }" />
        <path v-if="custom" :d="path(curveOf(custom))" class="model" style="stroke: rgb(var(--c-accent)); stroke-width: 4" data-testid="fc-custom" />
      </svg>
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Training and test mean squared error against complexity">
        <line :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" class="axis" /><line :x1="L" :x2="L" :y1="T" :y2="H - B" class="axis" />
        <text v-for="t in [2, 5, 10, 20]" :key="t" :x="rx(t)" :y="H - B + 16" text-anchor="middle" class="tick">{{ t }}</text>
        <text v-for="t in yTicks" :key="'m' + t" :x="L - 6" :y="ry(t) + 4" text-anchor="end" class="tick">{{ t.toFixed(1) }}</text>
        <text :x="(L + W) / 2" :y="H - 2" text-anchor="middle" class="ax">complexity (number of parameters)</text>
        <line :x1="L" :x2="W - R" :y1="ry(data.irreducible_mse)" :y2="ry(data.irreducible_mse)" class="floor" />
        <text :x="L + 8" :y="ry(data.irreducible_mse) + 18" class="tick">noise: no model can beat this on new data</text>
        <clipPath id="fc-plot"><rect :x="L" :y="T" :width="W - L - R" :height="H - B - T" /></clipPath>
        <g clip-path="url(#fc-plot)">
          <path :d="line('train_mse')" class="ln" style="stroke: rgb(var(--c-compute))" />
          <path :d="line('test_mse')" class="ln" style="stroke: rgb(var(--c-warn))" />
        </g>
        <text :x="rx(mid.complexity)" :y="ry(mid.train_mse) + 20" text-anchor="middle" class="lg" style="fill: rgb(var(--c-compute))">training MSE</text>
        <text :x="rx(mid.complexity)" :y="ry(mid.test_mse) - 12" text-anchor="middle" class="lg" style="fill: rgb(var(--c-warn))">test MSE</text>
        <template v-for="m in data.models" :key="'s' + m.label">
          <g v-show="visible.includes(m.label)" :style="{ fill: `rgb(var(--c-${TONE[m.label]}))` }">
            <rect :x="rx(m.complexity) - 6" :y="ry(m.train_mse) - 6" width="12" height="12" class="sq" />
            <rect :x="rx(m.complexity) - 6" :y="ry(m.test_mse) - 6" width="12" height="12" class="sq" />
          </g>
        </template>
        <g v-if="cur" style="fill: rgb(var(--c-accent))">
          <circle :cx="rx(cur.complexity)" :cy="ry(cur.train_mse)" r="6" /><circle :cx="rx(cur.complexity)" :cy="ry(cur.test_mse)" r="6" />
        </g>
      </svg>
    </div>
    <div class="foot">
      <p class="cap" data-testid="fc-caption">{{ CAPTION[stage] }}</p>
      <div class="legend">
        <span v-for="m in data.models" :key="m.label" :class="{ dim: !visible.includes(m.label) }" :data-testid="`fc-${NAME[m.label]}`">
          <i :style="{ background: `rgb(var(--c-${TONE[m.label]}))` }" />{{ NAME[m.label] }} · {{ m.complexity }} parameters · train {{ m.train_mse.toFixed(2) }} · test {{ m.test_mse.toFixed(2) }}
        </span>
      </div>
      <label class="slider">
        <span>try any model: <b>{{ custom ?? '—' }}</b><template v-if="cur"> parameters · train {{ cur.train_mse.toFixed(2) }} · test <b data-testid="fc-custom-test">{{ cur.test_mse.toFixed(2) }}</b></template></span>
        <input type="range" min="2" max="25" step="1" :value="custom ?? data.best_complexity" data-testid="fc-slider" @input="custom = Number(($event.target as HTMLInputElement).value)" />
        <button v-if="custom" class="clear" @click="custom = null">back to the book's three</button>
      </label>
      <p class="src">Synthetic data (seed {{ data.seed }}, noise sd {{ data.noise_sd }}), shaped like DS4A Fig. 8.17, which the book adapts from ISLR · line, parabola and cubic splines fitted by the backend · blue chosen by {{ data.selection }} · test MSE on 2,000 new points</p>
    </div>
  </div>
</template>

<style scoped>
.fc { width: 100%; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 2vw; }
svg { width: 100%; max-height: 44vh; display: block; }
.axis { stroke: rgba(var(--c-dim), .5); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.pt { fill: none; stroke: rgb(var(--c-soft)); stroke-width: 1.3; }
.truth { fill: none; stroke: rgb(var(--c-strong)); transition: stroke-width .4s; }
.model { fill: none; transition: opacity .4s, stroke-width .4s; }
.floor { stroke: rgb(var(--c-dim)); stroke-dasharray: 5 5; }
.ln { fill: none; stroke-width: 2.6; }
.lg { font: 600 13px 'Space Grotesk', system-ui; }
.sq { stroke: rgb(var(--c-ground)); stroke-width: 1.5; }
.foot { margin-top: 8px; display: grid; gap: 8px; }
.cap { font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.45; min-height: 2.9em; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.legend span { display: inline-flex; align-items: center; gap: 6px; transition: opacity .4s; }
.legend span.dim { opacity: .3; }
.legend i { width: 18px; height: 4px; border-radius: 2px; }
.slider { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.slider b { color: rgb(var(--c-accent)); }
.slider input { flex: 1; min-width: 200px; max-width: 420px; accent-color: rgb(var(--c-accent)); }
.clear { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-data)); text-decoration: underline; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
