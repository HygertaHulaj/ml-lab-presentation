<script setup lang="ts">
/**
 * Mathematics of the current moment: the model, cost and update rule (Shah eqs. 8.4–8.7), then the recorded frame's
 * real numbers (θ, gradient, J) and, from the converged scene on, gradient descent against least squares.
 */
import { computed } from 'vue'
import { useLinregLessonStore } from '../../stores/linregLesson'
import { stateAt } from './state'
import ResidualPlot from './ResidualPlot.vue'

withDefaults(defineProps<{ large?: boolean }>(), { large: false })
const store = useLinregLessonStore()
const s = computed(() => (store.timeline && store.manifest && store.traces.length ? stateAt(store.timeline, store.manifest.parts, store.traces, store.position) : null))
const tr = computed(() => (s.value ? store.traces[s.value.part] : null))
const part = computed(() => (s.value && store.manifest ? store.manifest.parts[s.value.part] : null))
const num = (v: number) => {
  if (!Number.isFinite(v)) return '∞'
  const a = Math.abs(v)
  return a !== 0 && (a < 1e-3 || a >= 1e6) ? v.toExponential(4) : v.toFixed(a >= 100 ? 2 : 4)
}
const names = computed(() => (tr.value ? tr.value.predictors.map((p) => p.replace(/_/g, ' ')) : []))
const explanation = computed(() => {
  if (!s.value || !part.value || !tr.value) return ''
  const fit = part.value.kind === 'plane' ? 'plane' : 'line'
  const notes: Record<string, string> = {
    title: 'First locate the observations, then watch a model learn to predict their height.',
    rise: `Each dot is one ${part.value.unit}. Its height is the observed ${part.value.axes.y}; its position on the floor shows the predictors.`,
    guess: `The cyan ${fit} is the current prediction. It starts at zero; the observations stay fixed while the model changes.`,
    residuals: 'The red vertical gaps connect observations to predictions. Squaring the gaps prevents positive and negative errors cancelling; large errors count more.',
    bowl: 'These are two different spaces: the left shows observations; the bowl shows possible models. One orange point represents one entire line. Lower height means smaller squared errors.',
    descend: `The dots stay fixed. Each update changes the intercept and slopes together, moving the cyan ${fit}. The gradient tells us how cost changes; we step in the opposite direction.`,
    converged: tr.value.stop_reason === 'converged' ? 'The cost change is below the stopping tolerance. Gold shows the least-squares reference: compare it with the cyan fit.' : tr.value.stop_reason === 'diverged' ? 'This run diverged. The steps are too large; the cyan fit has not reached the gold least-squares reference. Try a smaller learning rate in Explore.' : 'The iteration limit was reached. The cyan fit may still differ from the gold least-squares reference; allow more iterations in Explore.',
    read: 'Read each slope as the change in the prediction for one extra unit of that predictor, holding the other predictors fixed. This describes association, not causation.',
    models: 'Compare models on the same observations. R² describes fit to these data; it does not measure accuracy on unseen movies.',
    outro: 'The model minimizes squared prediction errors. A fitted relationship does not establish a cause or guarantee good predictions on new data.',
  }
  return notes[s.value.kind]
})
const showCompare = computed(() => !!s.value && ['converged', 'read', 'models', 'outro'].includes(s.value.kind))
</script>

