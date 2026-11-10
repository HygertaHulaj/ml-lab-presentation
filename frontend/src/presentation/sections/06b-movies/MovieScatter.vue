<script setup lang="ts">
/**
 * Budget against observed rating for the complete movies of Shah's Problem 8.4. Optional: a fitted line (from a recorded
 * gradient-descent frame or the least-squares reference), the selected movie, and residuals (one or all). Every value
 * comes from the backend trace; this component only maps it to pixels.
 */
import { computed } from 'vue'
import type { LinRegTrace } from '../../../lessons/linreg-gd/types'

const props = withDefaults(defineProps<{
  trace: LinRegTrace
  line?: { intercept: number; slope: number; tone: 'data' | 'human' } | null
  reference?: { intercept: number; slope: number } | null
  selected?: number | null
  examples?: number[]
  residuals?: 'none' | 'selected' | 'all'
}>(), { line: null, reference: null, selected: null, examples: () => [], residuals: 'none' })

const W = 760, H = 400, L = 64, R = 18, T = 16, B = 52
const xs = computed(() => props.trace.points.x[0])
const ys = computed(() => props.trace.points.y)
const xMax = computed(() => Math.max(...xs.value) * 1.04)
const yMin = computed(() => Math.floor(Math.min(...ys.value)) - 0.5)
const yMax = computed(() => Math.ceil(Math.max(...ys.value)) + 0.5)
const px = (v: number) => L + (v / xMax.value) * (W - L - R)
const py = (v: number) => H - B - ((Math.min(yMax.value, Math.max(yMin.value, v)) - yMin.value) / (yMax.value - yMin.value)) * (H - B - T)
const fitted = computed(() => props.trace.ols.fitted)
const seg = (l: { intercept: number; slope: number }) => ({ x1: px(0), y1: py(l.intercept), x2: px(xMax.value), y2: py(l.intercept + l.slope * xMax.value) })
const xTicks = computed(() => { const step = xMax.value > 2e8 ? 5e7 : 2.5e7; return Array.from({ length: Math.floor(xMax.value / step) + 1 }, (_, i) => i * step) })
const yTicks = computed(() => { const a = Math.ceil(yMin.value), b = Math.floor(yMax.value); return Array.from({ length: b - a + 1 }, (_, i) => a + i) })
const showRes = (i: number) => props.residuals === 'all' || (props.residuals === 'selected' && i === props.selected)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="ms" role="img" :aria-label="`Budget against observed rating for ${trace.n} movies`" data-testid="movie-scatter">
    <g v-for="t in yTicks" :key="'y' + t"><line :x1="L" :x2="W - R" :y1="py(t)" :y2="py(t)" class="grid" /><text :x="L - 8" :y="py(t) + 5" text-anchor="end" class="tick">{{ t }}</text></g>
    <text v-for="t in xTicks" :key="'x' + t" :x="px(t)" :y="H - B + 22" text-anchor="middle" class="tick">${{ t / 1e6 }}M</text>
    <text :x="(L + W) / 2" :y="H - 6" text-anchor="middle" class="ax">budget</text>
    <text :x="14" :y="T + 10" class="ax">rating</text>
    <g v-for="(x, i) in xs" :key="'r' + i">
      <line v-if="showRes(i)" :x1="px(x)" :x2="px(x)" :y1="py(ys[i])" :y2="py(fitted[i])" class="res" :class="{ strong: i === selected }" />
    </g>
    <line v-if="reference" v-bind="seg(reference)" class="ref" />
    <line v-if="line" v-bind="seg(line)" class="fit" :style="{ stroke: `rgb(var(--c-${line.tone}))` }" />
    <circle v-for="(x, i) in xs" :key="'p' + i" :cx="px(x)" :cy="py(ys[i])" :r="examples.includes(i) ? 7 : 4" class="pt" :class="{ ex: examples.includes(i), sel: i === selected }" />
    <circle v-if="selected !== null && residuals !== 'none'" :cx="px(xs[selected])" :cy="py(fitted[selected])" r="6" class="pred" />
  </svg>
</template>

<style scoped>
.ms { width: 100%; max-height: 52vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 14px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 15px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.pt { fill: rgba(var(--c-data), .55); }
.pt.ex { fill: rgb(var(--c-data)); stroke: rgb(var(--c-ground)); stroke-width: 2; }
.pt.sel { fill: rgb(var(--c-accent)); stroke: rgb(var(--c-strong)); stroke-width: 2.5; }
.res { stroke: rgba(var(--c-warn), .55); stroke-width: 1.5; }
.res.strong { stroke: rgb(var(--c-warn)); stroke-width: 3.5; }
.fit { stroke-width: 3.5; }
.ref { stroke: rgb(var(--c-human)); stroke-width: 2.5; stroke-dasharray: 8 6; }
.pred { fill: none; stroke: rgb(var(--c-human)); stroke-width: 3; }
</style>
