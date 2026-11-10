<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-vue-next'
import { api, trainAndWait } from '../api/endpoints'
import { errorMessage } from '../api/client'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import DatasetConfig from '../components/ml/DatasetConfig.vue'
import PlotlyChart from '../components/charts/PlotlyChart.vue'
import MetricCard from '../components/ml/MetricCard.vue'
import FormulaList from '../components/ml/FormulaList.vue'
import type { GDStep } from '../types'
import { fmt } from '../utils/format'

const route = useRoute()
const datasetId = ref((route.query.dataset as string) || 'shah_regression')
const target = ref(datasetId.value === 'shah_regression' ? 'y' : '')
const features = ref<string[]>(datasetId.value === 'shah_regression' ? ['x'] : [])
const p = reactive({ learning_rate: 0.01, iterations: 300, w0: 0, b0: 0, loss: 'half_mse' as 'mse' | 'half_mse',
  standardize_x: false, useTolerance: false, allRows: true })

const busy = ref(false)
const error = ref<string | null>(null)
const runId = ref<string | null>(null)
const history = ref<Record<string, any> | null>(null)
const summary = ref<Record<string, any> | null>(null)
const idx = ref(0)
const detail = ref<Record<string, any> | null>(null)
const playing = ref(false)
let timer: number | undefined

const presets = [
  { label: 'Shah Ex. 8.2 (book settings)', set: { learning_rate: 0.01, iterations: 300, loss: 'half_mse', standardize_x: false } },
  { label: 'Run to convergence', set: { learning_rate: 0.01, iterations: 30000, loss: 'half_mse', standardize_x: false, useTolerance: true } },
  { label: 'Too large α (diverges)', set: { learning_rate: 0.02, iterations: 60, loss: 'half_mse', standardize_x: false } },
  { label: 'Standardized x (fast)', set: { learning_rate: 0.1, iterations: 200, loss: 'mse', standardize_x: true } },
] as const