<template>
  <div v-if="s && tr && part && store.manifest" class="space-y-3 text-[length:var(--l-sm)]" :class="large && 'text-[length:var(--l-lg)]'" data-testid="gd-math">
    <section class="rounded-xl border border-[rgba(var(--c-pred),.25)] bg-[rgba(var(--c-pred),.05)] p-3" data-testid="gd-explanation">
      <p class="text-[length:var(--l-base)] leading-relaxed text-[rgb(var(--c-strong))]">{{ explanation }}</p>
      <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--l-xs)]" aria-label="Visual key">
        <span class="text-[rgb(var(--c-obs))]">● Observations</span><span class="text-[rgb(var(--c-pred))]">━ Current prediction</span>
        <span v-if="s.residualOpacity > 0" class="text-[rgb(var(--c-err))]">│ Prediction errors</span>
        <span v-if="s.bowlOpacity > 0" class="text-[rgb(var(--c-coral))]">● Current model on bowl</span>
        <span v-if="showCompare" class="text-[rgb(var(--c-ref))]">┄ Least-squares reference</span>
      </div>
      <p v-if="tr.held_at_mean.length" class="mt-2 text-[length:var(--l-sm)] text-[rgb(var(--c-ref))]">This is a slice of the full model: {{ tr.held_at_mean.join(', ') }} is held at its mean. The dots have their actual values, so their gaps to this slice are not the full model’s errors.</p>
      <p v-if="s.bowlOpacity > 0" class="mt-2 text-[length:var(--l-sm)] text-[rgb(var(--c-soft))]">The bowl uses standardized predictor units. Height is compressed to keep the path visible; the ball follows computed updates, not physical gravity.</p>
      <p v-if="s.bowlOpacity > 0 && tr.final.cost > tr.initial_cost" class="mt-2 text-[length:var(--l-sm)] text-[rgb(var(--c-err))]">Parameters in a growing-cost run can leave the sampled bowl. Their marker is clipped at the display boundary; read the recorded cost to see how far the error grows.</p>
    </section>
    <details :open="store.mode === 'math'">
      <summary class="cursor-pointer py-1 text-[length:var(--l-sm)] text-[rgb(var(--c-pred))]">Formula and symbol guide</summary>
      <p class="my-2 text-[length:var(--l-sm)] text-[rgb(var(--c-soft))]">θ₀ is the intercept; θⱼ are slopes. z is a predictor centered at its mean μ and divided by its standard deviation σ. m is the number of observations; α controls the step size. J is half the mean squared prediction error.</p>
    <div class="rounded-lg bg-[rgba(var(--c-text),.05)] p-3 font-mono text-[length:var(--l-xs)] leading-relaxed text-[rgb(var(--c-text))]" :class="large && 'text-[length:var(--l-base)]'">
      <div>{{ store.manifest.math.model }}</div>
      <div>{{ store.manifest.math.cost }}</div>
      <div class="text-[rgb(var(--c-pred))]">{{ store.manifest.math.update }}</div>
      <div class="text-[rgb(var(--c-dim))]">{{ store.manifest.math.back }}</div>
    </div>
    </details>
    <div>
      <div class="mb-1 text-[length:var(--l-xs)] font-semibold tracking-[0.15em] text-[rgb(var(--c-dim))] uppercase">{{ part.title }}</div>
      <div class="grid grid-cols-2 gap-2 text-[length:var(--l-xs)]">
        <div class="rounded bg-[rgba(var(--c-text),.05)] px-2 py-1.5">iteration <b class="text-[rgb(var(--c-strong))]" data-testid="gd-iter">{{ s.frame.iteration }}</b> / {{ tr.iterations_run }}</div>
        <div class="rounded bg-[rgba(var(--c-text),.05)] px-2 py-1.5">α = <b class="text-[rgb(var(--c-strong))]">{{ tr.learning_rate }}</b></div>
        <div class="col-span-2 rounded bg-[rgba(var(--c-text),.05)] px-2 py-1.5">cost J = <b class="text-[rgb(var(--c-ref))]" data-testid="gd-cost">{{ num(s.frame.cost) }}</b> <span class="text-[rgb(var(--c-faint))]">(start {{ num(tr.initial_cost) }})</span></div>
      </div>
    </div>
    <table class="w-full text-[length:var(--l-xs)] tabular-nums">
      <thead><tr class="text-[rgb(var(--c-dim))]"><th class="text-left">θ</th><th class="text-right">standardized</th><th class="text-right">gradient</th><th class="text-right">original units</th></tr></thead>
      <tbody>
        <tr class="border-t border-[rgba(var(--c-text),.12)]"><td>θ₀ intercept</td><td class="text-right">{{ num(s.frame.theta_std[0]) }}</td><td class="text-right">{{ num(s.frame.gradient[0]) }}</td><td class="text-right">{{ num(s.frame.intercept) }}</td></tr>
        <tr v-for="(nm, j) in names" :key="nm" class="border-t border-[rgba(var(--c-text),.12)]"><td>θ{{ '₁₂₃₄₅'[j] }} {{ nm }}</td><td class="text-right">{{ num(s.frame.theta_std[j + 1]) }}</td><td class="text-right">{{ num(s.frame.gradient[j + 1]) }}</td><td class="text-right">{{ num(s.frame.coefficients[j]) }}</td></tr>
      </tbody>
    </table>
    <div v-if="showCompare" class="rounded-lg border border-[rgba(var(--c-ref),.3)] bg-[rgba(var(--c-ref),.05)] p-3 text-[length:var(--l-xs)]" data-testid="gd-compare">
      <div class="mb-1 font-semibold text-[rgb(var(--c-ref))]">Gradient descent vs least squares</div>
      <table class="w-full tabular-nums">
        <tbody>
          <tr class="text-[rgb(var(--c-dim))]"><th class="text-left">Coefficient</th><th class="text-right">This run</th><th class="text-right">Least squares</th></tr>
          <tr><td>intercept</td><td class="text-right">{{ num(tr.final.intercept) }}</td><td class="text-right text-[rgb(var(--c-ref))]">{{ num(tr.ols.intercept) }}</td></tr>
          <tr v-for="(nm, j) in names" :key="nm"><td>{{ nm }}</td><td class="text-right">{{ num(tr.final.coefficients[j]) }}</td><td class="text-right text-[rgb(var(--c-ref))]">{{ num(tr.ols.coefficients[j]) }}</td></tr>
        </tbody>
      </table>
      <p class="mt-2 text-[rgb(var(--c-soft))]">Least-squares R² = <b data-testid="gd-r2">{{ tr.ols.r2.toFixed(3) }}</b> · adjusted {{ tr.ols.adj_r2.toFixed(3) }} · n = {{ tr.n }}<span v-if="tr.n_dropped"> ({{ tr.n_dropped }} rows with missing values left out)</span></p>
    </div>
    <ResidualPlot v-if="['read', 'outro'].includes(s.kind) && tr.diagnostics" :trace="tr" />
    <div v-if="s.kind === 'models' && tr.single_predictors" class="rounded-lg bg-[rgba(var(--c-text),.05)] p-2 text-[length:var(--l-xs)]" data-testid="gd-single">
      <div class="mb-1 font-semibold text-[rgb(var(--c-text))]">Single-predictor criterion: strongest |r| with {{ tr.response }} = highest one-predictor R² on these {{ tr.n }} observations</div>
      <div v-for="q in tr.single_predictors" :key="q.predictor" class="flex justify-between tabular-nums"><span>{{ q.predictor.replace(/_/g, ' ') }}</span><span>r = {{ q.r.toFixed(3) }} · R² = {{ q.r2.toFixed(3) }}</span></div>
      <p class="mt-1 text-[rgb(var(--c-dim))]">In-sample, on the same rows. Not causal, and not proof of the best prediction for unseen movies.</p>
    </div>
    <p v-if="tr.held_at_mean.length" class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">The drawn plane holds {{ tr.held_at_mean.join(', ') }} at its mean; the numbers above are the full model.</p>
    <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-faint))]">Every number from the backend trace (POST /simulations/linreg-gd) · {{ store.manifest.problem }}, {{ store.manifest.source_page }}</p>
  </div>
</template>
