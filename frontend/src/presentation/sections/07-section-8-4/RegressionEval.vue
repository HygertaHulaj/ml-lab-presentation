<script setup lang="ts">
/**
 * DS4A p. 384: a regression model predicts numbers, so we cannot check for equality; we measure the size of the
 * differences instead. A regression tree predicts car seat `sales` for the 81 test stores (backend). → shows the
 * points, then each residual, then MSE and R² (test vs training, and against always predicting the mean).
 */
import { computed, ref } from 'vue'
import type { Evaluation } from '../../api'
import { DEFS } from './content'

const props = defineProps<{ data: Evaluation['regression'] }>()
const stage = ref(0)
const W = 520, H = 420, L = 56, B = 50, T = 14, R = 14
const hi = computed(() => Math.ceil(Math.max(...props.data.points.flatMap((p) => [p.actual, p.predicted])) + 0.5))
const sx = (v: number) => L + (v / hi.value) * (W - L - R)
const sy = (v: number) => H - B - (v / hi.value) * (H - B - T)
const ticks = computed(() => Array.from({ length: Math.floor(hi.value / 4) + 1 }, (_, i) => i * 4))
function advance(): boolean { if (stage.value < 2) { stage.value++; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="re" data-testid="m-regression">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Predicted versus actual car seat sales for the 81 test stores">
      <g v-for="t in ticks" :key="t">
        <line :x1="sx(t)" :x2="sx(t)" :y1="T" :y2="H - B" class="grid" /><line :x1="L" :x2="W - R" :y1="sy(t)" :y2="sy(t)" class="grid" />
        <text :x="sx(t)" :y="H - B + 18" text-anchor="middle" class="tick">{{ t }}</text>
        <text :x="L - 8" :y="sy(t) + 4" text-anchor="end" class="tick">{{ t }}</text>
      </g>
      <text :x="(L + W) / 2" :y="H - 8" text-anchor="middle" class="ax">predicted sales (thousand units)</text>
      <text :x="14" :y="(H - B) / 2" text-anchor="middle" class="ax" :transform="`rotate(-90 14 ${(H - B) / 2})`">actual sales</text>
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(hi)" :y2="sy(hi)" class="diag" />
      <text :x="sx(hi) - 4" :y="sy(hi) + 16" text-anchor="end" class="tick">perfect: predicted = actual</text>
      <g v-if="stage >= 1">
        <line v-for="(p, i) in data.points" :key="'r' + i" :x1="sx(p.predicted)" :x2="sx(p.predicted)" :y1="sy(p.actual)" :y2="sy(p.predicted)" class="res" :style="{ animationDelay: i * 12 + 'ms' }" />
      </g>
      <circle v-for="(p, i) in data.points" :key="i" :cx="sx(p.predicted)" :cy="sy(p.actual)" r="5" class="pt" />
    </svg>
    <div class="side">
      <p class="lead">A tree predicts one number per leaf, so its predictions form columns. The <b>residual</b> is how far each store is from its prediction.</p>
      <div class="cards" :class="{ hide: stage < 2 }">
        <div class="card"><span>{{ DEFS.mse }}</span><b data-testid="re-mse">{{ data.test.mse.toFixed(2) }}</b><small>on the 81 test stores · training: {{ data.train.mse.toFixed(2) }} · always predicting the mean: {{ data.baseline_mse.toFixed(2) }}</small></div>
        <div class="card"><span>{{ DEFS.r2 }}</span><b data-testid="re-r2">{{ data.test.r2.toFixed(2) }}</b><small>the tree explains about {{ Math.round(data.test.r2 * 100) }} % of the variation in test sales · training: {{ data.train.r2.toFixed(2) }}</small></div>
      </div>
      <p class="src">Regression tree on <code>sales</code> (max depth {{ data.max_depth }}, min n {{ data.min_n }}), official DS4A split · MSE in (thousand units)² · computed by the backend</p>
    </div>
  </div>
</template>

<style scoped>
.re { display: grid; grid-template-columns: minmax(0, 1.1fr) 1fr; gap: 3vw; width: 100%; align-items: center; }
svg { width: 100%; max-height: 54vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.diag { stroke: rgb(var(--c-accent)); stroke-width: 2; stroke-dasharray: 7 5; }
.pt { fill: rgb(var(--c-data)); fill-opacity: .85; stroke: rgb(var(--c-ground)); stroke-width: 1; }
.res { stroke: rgb(var(--c-warn)); stroke-width: 1.6; stroke-opacity: .75; animation: grow .5s ease both; }
@keyframes grow { from { stroke-opacity: 0; } }
.lead { font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.5; }
.lead b { color: rgb(var(--c-warn)); }
.cards { display: grid; gap: 12px; margin-top: 16px; transition: opacity .5s; }
.cards.hide { opacity: 0; }
.card { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 14px 16px; border-radius: 14px; background: rgba(var(--c-surface), .78); border-left: 3px solid rgb(var(--c-accent)); }
.card span { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-text)); line-height: 1.4; }
.card b { grid-row: span 2; align-self: center; font: 700 clamp(28px, 2.6vw, 44px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.card small { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
code { font-family: 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-data-soft)); }
@media (prefers-reduced-motion: reduce) { .res { animation: none; } }
</style>
