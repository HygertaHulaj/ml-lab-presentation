<script setup lang="ts">
/** Gradient-descent cost J against iteration (log scale), from the backend's recorded history; `upTo` (0..1) draws it. */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ history: { iteration: number; cost: number }[]; upTo?: number; label?: string }>(), { upTo: 1, label: 'cost J (log scale)' })
const W = 520, H = 300, L = 70, B = 42, T = 14, R = 16
const it = computed(() => props.history.map((h) => h.iteration))
const lc = computed(() => props.history.map((h) => Math.log10(Math.max(1e-12, h.cost))))
const x = (v: number) => L + ((v - it.value[0]) / Math.max(1, it.value[it.value.length - 1] - it.value[0])) * (W - L - R)
const lo = computed(() => Math.floor(Math.min(...lc.value))), hi = computed(() => Math.ceil(Math.max(...lc.value)))
const y = (v: number) => H - B - ((v - lo.value) / Math.max(1e-9, hi.value - lo.value)) * (H - B - T)
const n = computed(() => Math.max(1, Math.round(props.upTo * props.history.length)))
const d = computed(() => props.history.slice(0, n.value).map((h, i) => `${i ? 'L' : 'M'}${x(h.iteration).toFixed(1)},${y(lc.value[i]).toFixed(1)}`).join(''))
const last = computed(() => props.history[n.value - 1])
const fmt = (v: number) => (v >= 1000 ? v.toExponential(2) : v.toFixed(v < 1 ? 4 : 2))
</script>

<template>
  <div class="cc">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Cost falling as gradient descent iterates">
      <g v-for="e in Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)" :key="e">
        <line :x1="L" :x2="W - R" :y1="y(e)" :y2="y(e)" class="grid" /><text :x="L - 6" :y="y(e) + 4" text-anchor="end" class="tick">10^{{ e }}</text>
      </g>
      <text :x="(L + W) / 2" :y="H - 6" text-anchor="middle" class="ax">iteration</text>
      <text :x="14" :y="(H - B) / 2" text-anchor="middle" class="ax" :transform="`rotate(-90 14 ${(H - B) / 2})`">{{ label }}</text>
      <text :x="L" :y="H - B + 16" class="tick">{{ it[0] }}</text><text :x="W - R" :y="H - B + 16" text-anchor="end" class="tick">{{ it[it.length - 1] }}</text>
      <path :d="d" class="ln" />
      <circle v-if="last" :cx="x(last.iteration)" :cy="y(lc[n - 1])" r="5" class="dot" />
    </svg>
    <p v-if="last" class="now" data-testid="cost-now">iteration {{ last.iteration }} · J = {{ fmt(last.cost) }}</p>
  </div>
</template>

<style scoped>
svg { width: 100%; max-height: 40vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.ln { fill: none; stroke: rgb(var(--c-warn)); stroke-width: 2.8; }
.dot { fill: rgb(var(--c-warn)); stroke: rgb(var(--c-ground)); stroke-width: 2; }
.now { text-align: center; font: 600 14px 'JetBrains Mono', monospace; color: rgb(var(--c-soft)); }
</style>
