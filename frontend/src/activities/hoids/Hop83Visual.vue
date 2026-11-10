<script setup lang="ts">
/**
 * Shah Hands-On Problem 8.3 (p. 232), rock samples: correlations with permeability, the linear model's fit
 * (predicted vs actual), gradient descent's cost falling over the recorded iterations, and OLS vs gradient descent side
 * by side. All values from the backend solver (history recorded by run_multivariate_gd).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import Scatter, { type Pt } from '../visuals/Scatter.vue'
import CostCurve from '../visuals/CostCurve.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type A1 = { intercept: number; coefficients: Record<string, number>; r2: number; correlations_with_perm: Record<string, number> }
type A2 = { intercept: number; coefficients: Record<string, number>; iterations_run: number; stop_reason: string }
const a1 = computed(() => props.solve.answers[0].answer as A1)
const a2 = computed(() => props.solve.answers[1].answer as A2)
const fit = computed(() => props.solve.fit as { perm: number[]; predicted: number[] })
const hist = computed(() => (props.solve.gradient_descent as { history: { iteration: number; cost: number }[] }).history)
const pts = computed<Pt[]>(() => fit.value.perm.map((y, i) => ({ x: fit.value.predicted[i], y })))
const feats = computed(() => Object.keys(a1.value.coefficients))
const eq = computed(() => `perm = ${a1.value.intercept.toFixed(2)}` + feats.value.map((f) => ` ${a1.value.coefficients[f] >= 0 ? '+' : '−'} ${Math.abs(a1.value.coefficients[f]).toFixed(4)}·${f}`).join(''))
const num = (v: number) => (Math.abs(v) < 1 ? v.toFixed(5) : v.toFixed(3))
</script>

<template>
  <div class="h3" data-testid="v-hop83">
    <div v-if="scene === 'intro'" class="intro">
      <div class="big"><b>48</b><span>rock samples from a petroleum reservoir (BP Research)</span></div>
      <div class="big"><b>3</b><span>pore measurements: area, perimeter, shape</span></div>
      <div class="big"><b>perm</b><span>permeability, from 6.3 to 1300 milli-darcies</span></div>
    </div>
    <div v-else-if="scene === 'corr'" class="corr" data-testid="hop83-corr">
      <div v-for="f in feats" :key="f" class="bar">
        <span>{{ f }}</span>
        <span class="track"><i :style="{ left: a1.correlations_with_perm[f] < 0 ? `${50 + a1.correlations_with_perm[f] * 50}%` : '50%', width: `${Math.abs(a1.correlations_with_perm[f]) * 50}%`, background: a1.correlations_with_perm[f] < 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }" /></span>
        <b>r = {{ a1.correlations_with_perm[f].toFixed(2) }}</b>
      </div>
      <p class="note">Correlation with permeability: −1 on the left, +1 on the right.</p>
    </div>
    <div v-else-if="scene === 'ols'" class="two">
      <Scatter :points="pts" :reveal="Math.min(1, p * 1.5)" diag x-label="predicted perm (linear model)" y-label="actual perm" />
      <div class="side">
        <p class="eq" data-testid="hop83-eq">{{ eq }}</p>
        <p class="r2" data-testid="hop83-r2">R² = {{ a1.r2.toFixed(3) }}</p>
        <p class="note">Points on the dashed line would be predicted perfectly. About {{ Math.round(a1.r2 * 100) }} % of the variation is linear; the rest is not.</p>
      </div>
    </div>
    <div v-else-if="scene === 'gd'" class="two">
      <CostCurve :history="hist" :up-to="Math.max(0.02, p)" />
      <div class="side">
        <p class="eq">θⱼ := θⱼ − α · (1/m) Σ (h(xᵢ) − yᵢ) · xᵢⱼ</p>
        <p class="note">All four θ move together (Shah eq. 8.7). The features are standardised first, so one learning rate α = {{ solve.parameters.learning_rate }} suits all of them.</p>
        <p class="r2" data-testid="hop83-iters">{{ a2.stop_reason }} after {{ a2.iterations_run }} iterations</p>
      </div>
    </div>
    <div v-else class="cmp" data-testid="hop83-compare">
      <table>
        <thead><tr><th /><th>least squares</th><th>gradient descent</th></tr></thead>
        <tbody>
          <tr><td>intercept</td><td>{{ num(a1.intercept) }}</td><td>{{ num(a2.intercept) }}</td></tr>
          <tr v-for="f in feats" :key="f"><td>{{ f }}</td><td>{{ num(a1.coefficients[f]) }}</td><td>{{ num(a2.coefficients[f]) }}</td></tr>
        </tbody>
      </table>
      <p class="note">Two routes, one answer: gradient descent arrives at the least-squares coefficients.</p>
    </div>
  </div>
</template>

<style scoped>
.h3 { width: 100%; max-width: 1500px; margin: 0 auto; }
.intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.big { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; border-radius: 18px; background: rgba(var(--c-surface), .85); text-align: center; }
.big b { font: 700 clamp(34px, 3.6vw, 60px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.big span { color: rgb(var(--c-soft)); }
.corr { display: grid; gap: 16px; max-width: 900px; margin: 0 auto; }
.bar { display: grid; grid-template-columns: 80px 1fr 110px; gap: 14px; align-items: center; font: 600 16px 'Space Grotesk', system-ui; }
.track { position: relative; height: 22px; border-radius: 6px; background: rgba(var(--c-dim), .12); }
.track::after { content: ''; position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: rgba(var(--c-dim), .6); }
.track i { position: absolute; top: 0; bottom: 0; border-radius: 6px; }
.bar b { font: 700 18px 'JetBrains Mono', monospace; color: rgb(var(--c-strong)); }
.two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 3vw; align-items: center; }
.side { display: grid; gap: 12px; }
.eq { font: 600 clamp(14px, 1.15vw, 19px) 'JetBrains Mono', monospace; color: rgb(var(--c-strong)); line-height: 1.5; }
.r2 { font: 700 clamp(20px, 1.8vw, 30px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.note { font-size: 14px; color: rgb(var(--c-dim)); line-height: 1.5; text-align: center; }
.side .note { text-align: left; }
.cmp { max-width: 800px; margin: 0 auto; }
table { width: 100%; border-collapse: collapse; font: 16px 'JetBrains Mono', monospace; }
th { padding: 8px 14px; text-align: left; font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); border-bottom: 1px solid rgba(var(--c-dim), .3); }
td { padding: 10px 14px; border-bottom: 1px solid rgba(var(--c-dim), .15); }
td:first-child { font-family: 'Space Grotesk', system-ui; font-weight: 600; }
.hide { opacity: 0; }
</style>
