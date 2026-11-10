<script setup lang="ts">
/**
 * Shah Hands-On Problem 8.4 (p. 233), 2014–2015 movies: model (a) budget + followers, model (b) with likes, dislikes and
 * comments (R² and adjusted R² bars), the five factors' correlations with rating, then gradient descent on the best
 * predictor: the fitted line moves with the recorded iterations (θ from the backend history, de-standardised with the
 * backend's mean and sd), beside its cost curve; finally GD vs least squares. All values from the backend solver.
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import Scatter, { type Pt } from '../visuals/Scatter.vue'
import CostCurve from '../visuals/CostCurve.vue'
import CoefTable from '../visuals/CoefTable.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type M = { n: number; r2: number; adj_r2: number; F: number; coefficients: { term: string; estimate: number; std_error: number; t: number; p: number }[] }
type G = { history: { iteration: number; theta: number[]; cost: number }[]; feature_means: number[]; feature_sds: number[]; intercept: number; coefficients: number[]; iterations_run: number }
const s = computed(() => props.solve as unknown as { model_a: M; model_b: M; correlations: Record<string, number>; best: string; gradient_descent: G; n_movies: number; n_complete: number; scatter: { x: number[]; y: number[] } })
const c = computed(() => props.solve.answers[2].answer as { gd_intercept: number; gd_slope: number; ols_intercept: number; ols_slope: number; iterations_run: number })
const pts = computed<Pt[]>(() => s.value.scatter.x.map((x, i) => ({ x, y: s.value.scatter.y[i] })))
const xr = computed(() => [Math.min(...s.value.scatter.x), Math.max(...s.value.scatter.x)])
const at = computed(() => {
  const h = s.value.gradient_descent.history
  return h[Math.min(h.length - 1, Math.floor((props.scene === 'gd' ? props.p : 1) * h.length))]
})
// the line at that iteration: θ (standardised) → original units with the backend's mean and sd
const gdLine = computed(() => {
  const g = s.value.gradient_descent, th = at.value.theta, mu = g.feature_means[0], sd = g.feature_sds[0]
  return { x: xr.value, y: xr.value.map((v) => th[0] + th[1] * ((v - mu) / sd)) }
})
const money = (v: number) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : String(Math.round(v)))
const label = (f: string) => f.replace(/_/g, ' ')
const R2 = computed(() => [
  { k: 'a · budget + followers', m: s.value.model_a }, { k: 'b · + likes, dislikes, comments', m: s.value.model_b },
])
</script>

<template>
  <div class="h4" data-testid="v-hop84">
    <div v-if="scene === 'intro'" class="intro">
      <div class="big"><b>{{ s.n_movies }}</b><span>movies from 2014 and 2015 (UCI)</span></div>
      <div class="big"><b>{{ s.n_complete }}</b><span>with every factor recorded: all models use these, so they compare fairly</span></div>
      <div class="big"><b>1–10</b><span>the response: the movie's rating</span></div>
    </div>
    <div v-else-if="scene === 'a'" class="two">
      <CoefTable :model="s.model_a" testid="hop84-a" />
      <div class="side"><p class="eq">rating = b₀ + b₁·budget + b₂·followers</p><p class="note">Budget matters a little; followers do not. Together they explain only {{ (s.model_a.r2 * 100).toFixed(1) }} % of the variation in ratings.</p></div>
    </div>
    <div v-else-if="scene === 'b'" class="r2s" data-testid="hop84-r2s">
      <div v-for="r in R2" :key="r.k" class="row">
        <span>{{ r.k }}</span>
        <span class="track"><i :style="{ width: r.m.r2 * 100 * 3 + '%' }" class="r2" /><i :style="{ width: r.m.adj_r2 * 100 * 3 + '%' }" class="adj" /></span>
        <b>R² {{ r.m.r2.toFixed(3) }} · adj. {{ r.m.adj_r2.toFixed(3) }}</b>
      </div>
      <p class="note">Bars are stretched ×3 (0–33 %). Adjusted R² penalizes extra predictors. Both are in-sample: they do not measure prediction on unseen movies.</p>
    </div>
    <div v-else-if="scene === 'best'" class="corr" data-testid="hop84-corr">
      <div v-for="(r, f) in s.correlations" :key="f" class="bar" :class="{ best: f === s.best }">
        <span>{{ label(String(f)) }}</span>
        <span class="track"><i :style="{ left: r < 0 ? `${50 + r * 50}%` : '50%', width: `${Math.abs(r) * 50}%`, background: r < 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }" /></span>
        <b>r = {{ r.toFixed(3) }}</b>
      </div>
    </div>
    <div v-else-if="scene === 'gd'" class="two">
      <Scatter :points="pts" :line="gdLine" x-label="budget" y-label="rating" :x-fmt="money" :y-fmt="(v: number) => v.toFixed(1)" />
      <div class="side">
        <CostCurve :history="s.gradient_descent.history" :up-to="Math.max(0.02, p)" label="cost J" />
        <p class="eq" data-testid="hop84-gd-now">iteration {{ at.iteration }}: rating = {{ (at.theta[0] - at.theta[1] * s.gradient_descent.feature_means[0] / s.gradient_descent.feature_sds[0]).toFixed(3) }} + {{ (at.theta[1] / s.gradient_descent.feature_sds[0] * 1e6).toFixed(4) }}·budget($M)</p>
      </div>
    </div>
    <div v-else class="cmp" data-testid="hop84-compare">
      <table>
        <thead><tr><th /><th>gradient descent</th><th>least squares</th></tr></thead>
        <tbody>
          <tr><td>intercept</td><td>{{ c.gd_intercept.toFixed(4) }}</td><td>{{ c.ols_intercept.toFixed(4) }}</td></tr>
          <tr><td>gradient (per $1M budget)</td><td>{{ (c.gd_slope * 1e6).toFixed(4) }}</td><td>{{ (c.ols_slope * 1e6).toFixed(4) }}</td></tr>
        </tbody>
      </table>
      <p class="note">Gradient descent stopped after {{ c.iterations_run }} iterations on the same line as least squares.</p>
    </div>
  </div>
</template>

<style scoped>
.h4 { width: 100%; max-width: 1500px; margin: 0 auto; }
.intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.big { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; border-radius: 18px; background: rgba(var(--c-surface), .85); text-align: center; }
.big b { font: 700 clamp(34px, 3.6vw, 60px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.big span { color: rgb(var(--c-soft)); }
.two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 3vw; align-items: center; }
.side { display: grid; gap: 12px; }
.eq { font: 600 clamp(14px, 1.15vw, 18px) 'JetBrains Mono', monospace; color: rgb(var(--c-strong)); line-height: 1.5; }
.note { font-size: 14px; color: rgb(var(--c-dim)); line-height: 1.5; }
.r2s { display: grid; gap: 18px; max-width: 1100px; margin: 0 auto; }
.row { display: grid; grid-template-columns: 260px 1fr 250px; gap: 14px; align-items: center; font: 600 15px 'Space Grotesk', system-ui; }
.row .track { position: relative; height: 26px; border-radius: 6px; background: rgba(var(--c-dim), .12); overflow: hidden; }
.row .track i { position: absolute; left: 0; border-radius: 6px; }
.row .track i.r2 { top: 0; height: 60%; background: rgb(var(--c-accent)); }
.row .track i.adj { bottom: 0; height: 40%; background: rgba(var(--c-accent), .45); }
.row b { font: 600 15px 'JetBrains Mono', monospace; }
.corr { display: grid; gap: 14px; max-width: 900px; margin: 0 auto; }
.bar { display: grid; grid-template-columns: 170px 1fr 110px; gap: 14px; align-items: center; font: 600 15px 'Space Grotesk', system-ui; padding: 6px 10px; border-radius: 10px; }
.bar.best { background: rgba(var(--c-accent), .12); outline: 1.5px solid rgb(var(--c-accent)); }
.bar .track { position: relative; height: 20px; border-radius: 6px; background: rgba(var(--c-dim), .12); }
.bar .track::after { content: ''; position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: rgba(var(--c-dim), .6); }
.bar .track i { position: absolute; top: 0; bottom: 0; border-radius: 6px; }
.bar b { font: 700 16px 'JetBrains Mono', monospace; }
.cmp { max-width: 800px; margin: 0 auto; }
table { width: 100%; border-collapse: collapse; font: 16px 'JetBrains Mono', monospace; }
th { padding: 8px 14px; text-align: left; font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); border-bottom: 1px solid rgba(var(--c-dim), .3); }
td { padding: 10px 14px; border-bottom: 1px solid rgba(var(--c-dim), .15); }
td:first-child { font-family: 'Space Grotesk', system-ui; font-weight: 600; }
.cmp .note { text-align: center; margin-top: 10px; }
</style>
