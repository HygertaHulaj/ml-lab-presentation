<script setup lang="ts">
/**
 * Shah Hands-On Problem 8.2 (p. 232), Airline Costs: the 31 airlines pour in (flight length vs customers served), the
 * model-1 line appears (daily flight time held at its mean), the coefficient table, then model 2 (customers vs total
 * assets) with the largest carriers labelled, then the insight. All values from the backend solver.
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import Scatter, { type Pt } from '../visuals/Scatter.vue'
import CoefTable from '../visuals/CoefTable.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type M = { n: number; r2: number; adj_r2: number; F: number; coefficients: { term: string; estimate: number; std_error: number; t: number; p: number }[] }
const s = computed(() => props.solve as unknown as { model_1: M; model_2: M; airlines: string[]; data: Record<string, number[]>; lines: Record<string, { x: number[]; y: number[]; daily_time_held_at?: number }> })
const big = computed(() => {
  const a = s.value.data.total_assets_100k
  return new Set([...a.map((v, i) => [v, i] as const)].sort((p, q) => q[0] - p[0]).slice(0, 4).map(([, i]) => i))
})
const ptsLen = computed<Pt[]>(() => s.value.data.flight_length_miles.map((x, i) => ({ x, y: s.value.data.customers_served_1000s[i] })))
const rank = computed(() => [...big.value].sort((a, b) => s.value.data.total_assets_100k[b] - s.value.data.total_assets_100k[a]))
const ptsAssets = computed<Pt[]>(() => s.value.data.customers_served_1000s.map((x, i) => ({ x, y: s.value.data.total_assets_100k[i], hi: big.value.has(i), label: big.value.has(i) ? s.value.airlines[i] : undefined, at: (['ne', 'e', 'nw', 'sw'] as const)[Math.max(0, rank.value.indexOf(i))] })))
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const insight = computed(() => String(props.solve.answers[2]?.answer ?? '').split(/(?<=\.)\s|(?<=;)\s/))
</script>

<template>
  <div class="h2" data-testid="v-hop82">
    <div v-if="scene === 'intro'" class="intro">
      <div class="big"><b>{{ s.model_1.n }}</b><span>US airlines, early 1950s</span></div>
      <div class="big"><b>12</b><span>columns: flight length, speed, daily flight time, customers, costs, assets…</span></div>
      <div class="big"><b>2</b><span>regression models to build</span></div>
    </div>
    <div v-else-if="['data', 'fit', 'table'].includes(scene)" class="two">
      <Scatter :points="ptsLen" :line="scene === 'data' ? null : s.lines.length" :reveal="scene === 'data' ? Math.min(1, p * 1.4) : 1" :line-p="scene === 'fit' ? Math.min(1, p * 1.6) : 1"
               x-label="average length of flight (miles)" y-label="customers served (1000s)" :y-fmt="k" />
      <div class="side">
        <p class="eq" v-if="scene !== 'data'">customers = b₀ + b₁·length + b₂·daily time</p>
        <p class="note" v-if="scene === 'fit'">The line shows model 1 with daily flight time held at its mean ({{ s.lines.length.daily_time_held_at?.toFixed(2) }} h).</p>
        <CoefTable v-if="scene === 'table'" :model="s.model_1" testid="hop82-m1" />
      </div>
    </div>
    <div v-else-if="scene === 'assets'" class="two">
      <Scatter :points="ptsAssets" :line="s.lines.assets" :line-p="Math.min(1, p * 1.5)" x-label="customers served (1000s)" y-label="total assets ($100,000s)" :x-fmt="k" />
      <div class="side"><p class="eq">total assets = b₀ + b₁·customers</p><CoefTable :model="s.model_2" testid="hop82-m2" /></div>
    </div>
    <div v-else class="insight" data-testid="hop82-insight">
      <p v-for="(t, i) in insight" :key="i" :class="{ hide: i > line * 2 + 1 }">{{ t }}</p>
    </div>
  </div>
</template>

<style scoped>
.h2 { width: 100%; max-width: 1500px; margin: 0 auto; }
.intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.big { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; border-radius: 18px; background: rgba(var(--c-surface), .85); text-align: center; }
.big b { font: 700 clamp(34px, 3.6vw, 60px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.big span { color: rgb(var(--c-soft)); }
.two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 3vw; align-items: center; }
.side { display: grid; gap: 12px; }
.eq { font: 600 clamp(16px, 1.3vw, 21px) 'JetBrains Mono', monospace; color: rgb(var(--c-strong)); }
.note { font-size: 14px; color: rgb(var(--c-dim)); }
.insight { display: grid; gap: 12px; max-width: 1100px; margin: 0 auto; }
.insight p { padding: 14px 20px; border-radius: 14px; background: rgba(var(--c-surface), .85); border-left: 3px solid rgb(var(--c-accent)); font-size: clamp(15px, 1.2vw, 20px); line-height: 1.5; transition: opacity .5s; }
.hide { opacity: 0; }
</style>
