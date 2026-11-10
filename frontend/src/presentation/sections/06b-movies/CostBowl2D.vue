<script setup lang="ts">
/**
 * The cost surface J(θ₀, θ₁) seen from above (a stable 2D view of the 3D bowl): every cell is one possible line,
 * shaded by its cost; the descent path is the recorded θ of the gradient-descent frames up to `upto`. Surface, minimum
 * and path all come from the backend trace (standardized budget); this component only draws them.
 */
import { computed } from 'vue'
import type { LinRegTrace } from '../../../lessons/linreg-gd/types'

const props = defineProps<{ trace: LinRegTrace; upto: number }>()
const W = 420, H = 400, L = 50, R = 12, T = 12, B = 46
const sf = computed(() => props.trace.surface!)
const g0 = computed(() => sf.value.theta0), g1 = computed(() => sf.value.theta1)
const px = (v: number) => L + ((v - g0.value[0]) / (g0.value[g0.value.length - 1] - g0.value[0])) * (W - L - R)
const py = (v: number) => H - B - ((v - g1.value[0]) / (g1.value[g1.value.length - 1] - g1.value[0])) * (H - B - T)
const cells = computed(() => {
  const c = sf.value.cost, lo = sf.value.minimum.cost
  const hi = Math.max(...c.flat())
  const cw = (W - L - R) / g0.value.length, ch = (H - B - T) / g1.value.length
  return c.flatMap((row, i) => row.map((v, j) => ({ x: px(g0.value[i]) - cw / 2, y: py(g1.value[j]) - ch / 2, w: cw + 0.5, h: ch + 0.5, o: 0.04 + 0.86 * Math.sqrt((v - lo) / (hi - lo || 1)) }))) // ∝ distance from the minimum: rings read as a bowl
})
const inBox = (t: number[]) => t[0] >= g0.value[0] && t[0] <= g0.value[g0.value.length - 1] && t[1] >= g1.value[0] && t[1] <= g1.value[g1.value.length - 1]
const path = computed(() => props.trace.frames.slice(0, props.upto + 1).filter((f) => inBox(f.theta_std)).map((f) => `${px(f.theta_std[0]).toFixed(1)},${py(f.theta_std[1]).toFixed(1)}`).join(' '))
const cur = computed(() => props.trace.frames[Math.min(props.upto, props.trace.frames.length - 1)])
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="bowl" role="img" aria-label="Cost of every possible line, seen from above, with the gradient-descent path" data-testid="movie-bowl">
    <rect v-for="(c, k) in cells" :key="k" :x="c.x" :y="c.y" :width="c.w" :height="c.h" :style="{ fill: 'rgb(var(--c-coral))', opacity: c.o }" />
    <polyline :points="path" class="path" />
    <circle :cx="px(sf.minimum.theta0)" :cy="py(sf.minimum.theta1)" r="8" class="min" />
    <circle v-if="inBox(cur.theta_std)" :cx="px(cur.theta_std[0])" :cy="py(cur.theta_std[1])" r="8" class="now" />
    <text :x="(L + W) / 2" :y="H - 8" text-anchor="middle" class="ax">θ₀ intercept (standardized)</text>
    <text :x="16" :y="(T + H - B) / 2" text-anchor="middle" class="ax" :transform="`rotate(-90 16 ${(T + H - B) / 2})`">θ₁ slope (standardized)</text>
  </svg>
</template>

<style scoped>
.bowl { width: 100%; max-height: 52vh; display: block; }
.path { fill: none; stroke: rgb(var(--c-data)); stroke-width: 3; }
.min { fill: none; stroke: rgb(var(--c-human)); stroke-width: 3; stroke-dasharray: 4 3; }
.now { fill: rgb(var(--c-data)); stroke: rgb(var(--c-strong)); stroke-width: 2.5; }
.ax { font: 600 14px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
@media (max-height: 1000px) { .bowl { max-height: 40vh; } }
</style>
