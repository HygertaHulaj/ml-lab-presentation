<script setup lang="ts">
/** Volume, measured: test accuracy of the digit model against the number of training images (backend). */
import { computed } from 'vue'
import type { DataQuality } from '../../api'

const props = defineProps<{ data: DataQuality['volume']; nTest: number }>()
defineExpose({ advance: () => false })
const W = 520, H = 300, L = 50, B = 40, T = 14, R = 20
const ns = computed(() => props.data.map((p) => p.n))
const x = (n: number) => L + (Math.log(n) - Math.log(ns.value[0])) / (Math.log(ns.value[ns.value.length - 1]) - Math.log(ns.value[0])) * (W - L - R)
const y = (a: number) => H - B - ((a - 0.4) / 0.6) * (H - B - T)
const d = computed(() => props.data.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.accuracy).toFixed(1)}`).join(''))
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
</script>

<template>
  <div class="vd" data-testid="m-volume">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Test accuracy against number of training images">
      <g v-for="t in [0.4, 0.6, 0.8, 1]" :key="t">
        <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" class="grid" /><text :x="L - 6" :y="y(t) + 4" text-anchor="end" class="tick">{{ t * 100 }} %</text>
      </g>
      <text v-for="n in ns" :key="n" :x="x(n)" :y="H - B + 16" text-anchor="middle" class="tick">{{ n }}</text>
      <text :x="(L + W) / 2" :y="H - 4" text-anchor="middle" class="ax">training images (log scale)</text>
      <path :d="d" class="ln" />
      <g v-for="p in data" :key="'p' + p.n">
        <circle :cx="x(p.n)" :cy="y(p.accuracy)" r="5" class="pt" />
        <text :x="x(p.n)" :y="y(p.accuracy) - 10" text-anchor="middle" class="lab">{{ pct(p.accuracy) }}</text>
      </g>
    </svg>
    <p class="src">Digits model (logistic regression) tested on {{ nTest }} unseen images · computed by the backend · the gain flattens: volume helps most when data are scarce</p>
  </div>
</template>

<style scoped>
svg { width: 100%; max-height: 44vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.ln { fill: none; stroke: rgb(var(--c-compute)); stroke-width: 3; }
.pt { fill: rgb(var(--c-compute)); stroke: rgb(var(--c-ground)); stroke-width: 2; }
.lab { font: 600 12px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