async function train() {
  error.value = null
  busy.value = true
  history.value = summary.value = detail.value = null
  stop()
  try {
    const st = await trainAndWait({
      dataset_id: datasetId.value, algorithm: 'gradient_descent', target_column: target.value, feature_columns: features.value,
      test_size: p.allRows ? 0 : 0.2, random_seed: 42,
      hyperparameters: { learning_rate: p.learning_rate, iterations: p.iterations, w0: p.w0, b0: p.b0, loss: p.loss,
        standardize_x: p.standardize_x, tolerance: p.useTolerance ? 1e-9 : null },
    })
    if (st.status === 'FAILED') throw new Error(st.error ?? 'Training failed')
    runId.value = st.run_id
    const [h, r] = await Promise.all([api.history(st.run_id), api.run(st.run_id)])
    history.value = h
    summary.value = r.model_summary
    idx.value = 0
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

const steps = computed<GDStep[]>(() => (history.value?.history as GDStep[]) ?? [])
const step = computed(() => steps.value[idx.value])
const xs = computed<number[]>(() => history.value?.x_train ?? [])
const ys = computed<number[]>(() => history.value?.y_train ?? [])
const xLabel = computed(() => (history.value?.x_is_standardized ? `${features.value[0]} (standardized z)` : features.value[0]))

watch(idx, async (i) => {
  if (!runId.value || !steps.value.length) return
  try {
    detail.value = await api.steps(runId.value, { iteration_index: i })
  } catch (e) {
    error.value = errorMessage(e)
  }
}, { immediate: false })
watch(steps, () => { if (steps.value.length) idx.value = 0; if (runId.value) api.steps(runId.value, { iteration_index: 0 }).then((d) => (detail.value = d)) })

function line(w: number, b: number) {
  const lo = Math.min(...xs.value), hi = Math.max(...xs.value)
  return { x: [lo, hi], y: [w * lo + b, w * hi + b] }
}
const fitChart = computed(() => {
  if (!step.value) return null
  const s = step.value
  const first = steps.value[0]
  return {
    data: [
      { x: xs.value, y: ys.value, mode: 'markers', type: 'scatter', name: 'training data', marker: { color: '#334155', size: 8 } },
      { ...line(first.w, first.b), mode: 'lines', name: `initial line (iter ${first.iteration})`, line: { color: '#cbd5e1', dash: 'dot' } },
      { ...line(s.w, s.b), mode: 'lines', name: `before update (iter ${s.iteration})`, line: { color: '#f59e0b', width: 2 } },
      { ...line(s.w_next, s.b_next), mode: 'lines', name: 'after update', line: { color: '#4f46e5', width: 3 } },
    ],
    layout: { xaxis: { title: { text: xLabel.value } }, yaxis: { title: { text: target.value } } },
  }
})
const lossChart = computed(() => {
  if (!steps.value.length) return null
  return {
    data: [
      { x: steps.value.map((s) => s.iteration), y: steps.value.map((s) => s.loss), mode: 'lines', name: 'loss', line: { color: '#4f46e5' } },
      { x: [step.value.iteration], y: [step.value.loss], mode: 'markers', name: 'current', marker: { color: '#ef4444', size: 11 } },
    ],
    layout: { xaxis: { title: { text: 'iteration' } }, yaxis: { title: { text: p.loss === 'mse' ? 'MSE' : 'J = MSE / 2' }, type: 'log' }, showlegend: false },
  }
})
const paramChart = computed(() => {
  if (!steps.value.length) return null
  return {
    data: [
      { x: steps.value.map((s) => s.w), y: steps.value.map((s) => s.b), mode: 'lines+markers', name: 'path of (w, b)', marker: { size: 4, color: '#6366f1' } },
      { x: [step.value.w], y: [step.value.b], mode: 'markers', name: 'current', marker: { size: 12, color: '#ef4444' } },
      ...(summary.value && !history.value?.x_is_standardized
        ? [{ x: [summary.value.ols_slope], y: [summary.value.ols_intercept], mode: 'markers', name: 'least-squares optimum', marker: { size: 14, symbol: 'star', color: '#10b981' } }]
        : []),
    ],
    layout: { xaxis: { title: { text: 'w (slope)' } }, yaxis: { title: { text: 'b (intercept)' } } },
  }
})

function play() {
  if (playing.value) return stop()
  playing.value = true
  timer = window.setInterval(() => {
    if (idx.value >= steps.value.length - 1) return stop()
    idx.value++
  }, 120)
}
function stop() {
  playing.value = false
  if (timer) window.clearInterval(timer)
}
onBeforeUnmount(stop)
function applyPreset(set: Record<string, unknown>) {
  Object.assign(p, { useTolerance: false }, set)
  if (datasetId.value !== 'shah_regression') { datasetId.value = 'shah_regression'; setTimeout(() => { target.value = 'y'; features.value = ['x'] }) }
}
</script>

<template>
  <PageHeader title="Gradient Descent Visualizer" subtitle="Watch a model learn its slope and intercept. Every frame below is a real recorded iteration of a NumPy implementation running on the server — nothing is animated or interpolated." />

  <div class="grid gap-6 xl:grid-cols-[22rem_1fr]">
    <form class="card h-fit space-y-4" @submit.prevent="train">
      <DatasetConfig v-model:dataset-id="datasetId" v-model:target="target" v-model:features="features" numeric-only single-feature target-kind="numeric" />
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="lr">Learning rate α</label><input id="lr" v-model.number="p.learning_rate" type="number" step="any" min="0.000001" max="10" class="input" /></div>
        <div><label class="label" for="it">Iterations</label><input id="it" v-model.number="p.iterations" type="number" min="1" max="100000" class="input" /></div>
        <div><label class="label" for="w0">Initial w</label><input id="w0" v-model.number="p.w0" type="number" step="any" class="input" /></div>
        <div><label class="label" for="b0">Initial b</label><input id="b0" v-model.number="p.b0" type="number" step="any" class="input" /></div>
      </div>
      <div>
        <label class="label" for="loss">Loss</label>
        <select id="loss" v-model="p.loss" class="input">
          <option value="half_mse">J = (1/2n) Σ e²  (Shah eq. 8.5)</option>
          <option value="mse">MSE = (1/n) Σ e²</option>
        </select>
      </div>
      <label class="flex items-center gap-2 text-sm"><input v-model="p.standardize_x" type="checkbox" /> Standardize x (z-scores)</label>
      <label class="flex items-center gap-2 text-sm"><input v-model="p.useTolerance" type="checkbox" /> Stop early when the loss stops changing</label>
      <label class="flex items-center gap-2 text-sm"><input v-model="p.allRows" type="checkbox" /> Train on all rows (as in the book)</label>
      <button class="btn-primary w-full justify-center" :disabled="busy || !target || !features.length">{{ busy ? 'Training…' : 'Run gradient descent' }}</button>
      <div>
        <div class="label">Presets</div>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="pr in presets" :key="pr.label" type="button" class="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50" @click="applyPreset(pr.set)">{{ pr.label }}</button>
        </div>
      </div>
      <StatusMessage kind="error" :message="error" />
    </form>

    <div class="min-w-0 space-y-4">
      <div v-if="!steps.length && !busy" class="card text-sm text-slate-600">
        <p class="mb-3">Choose settings and press <b>Run gradient descent</b>. The default reproduces Shah's Hands-On Example 8.2 (θ = (0, 0), α = 0.01, 300 iterations on Table 8.2).</p>
        <FormulaList :formulas="{ model: 'ŷ = w·x + b', loss: 'MSE = (1/n) Σ (yᵢ − ŷᵢ)²', gradients: { '∂MSE/∂w': '(2/n) Σ (ŷᵢ − yᵢ)·xᵢ', '∂MSE/∂b': '(2/n) Σ (ŷᵢ − yᵢ)' }, update: 'w ← w − α·∂L/∂w ;  b ← b − α·∂L/∂b' }" />
      </div>
      <StatusMessage v-if="busy" kind="loading" message="Running gradient descent on the server…" />

      <template v-if="steps.length && step">
        <StatusMessage v-if="summary?.diverged" kind="error" message="The loss exploded: the learning rate is too large, so every step overshoots the minimum and the parameters grow without bound (divergence). Lower α or standardize x." />
        <div class="card">
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-secondary px-2" aria-label="First iteration" @click="idx = 0"><RotateCcw class="h-4 w-4" /></button>
            <button class="btn-secondary px-2" aria-label="Previous iteration" :disabled="idx === 0" @click="idx--"><ChevronLeft class="h-4 w-4" /></button>
            <button class="btn-primary px-3" :aria-label="playing ? 'Pause' : 'Play'" @click="play"><Pause v-if="playing" class="h-4 w-4" /><Play v-else class="h-4 w-4" /></button>
            <button class="btn-secondary px-2" aria-label="Next iteration" :disabled="idx >= steps.length - 1" @click="idx++"><ChevronRight class="h-4 w-4" /></button>
            <input v-model.number="idx" type="range" min="0" :max="steps.length - 1" class="min-w-40 flex-1" aria-label="Iteration" />
            <span class="text-sm font-medium tabular-nums">iteration {{ step.iteration }} / {{ history?.iterations_run }}</span>
          </div>
          <p v-if="(history?.recorded_every ?? 1) > 1" class="mt-2 text-xs text-slate-500">Long run: every {{ history?.recorded_every }}th iteration is recorded (first and last always kept).</p>
        </div>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="w (slope)" :value="step.w" :calc="`→ ${fmt(step.w_next, 6)}`" />
          <MetricCard label="b (intercept)" :value="step.b" :calc="`→ ${fmt(step.b_next, 6)}`" />
          <MetricCard label="Loss" :value="step.loss" />
          <MetricCard label="Gradients" :value="step.grad_w" :calc="`∂L/∂b = ${fmt(step.grad_b, 6)}`" formula="∂L/∂w" />
        </div>

        <div class="grid gap-4 2xl:grid-cols-2">
          <div class="card"><h3 class="mb-1 font-semibold">Regression line moving</h3><PlotlyChart v-if="fitChart" :data="fitChart.data" :layout="fitChart.layout" /></div>
          <div class="card"><h3 class="mb-1 font-semibold">Loss curve (log scale)</h3><PlotlyChart v-if="lossChart" :data="lossChart.data" :layout="lossChart.layout" /></div>
        </div>

        <div class="grid gap-4 2xl:grid-cols-2">
          <div v-if="detail" class="card text-sm">
            <h3 class="mb-2 font-semibold">This iteration, step by step</h3>
            <ol class="space-y-1 font-mono text-xs">
              <li v-for="line in detail.narrative" :key="line" class="rounded bg-slate-50 px-2 py-1">{{ line }}</li>
            </ol>
            <details class="mt-3">
              <summary class="cursor-pointer text-xs font-medium text-brand-700">Per-point calculations ({{ detail.n }} points)</summary>
              <div class="mt-2 max-h-72 overflow-auto">
                <table class="w-full text-right text-xs tabular-nums">
                  <thead class="sticky top-0 bg-white"><tr class="text-slate-500"><th>x</th><th>y</th><th>ŷ = wx+b</th><th>e = ŷ−y</th><th>e²</th><th>e·x</th></tr></thead>
                  <tbody>
                    <tr v-for="(x, i) in detail.x" :key="i" class="border-t border-slate-100">
                      <td>{{ fmt(x, 3) }}</td><td>{{ fmt(detail.y[i], 3) }}</td><td>{{ fmt(detail.predictions[i], 3) }}</td>
                      <td>{{ fmt(detail.errors[i], 3) }}</td><td>{{ fmt(detail.squared_errors[i], 3) }}</td><td>{{ fmt(detail.error_times_x[i], 3) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
            <p class="mt-2 text-xs text-slate-500">Recomputed from the recorded (w, b); matches the logged gradients: {{ detail.matches_recorded.grad_w && detail.matches_recorded.grad_b ? 'yes' : 'no' }}.</p>
          </div>
          <div class="card"><h3 class="mb-1 font-semibold">Path through parameter space</h3><PlotlyChart v-if="paramChart" :data="paramChart.data" :layout="paramChart.layout" /></div>
        </div>

        <div v-if="summary && !summary.diverged" class="card text-sm">
          <h3 class="mb-2 font-semibold">Final model vs. standard least-squares regression</h3>
          <table class="w-full max-w-xl text-left tabular-nums">
            <thead><tr class="text-xs text-slate-500"><th /><th>slope</th><th>intercept</th></tr></thead>
            <tbody>
              <tr class="border-t"><td class="py-1">Gradient descent ({{ summary.iterations_run }} it., {{ summary.stop_reason }})</td><td>{{ fmt(summary.slope, 5) }}</td><td>{{ fmt(summary.intercept, 5) }}</td></tr>
              <tr class="border-t"><td class="py-1">Least squares (closed form)</td><td>{{ fmt(summary.ols_slope, 5) }}</td><td>{{ fmt(summary.ols_intercept, 5) }}</td></tr>
            </tbody>
          </table>
          <p class="mt-2 text-slate-600">
            <template v-if="Math.abs(summary.intercept - summary.ols_intercept) > 0.01 * Math.max(1, Math.abs(summary.ols_intercept))">
              Not converged yet: the slope is learned quickly but the intercept moves slowly because x is not centred (the loss surface is a long, narrow valley). More iterations, or standardizing x, fixes this.
            </template>
            <template v-else>Converged: gradient descent found the same line as least squares.</template>
          </p>
          <p v-if="datasetId === 'shah_regression' && p.loss === 'half_mse'" class="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Book note: Figure 8.11's cost curve starts near 3000 because the book's R cost function squares the <i>sum</i> of errors. The correct cost after iteration 1 is ≈ 175.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
