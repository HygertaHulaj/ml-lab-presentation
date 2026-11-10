<script setup lang="ts">
/**
 * Shah Hands-On Problem 8.1 (p. 231), restaurant ratings, on the book's OA 8.3 data (15 restaurants). Restaurants pour in
 * (food vs overall rating), the model in mathematical form, three parameter sets tried by hand (their predictions for
 * three restaurants and their sums of squared errors), the fitted coefficient table, then the report in words.
 * All values from the backend solver.
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import Scatter, { type Pt } from '../visuals/Scatter.vue'
import CoefTable from '../visuals/CoefTable.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type M = { n: number; r2: number; adj_r2: number; F: number; coefficients: { term: string; estimate: number; std_error: number; t: number; p: number }[] }
type Cand = { label: string; params: number[]; sse: number; mse: number }
type Ex = { name: string; ambience: number; food: number; service: number; rating: number; predictions: number[] }
const s = computed(() => props.solve as unknown as { model: M; candidates: Cand[]; examples: Ex[]; n_restaurants: number; data: Record<string, number[]> })
const pts = computed<Pt[]>(() => s.value.data.food.map((x, i) => ({ x, y: s.value.data.rating[i] })))
const maxSse = computed(() => Math.max(...s.value.candidates.map((c) => c.sse)))
const f1 = (v: number) => v.toFixed(1)
const f2 = (v: number) => v.toFixed(2)
const words = computed(() => String(props.solve.answers[2]?.explanation ?? '').split(/(?<=\.)\s/))
</script>

<template>
  <div class="h1" data-testid="v-hop81">
    <div v-if="scene === 'intro'" class="intro">
      <div class="big"><b>{{ s.n_restaurants }}</b><span>restaurants (the book's OA 8.3 data)</span></div>
      <div class="big"><b>3</b><span>predictors: average ambience, food and service ratings</span></div>
      <div class="big"><b>1</b><span>outcome: the overall rating</span></div>
    </div>
    <div v-else-if="scene === 'data'" class="two">
      <Scatter :points="pts" :reveal="Math.min(1, p * 1.4)" x-label="average food rating" y-label="overall rating" />
      <div class="side"><p class="note">Each dot is one restaurant. The ratings are averages of what previous customers gave.</p></div>
    </div>
    <div v-else-if="scene === 'form'" class="form">
      <p class="eq">rating = b₀ + b₁·ambience + b₂·food + b₃·service</p>
      <div class="terms"><span><b>b₀</b> constant</span><span><b>b₁</b> ambience rating</span><span><b>b₂</b> food rating</span><span><b>b₃</b> service rating</span></div>
    </div>
    <div v-else-if="scene === 'hand'" class="hand" data-testid="hop81-hand">
      <table>
        <thead><tr><th>Parameter set (b₀, b₁, b₂, b₃)</th><th v-for="e in s.examples" :key="e.name">{{ e.name }}<small>observed {{ e.rating }}</small></th><th>sum of squared errors</th></tr></thead>
        <tbody>
          <tr v-for="(c, k) in s.candidates" :key="c.label" :class="{ hide: k > line }">
            <td><b>{{ c.label }}</b><small>{{ c.params.map(f2).join(', ') }}</small></td>
            <td v-for="e in s.examples" :key="e.name">{{ f1(e.predictions[k]) }}</td>
            <td><span class="bar"><i :style="{ width: `${(c.sse / maxSse) * 100}%` }" /></span>{{ f1(c.sse) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">Predictions for three restaurants (low, middle and high overall rating); the error column sums the squared errors over all {{ s.n_restaurants }}.</p>
    </div>
    <div v-else-if="scene === 'fit'" class="two">
      <CoefTable :model="s.model" testid="hop81-coef" />
      <div class="side"><p class="note">Only {{ s.n_restaurants }} restaurants: the standard errors are large, and only the food coefficient is clearly significant. R² is measured on the same restaurants the model was fitted to.</p></div>
    </div>
    <div v-else class="insight" data-testid="hop81-insight">
      <p v-for="(t, i) in words" :key="i" :class="{ hide: i > line * 2 + 1 }">{{ t }}</p>
    </div>
  </div>
</template>

<style scoped>
.h1 { width: 100%; max-width: 1500px; margin: 0 auto; display: grid; gap: 14px; }
.intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.big { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; border-radius: 18px; background: rgba(var(--c-surface), .85); text-align: center; }
.big b { font: 700 clamp(34px, 3.6vw, 60px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.big span { color: rgb(var(--c-soft)); }
.two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 3vw; align-items: center; }
.side { display: grid; gap: 12px; }
.note { font-size: clamp(14px, 1.05vw, 18px); color: rgb(var(--c-soft)); line-height: 1.5; }
.form { display: grid; gap: 18px; justify-items: center; }
.eq { font: 600 clamp(20px, 2vw, 34px) 'JetBrains Mono', monospace; color: rgb(var(--c-strong)); }
.terms { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.terms span { padding: 8px 14px; border-radius: 12px; background: rgba(var(--c-surface), .85); color: rgb(var(--c-soft)); font-size: clamp(14px, 1.05vw, 18px); }
.terms b { color: rgb(var(--c-accent)); margin-right: 6px; }
.hand table { width: 100%; border-collapse: separate; border-spacing: 0 6px; font-size: clamp(14px, 1.1vw, 19px); font-variant-numeric: tabular-nums; }
.hand th { text-align: right; font: 600 clamp(13px, .95vw, 16px) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); padding: 0 10px; vertical-align: bottom; }
.hand th:first-child, .hand td:first-child { text-align: left; }
.hand th small, .hand td small { display: block; font: 400 12px 'Inter', system-ui; color: rgb(var(--c-dim)); }
.hand td { text-align: right; padding: 10px; background: rgba(var(--c-surface), .8); transition: opacity .5s; }
.hand tr.hide td { opacity: 0; }
.bar { display: inline-block; width: 120px; height: 10px; margin-right: 10px; border-radius: 5px; background: rgba(var(--c-text), .08); vertical-align: middle; }
.bar i { display: block; height: 100%; border-radius: 5px; background: rgb(var(--c-warn)); }
.insight { display: grid; gap: 12px; max-width: 1100px; margin: 0 auto; }
.insight p { padding: 14px 20px; border-radius: 14px; background: rgba(var(--c-surface), .85); border-left: 3px solid rgb(var(--c-accent)); font-size: clamp(15px, 1.2vw, 20px); line-height: 1.5; transition: opacity .5s; }
.hide { opacity: 0; }
</style>
