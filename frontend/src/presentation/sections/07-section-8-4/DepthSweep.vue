<script setup lang="ts">
/**
 * DS4A p. 387 on real data: the car seat tree grown deeper and deeper on the 319 training stores. Training accuracy
 * keeps rising to 100 %; accuracy on the 81 test stores does not. Error metrics and accuracy-type metrics move in
 * opposite directions. The depth is CHOSEN by cross-validation inside the training stores; the test stores are only the
 * final check. → highlights a simple tree, the cross-validated choice and a fully grown tree. All values from the backend.
 */
import { computed, ref } from 'vue'
import type { Evaluation } from '../../api'
import { FIT_RULES } from './content'

const props = defineProps<{ rows: Evaluation['depth_sweep']; selection: Evaluation['depth_selection'] }>()
const stage = ref(0)
const W = 620, H = 360, L = 50, B = 40, T = 14, R = 16
const n = computed(() => props.rows.length)
const x = (d: number) => L + ((d - 1) / (n.value - 1)) * (W - L - R)
const y0 = 0.6
const y = (v: number) => H - B - ((v - y0) / (1 - y0)) * (H - B - T)
const line = (k: 'train_accuracy' | 'cv_accuracy' | 'test_accuracy') => props.rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.depth).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')
const best = computed(() => props.rows.find((r) => r.depth === props.selection.selected_depth) ?? props.rows[0])
const full = computed(() => props.rows.find((r) => r.train_accuracy === 1) ?? props.rows[props.rows.length - 1])
const marks = computed(() => [
  { r: props.rows[0], tone: 'human', t: 'simple' },
  { r: best.value, tone: 'ok', t: 'chosen by cross-validation' },
  { r: full.value, tone: 'warn', t: 'memorised training data' },
])
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
function advance(): boolean { if (stage.value < 3) { stage.value++; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="ds" data-testid="m-depth">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Training and test accuracy of car seat trees by depth">
      <g v-for="t in [0.6, 0.7, 0.8, 0.9, 1]" :key="t">
        <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" class="grid" />
        <text :x="L - 6" :y="y(t) + 4" text-anchor="end" class="tick">{{ t * 100 }} %</text>
      </g>
      <text v-for="r in rows" :key="r.depth" :x="x(r.depth)" :y="H - B + 16" text-anchor="middle" class="tick">{{ r.depth }}</text>
      <text :x="(L + W) / 2" :y="H - 4" text-anchor="middle" class="ax">max depth of the tree (more complex →)</text>
      <path :d="line('train_accuracy')" class="ln" style="stroke: rgb(var(--c-compute))" />
      <path :d="line('cv_accuracy')" class="ln cv" style="stroke: rgb(var(--c-ok))" />
      <path :d="line('test_accuracy')" class="ln" style="stroke: rgb(var(--c-warn))" />
      <text :x="x(2)" :y="y(rows[1].train_accuracy) - 12" class="lg" style="fill: rgb(var(--c-compute))">training stores (319)</text>
      <text :x="x(rows.length) - 4" :y="y(rows[rows.length - 1].test_accuracy) + 22" text-anchor="end" class="lg" style="fill: rgb(var(--c-warn))">test stores (81) · final check</text>
      <text :x="x(Math.min(5, rows.length)) + 8" :y="y(Math.max(...rows.map((r) => r.cv_accuracy))) - 16" class="lg" style="fill: rgb(var(--c-ok))">cross-validation (inside training)</text>
      <g v-for="(m, i) in marks" v-show="stage > i" :key="m.t" :style="{ color: `rgb(var(--c-${m.tone}))` }">
        <line :x1="x(m.r.depth)" :x2="x(m.r.depth)" :y1="T" :y2="H - B" class="mk" />
        <circle :cx="x(m.r.depth)" :cy="y(m.r.train_accuracy)" r="6" class="dot" /><circle :cx="x(m.r.depth)" :cy="y(m.r.test_accuracy)" r="6" class="dot" />
      </g>
      <circle v-for="r in rows" :key="'a' + r.depth" :cx="x(r.depth)" :cy="y(r.train_accuracy)" r="3" style="fill: rgb(var(--c-compute))" />
      <circle v-for="r in rows" :key="'b' + r.depth" :cx="x(r.depth)" :cy="y(r.test_accuracy)" r="3" style="fill: rgb(var(--c-warn))" />
    </svg>
    <div class="side">
      <div v-for="(m, i) in marks" :key="m.t" class="pick" :class="{ on: stage > i }" :style="{ borderColor: `rgb(var(--c-${m.tone}))` }" :data-testid="`ds-mark-${i}`">
        <strong>depth {{ m.r.depth }} · {{ m.t }}</strong>
        <span>train {{ pct(m.r.train_accuracy) }} · cross-val {{ pct(m.r.cv_accuracy) }} · test {{ pct(m.r.test_accuracy) }}</span>
      </div>
      <div class="rules">
        <p v-for="r in FIT_RULES" :key="r.k"><b :style="{ color: `rgb(var(--c-${r.tone}))` }">{{ r.k }}</b>: {{ r.v }}.</p>
      </div>
      <p class="src">Official DS4A car seat split · all ten explanatory variables · computed by the backend. The depth is chosen by {{ selection.criterion }}; the test stores are used once, as the final check, never to choose.</p>
    </div>
  </div>
</template>

<style scoped>
.ds { display: grid; grid-template-columns: 1.5fr 1fr; gap: 3vw; width: 100%; align-items: center; }
svg { width: 100%; max-height: 52vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.ln { fill: none; stroke-width: 2.6; }
.ln.cv { stroke-dasharray: 7 5; }
.lg { font: 600 13px 'Space Grotesk', system-ui; }
.mk { stroke: currentColor; stroke-dasharray: 4 4; stroke-width: 1.5; }
.dot { fill: currentColor; stroke: rgb(var(--c-ground)); stroke-width: 2; }
.side { display: flex; flex-direction: column; gap: 10px; }
.pick { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border-radius: 12px; border-left: 3px solid; background: rgba(var(--c-surface), .78); opacity: .15; transition: opacity .4s; }
.pick.on { opacity: 1; }
.pick strong { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.pick span { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.rules { margin-top: 6px; display: grid; gap: 4px; font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.src { font-size: 12px; color: rgb(var(--c-faint)); line-height: 1.4; }
</style>
