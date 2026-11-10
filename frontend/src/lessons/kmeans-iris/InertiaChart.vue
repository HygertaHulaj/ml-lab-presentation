<script setup lang="ts">
import { computed } from 'vue'

/** Inertia per completed iteration (values from the trace). Grows as the timeline plays. */
const props = defineProps<{ series: { iteration: number; inertia: number }[]; total: number }>()
const W = 260, H = 96, P = 18
const pts = computed(() => {
  if (!props.series.length) return []
  const max = Math.max(...props.series.map((s) => s.inertia)), min = Math.min(...props.series.map((s) => s.inertia))
  const span = max - min || 1
  const n = Math.max(2, props.total)
  return props.series.map((s, i) => ({ x: P + (i / (n - 1)) * (W - 2 * P), y: P + (1 - (s.inertia - min) / span) * (H - 2 * P), ...s }))
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" role="img" :aria-label="`Inertia over ${series.length} iterations`">
    <line :x1="P" :y1="H - P" :x2="W - P" :y2="H - P" stroke="#334155" />
    <polyline v-if="pts.length > 1" :points="pts.map((p) => `${p.x},${p.y}`).join(' ')" fill="none" stroke="#22d3ee" stroke-width="2" />
    <g v-for="p in pts" :key="p.iteration">
      <circle :cx="p.x" :cy="p.y" r="3.5" fill="#22d3ee" />
    </g>
    <text v-if="pts.length" :x="pts[pts.length - 1].x" :y="pts[pts.length - 1].y - 7" fill="#e2e8f0" font-size="10" text-anchor="end">{{ pts[pts.length - 1].inertia.toFixed(2) }}</text>
    <text :x="P" :y="H - 4" fill="#64748b" font-size="9">iteration →</text>
    <text :x="P" :y="11" fill="#64748b" font-size="9">inertia J</text>
  </svg>
</template>
