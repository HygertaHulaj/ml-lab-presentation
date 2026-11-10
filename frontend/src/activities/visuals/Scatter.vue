<script setup lang="ts">
/**
 * Scatter plot with an optional line (given by two end points from the backend) and labelled points.
 * `reveal` (0..1) shows the first share of points, so a scene can "pour" the data in; `lineP` (0..1) draws the line.
 */
import { computed } from 'vue'

export interface Pt { x: number; y: number; label?: string; hi?: boolean; /** where the label sits around its point (default above right) */ at?: 'ne' | 'e' | 'nw' | 'sw' }
const DX = { ne: 8, e: 10, nw: -8, sw: -8 }, DY = { ne: -6, e: 4, nw: -6, sw: 16 }
const props = withDefaults(defineProps<{
  points: Pt[]; line?: { x: number[]; y: number[] } | null; reveal?: number; lineP?: number
  xLabel: string; yLabel: string; xFmt?: (v: number) => string; yFmt?: (v: number) => string; diag?: boolean
}>(), { line: null, reveal: 1, lineP: 1, xFmt: (v: number) => String(Math.round(v)), yFmt: (v: number) => String(Math.round(v)), diag: false })

const W = 620, H = 380, L = 64, B = 46, T = 14, R = 18
const ext = (vs: number[]) => { const lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.06 || 1; return [lo - pad, hi + pad] }
const xs = computed(() => ext([...props.points.map((p) => p.x), ...(props.line?.x ?? [])]))
const ys = computed(() => ext([...props.points.map((p) => p.y), ...(props.line?.y ?? []), ...(props.diag ? props.points.map((p) => p.x) : [])]))
const sx = (v: number) => L + ((v - xs.value[0]) / (xs.value[1] - xs.value[0])) * (W - L - R)
const sy = (v: number) => H - B - ((v - ys.value[0]) / (ys.value[1] - ys.value[0])) * (H - B - T)
const ticks = (r: number[]) => Array.from({ length: 5 }, (_, i) => r[0] + ((r[1] - r[0]) * (i + 0.5)) / 5)
const shown = computed(() => Math.round(props.reveal * props.points.length))
const seg = computed(() => {
  if (!props.line) return null
  const [x0, x1] = props.line.x, [y0, y1] = props.line.y
  const k = Math.max(0, Math.min(1, props.lineP))
  return { x1: sx(x0), y1: sy(y0), x2: sx(x0 + (x1 - x0) * k), y2: sy(y0 + (y1 - y0) * k) }
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="sc" role="img" :aria-label="`${yLabel} against ${xLabel}`">
    <g v-for="t in ticks(xs)" :key="'x' + t"><line :x1="sx(t)" :x2="sx(t)" :y1="T" :y2="H - B" class="grid" /><text :x="sx(t)" :y="H - B + 16" text-anchor="middle" class="tick">{{ xFmt(t) }}</text></g>
    <g v-for="t in ticks(ys)" :key="'y' + t"><line :x1="L" :x2="W - R" :y1="sy(t)" :y2="sy(t)" class="grid" /><text :x="L - 6" :y="sy(t) + 4" text-anchor="end" class="tick">{{ yFmt(t) }}</text></g>
    <text :x="(L + W) / 2" :y="H - 6" text-anchor="middle" class="ax">{{ xLabel }}</text>
    <text :x="14" :y="(H - B) / 2" text-anchor="middle" class="ax" :transform="`rotate(-90 14 ${(H - B) / 2})`">{{ yLabel }}</text>
    <line v-if="diag" :x1="sx(Math.max(xs[0], ys[0]))" :y1="sy(Math.max(xs[0], ys[0]))" :x2="sx(Math.min(xs[1], ys[1]))" :y2="sy(Math.min(xs[1], ys[1]))" class="diag" />
    <line v-if="seg" v-bind="seg" class="fit" />
    <g v-for="(p, i) in points" v-show="i < shown" :key="i">
      <circle :cx="sx(p.x)" :cy="sy(p.y)" :r="p.hi ? 6 : 4.5" class="pt" :class="{ hi: p.hi }" />
      <text v-if="p.label" :x="sx(p.x) + DX[p.at ?? 'ne']" :y="sy(p.y) + DY[p.at ?? 'ne']" :text-anchor="(p.at ?? 'ne').endsWith('w') ? 'end' : 'start'" class="lab">{{ p.label }}</text>
    </g>
  </svg>
</template>

<style scoped>
.sc { width: 100%; max-height: 50vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.pt { fill: rgb(var(--c-data)); fill-opacity: .8; stroke: rgb(var(--c-ground)); stroke-width: 1; }
.pt.hi { fill: rgb(var(--c-human)); fill-opacity: 1; }
.lab { font: 600 11px 'Inter', system-ui; fill: rgb(var(--c-soft)); }
.fit { stroke: rgb(var(--c-accent)); stroke-width: 3; stroke-linecap: round; }
.diag { stroke: rgba(var(--c-dim), .6); stroke-dasharray: 6 5; }
</style>
