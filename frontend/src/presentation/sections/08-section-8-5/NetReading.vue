<script setup lang="ts">
/**
 * One digit passing through the trained network: the 8×8 input, the real activations of both hidden layers
 * (brighter = more active; ReLU, so inactive units are 0) and the 10 output probabilities. All values come from the
 * backend's forward pass over the stored weights. `reach` reveals the layers one by one (0 = input only, 3 = output).
 */
import { computed } from 'vue'
import type { DigitReading } from '../../api'

const props = withDefaults(defineProps<{ reading: DigitReading; architecture: number[]; reach?: number; shadingMax?: number }>(), { reach: 3, shadingMax: 16 })
const W = 820, H = 380
const IMG = { x: 10, y: 70, s: 200 }
const colX = [300, 470, 640]
const colY = (n: number, i: number) => H / 2 + (i - (n - 1) / 2) * Math.min(11, (H - 30) / n)
const hidden = computed(() => props.reading.layers.map((acts, l) => {
  const max = Math.max(...acts, 1e-9)
  return acts.map((a, i) => ({ x: colX[l], y: colY(acts.length, i), a: a / max }))
}))
const out = computed(() => props.reading.probabilities.map((p, i) => ({ x: colX[2], y: 34 + i * 33, p, d: i })))
const best = computed(() => props.reading.prediction)
const edges = computed(() => {
  const e: { x1: number; y1: number; x2: number; y2: number; o: number; on: boolean }[] = []
  const [h1, h2] = hidden.value
  h1.forEach((a) => h2.forEach((b) => e.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, o: 0.04 + 0.22 * a.a * b.a, on: props.reach >= 2 })))
  h2.forEach((a) => out.value.forEach((b) => e.push({ x1: a.x, y1: a.y, x2: b.x - 14, y2: b.y, o: 0.04 + 0.3 * a.a * b.p, on: props.reach >= 3 })))
  return e
})
const fan = computed(() => hidden.value[0].map((p) => ({ x2: p.x, y2: p.y, o: 0.05 + 0.25 * p.a })))
const shade = (v: number) => `rgba(var(--c-strong), ${(v / props.shadingMax).toFixed(3)})`
const active = computed(() => props.reading.layers.map((l) => l.filter((v) => v > 0).length))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="nr" role="img" :aria-label="`The network reads a ${reading.label ?? 'drawn'} digit and predicts ${best}`">
    <rect :x="IMG.x - 2" :y="IMG.y - 2" :width="IMG.s + 4" :height="IMG.s + 4" rx="8" style="fill: rgb(var(--c-ground2)); stroke: rgba(var(--c-dim), .4)" />
    <rect v-for="(v, k) in reading.pixels" :key="k" :x="IMG.x + (k % 8) * (IMG.s / 8)" :y="IMG.y + Math.floor(k / 8) * (IMG.s / 8)" :width="IMG.s / 8" :height="IMG.s / 8" :style="{ fill: shade(v) }" />
    <text :x="IMG.x + IMG.s / 2" :y="IMG.y + IMG.s + 24" text-anchor="middle" class="cap">input: {{ architecture[0] }} shading values</text>
    <g v-if="reach >= 1">
      <line v-for="(f, i) in fan" :key="'f' + i" :x1="IMG.x + IMG.s + 4" :y1="IMG.y + IMG.s / 2" :x2="f.x2" :y2="f.y2" :style="{ stroke: 'rgb(var(--c-ok))', strokeOpacity: f.o }" />
    </g>
    <line v-for="(e, i) in edges" v-show="e.on" :key="i" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" :style="{ stroke: 'rgb(var(--c-compute))', strokeOpacity: e.o }" />
    <g v-for="(layer, l) in hidden" v-show="reach >= l + 1" :key="'h' + l">
      <circle v-for="(n, i) in layer" :key="i" :cx="n.x" :cy="n.y" r="5" :style="{ fill: `rgba(var(--c-compute), ${(0.12 + 0.88 * n.a).toFixed(3)})`, stroke: 'rgb(var(--c-compute))' }" class="unit" />
      <text :x="layer[0].x" :y="H - 4" text-anchor="middle" class="cap">hidden {{ l + 1 }}: {{ active[l] }} of {{ architecture[l + 1] }} active</text>
    </g>
    <g v-show="reach >= 3">
      <g v-for="o in out" :key="'o' + o.d">
        <circle :cx="o.x" :cy="o.y" r="12" :style="{ fill: o.d === best ? 'rgb(var(--c-warn))' : `rgba(var(--c-warn), ${(0.1 + 0.9 * o.p).toFixed(3)})`, stroke: 'rgb(var(--c-warn))' }" />
        <text :x="o.x" :y="o.y + 5" text-anchor="middle" class="dg" :style="{ fill: o.d === best ? 'rgb(var(--c-ink))' : 'rgb(var(--c-text))' }">{{ o.d }}</text>
        <rect :x="o.x + 22" :y="o.y - 6" :width="Math.max(1, o.p * 110)" height="12" rx="4" :style="{ fill: o.d === best ? 'rgb(var(--c-accent))' : 'rgba(var(--c-dim), .5)' }" />
        <text :x="o.x + 30 + o.p * 110" :y="o.y + 4" class="pv">{{ (o.p * 100).toFixed(1) }} %</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.nr { width: 100%; max-height: 50vh; display: block; }
.cap { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.unit { stroke-width: 1; }
.dg { font: 700 13px 'Space Grotesk', system-ui; }
.pv { font: 600 12px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
</style>
