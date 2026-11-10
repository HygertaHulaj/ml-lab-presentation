<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { api } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import type { RunDetail, Tree } from '../../types'
import { fmt, humanize, pct } from '../../utils/format'
import PlotlyChart from '../charts/PlotlyChart.vue'
import StatusMessage from '../layout/StatusMessage.vue'
import ConfusionMatrix from './ConfusionMatrix.vue'
import FormulaList from './FormulaList.vue'
import MetricCard from './MetricCard.vue'
import TreeDiagram from './TreeDiagram.vue'

/** Everything shown here is read from the training run stored by the backend. */
const props = defineProps<{ runId: string }>()
const run = ref<RunDetail | null>(null)
const expl = ref<Record<string, any> | null>(null)
const error = ref<string | null>(null)
const tab = ref<'results' | 'model' | 'explain' | 'predict'>('results')
const inputs = reactive<Record<string, string>>({})
const pred = ref<Record<string, any> | null>(null)
const predError = ref<string | null>(null)
const predicting = ref(false)

async function load() {
  error.value = null
  run.value = null
  expl.value = null
  pred.value = null
  try {
    run.value = await api.run(props.runId)
    if (run.value.status === 'COMPLETED') expl.value = await api.explanation(props.runId)
    for (const f of run.value.experiment.feature_columns) inputs[f] = ''
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(() => props.runId, load, { immediate: true })

const m = computed(() => run.value?.metrics ?? null)
const s = computed(() => run.value?.model_summary ?? null)
const isClf = computed(() => m.value?.task === 'classification')
const tree = computed<Tree | null>(() => (s.value?.tree as Tree) ?? null)

const avpChart = computed(() => {
  if (!m.value || isClf.value || !m.value.test_actual?.length) return null
  const a = m.value.test_actual as number[], p = m.value.test_predicted as number[]
  const lo = Math.min(...a, ...p), hi = Math.max(...a, ...p)
  return {
    data: [
      { x: a, y: p, mode: 'markers', type: 'scatter', name: 'test rows', marker: { color: '#6366f1', size: 7, opacity: 0.75 } },
      { x: [lo, hi], y: [lo, hi], mode: 'lines', name: 'perfect prediction (ŷ = y)', line: { dash: 'dash', color: '#94a3b8' } },
    ],
    layout: { xaxis: { title: { text: `actual ${run.value!.experiment.target_column}` } }, yaxis: { title: { text: 'predicted' } } },
  }
})

const thresholdChart = computed(() => {
  const c = m.value?.threshold_curve as any[] | undefined
  if (!c) return null
  const t = c.map((r) => r.threshold)
  const line = (k: string, color: string) => ({ x: t, y: c.map((r) => r[k]), name: k, mode: 'lines+markers', line: { color } })
  return {
    data: [line('precision', '#6366f1'), line('recall', '#f59e0b'), line('specificity', '#10b981'), line('accuracy', '#64748b')],
    layout: { xaxis: { title: { text: 'decision threshold for the positive class' } }, yaxis: { range: [0, 1.02] },
      shapes: [{ type: 'line', x0: m.value!.threshold, x1: m.value!.threshold, y0: 0, y1: 1, line: { dash: 'dot', color: '#ef4444' } }] },
  }
})

const importanceChart = computed(() => {
  const imp = tree.value?.feature_importances
  if (!imp || !Object.keys(imp).length) return null
  const e = Object.entries(imp).reverse()
  return { data: [{ type: 'bar', orientation: 'h', x: e.map((x) => x[1]), y: e.map((x) => x[0]), marker: { color: '#6366f1' } }],
    layout: { margin: { l: 160 }, xaxis: { title: { text: 'importance (share of impurity reduction)' } } } }
})

const coefChart = computed(() => {
  const c = s.value?.coefficients
  if (!c || typeof Object.values(c)[0] !== 'number') return null
  const e = Object.entries(c as Record<string, number>)
  return { data: [{ type: 'bar', x: e.map((x) => x[0]), y: e.map((x) => x[1]), marker: { color: e.map((x) => (x[1] >= 0 ? '#6366f1' : '#f43f5e')) } }],
    layout: { yaxis: { title: { text: 'coefficient' } } } }
})

const featureMeta = computed(() => run.value?.experiment.feature_columns ?? [])

async function predict() {
  predError.value = null
  pred.value = null
  predicting.value = true
  try {
    pred.value = await api.predict(props.runId, { ...inputs })
  } catch (e) {
    predError.value = errorMessage(e)
  } finally {
    predicting.value = false
  }
}
</script>

<template>
  <StatusMessage kind="error" :message="error" />
  <StatusMessage v-if="!run && !error" kind="loading" message="Loading training results…" />
  <div v-if="run" class="space-y-4">
    <StatusMessage v-if="run.status === 'FAILED'" kind="error" :message="`Training failed: ${run.error}`" />
    <template v-if="run.status === 'COMPLETED' && m && s">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Run <code>{{ run.run_id.slice(0, 8) }}</code></span>
        <span>{{ humanize(run.experiment.algorithm) }} · {{ run.experiment.task }}</span>
        <span>trained in {{ fmt(run.duration_ms, 0) }} ms</span>
        <span>{{ s.split?.train_rows }} train / {{ s.split?.test_rows }} test rows · seed {{ run.experiment.random_seed }}</span>
      </div>
      <div class="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        <button v-for="t in (['results', 'model', 'explain', 'predict'] as const)" :key="t" role="tab" :aria-selected="tab === t"
                :class="['tab', tab === t && 'tab-active']" @click="tab = t">
          {{ { results: 'Evaluation', model: 'Learned model', explain: 'Explanation', predict: 'Predict' }[t] }}
        </button>
      </div>

      <!-- EVALUATION -->
      <section v-if="tab === 'results'" class="space-y-4">
        <div v-if="!m.train" class="card text-sm text-slate-600">No metrics: the model could not produce finite predictions (see Explanation).</div>
        <template v-else-if="isClf">
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Train accuracy" :value="m.train.accuracy" />
            <MetricCard label="Test accuracy" :value="m.test.accuracy" />
            <MetricCard v-if="m.test.binary" label="Test precision" :value="m.test.binary.precision" :calc="m.test.binary.calculations.precision" />
            <MetricCard v-if="m.test.binary" label="Test recall" :value="m.test.binary.recall" :calc="m.test.binary.calculations.recall" />
            <MetricCard v-if="m.test.binary" label="Test specificity" :value="m.test.binary.specificity" :calc="m.test.binary.calculations.specificity" />
            <MetricCard v-if="m.test.binary" label="Test F1" :value="m.test.binary.f1" />
            <MetricCard v-if="!m.test.binary" label="Macro precision" :value="m.test.macro_precision" />
            <MetricCard v-if="!m.test.binary" label="Macro recall" :value="m.test.macro_recall" />
          </div>
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="card">
              <h3 class="mb-3 font-semibold">Test confusion matrix</h3>
              <ConfusionMatrix :labels="m.test.labels" :matrix="m.test.matrix" :positive-first="false" />
              <p v-if="m.positive_label" class="mt-3 text-xs text-slate-500">Positive class: <b>{{ m.positive_label }}</b>. Rows are actual classes, columns are predictions.</p>
              <p v-else class="mt-3 text-xs text-slate-500">{{ m.test.averaging_note }}</p>
            </div>
            <div v-if="thresholdChart" class="card">
              <h3 class="mb-1 font-semibold">Threshold trade-off (test data)</h3>
              <p class="text-xs text-slate-500">Each point is computed by re-classifying the test rows at that threshold. Red line = threshold used ({{ m.threshold }}).</p>
              <PlotlyChart :data="thresholdChart.data" :layout="thresholdChart.layout" />
            </div>
            <div v-else class="card">
              <h3 class="mb-2 font-semibold">Per-class metrics (one-vs-rest, test)</h3>
              <table class="w-full text-sm">
                <thead><tr class="text-left text-xs text-slate-500"><th>Class</th><th>Precision</th><th>Recall</th><th>Specificity</th></tr></thead>
                <tbody><tr v-for="(v, k) in m.test.per_class" :key="k" class="border-t border-slate-100">
                  <td class="py-1 font-medium">{{ k }}</td><td>{{ fmt(v.precision, 3) }}</td><td>{{ fmt(v.recall, 3) }}</td><td>{{ fmt(v.specificity, 3) }}</td>
                </tr></tbody>
              </table>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Train R²" :value="m.train.r2" formula="1 − SSres/SStot" />
            <MetricCard label="Test R²" :value="m.test.r2" />
            <MetricCard label="Test RMSE" :value="m.test.rmse" formula="√ mean((y − ŷ)²)" />
            <MetricCard label="Test MAE" :value="m.test.mae" formula="mean |y − ŷ|" />
          </div>
          <div v-if="avpChart" class="card">
            <h3 class="mb-1 font-semibold">Actual vs predicted (test rows)</h3>
            <p class="text-xs text-slate-500">Points on the dashed line are perfect predictions; vertical distance = error.</p>
            <PlotlyChart :data="avpChart.data" :layout="avpChart.layout" />
          </div>
        </template>
        <p v-if="expl?.generalization" class="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ expl.generalization }}</p>
      </section>

      <!-- LEARNED MODEL -->
      <section v-if="tab === 'model'" class="space-y-4">
        <div v-if="s.equation" class="card"><h3 class="mb-2 font-semibold">Fitted equation</h3><div class="formula">{{ s.equation }}</div></div>
        <div v-if="s.algorithm === 'gradient_descent'" class="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="slope (GD)" :value="s.slope" /><MetricCard label="intercept (GD)" :value="s.intercept" />
          <MetricCard label="slope (least squares)" :value="s.ols_slope" /><MetricCard label="intercept (least squares)" :value="s.ols_intercept" />
          <p class="text-sm text-slate-600 sm:col-span-2 lg:col-span-4">Stop reason: <b>{{ s.stop_reason }}</b> after {{ s.iterations_run }} iterations. Open the Gradient Descent visualizer to step through every update.</p>
        </div>
        <div v-if="coefChart" class="card"><h3 class="mb-2 font-semibold">Coefficients</h3><PlotlyChart :data="coefChart.data" :layout="coefChart.layout" :height="300" />
          <p v-if="s.note" class="text-xs text-slate-500">{{ s.note }}</p></div>
        <div v-if="tree" class="card"><h3 class="mb-3 font-semibold">Fitted tree — depth {{ tree.depth }}, {{ tree.n_leaves }} leaves</h3><TreeDiagram :tree="tree" /></div>
        <div v-if="importanceChart" class="card"><h3 class="mb-2 font-semibold">Feature importance</h3><PlotlyChart :data="importanceChart.data" :layout="importanceChart.layout" :height="280" /></div>
        <div v-if="s.rules" class="card">
          <h3 class="mb-2 font-semibold">Decision rules (one per leaf)</h3>
          <ol class="space-y-1.5 text-sm">
            <li v-for="r in s.rules" :key="r.leaf_id" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="font-semibold text-brand-700">IF</span> {{ r.conditions.join(' AND ') || '(always)' }}
              <span class="font-semibold text-brand-700">THEN</span> {{ typeof r.prediction === 'number' ? fmt(r.prediction) : r.prediction }}
              <span class="text-xs text-slate-500">— {{ r.samples }} training rows<template v-if="r.correct_in_leaf !== undefined">, {{ r.correct_in_leaf }} correct</template></span>
            </li>
          </ol>
        </div>
        <div class="card"><h3 class="mb-2 font-semibold">Mathematics</h3><FormulaList :formulas="s.formulas" /></div>
      </section>

      <!-- EXPLANATION -->
      <section v-if="tab === 'explain' && expl" class="card space-y-3 text-sm leading-relaxed">
        <p class="text-xs text-slate-500">Generated from this run's recorded values — Dataset → Algorithm → Mathematics → Visualization → Interpretation.</p>
        <div><h4 class="font-semibold">Data used</h4><p>{{ expl.dataset_used }} Target: <b>{{ expl.target }}</b>; features: {{ expl.features.join(', ') }}.</p><p class="text-slate-500">{{ expl.leakage_guard }}</p></div>
        <div><h4 class="font-semibold">What the model learns</h4><p>{{ expl.what_it_learns }}</p></div>
        <div><h4 class="font-semibold">How training worked</h4><p>{{ expl.how_training_works }}</p></div>
        <div v-if="expl.learned_parameters?.length"><h4 class="font-semibold">Learned parameters</h4><ul class="list-inside list-disc"><li v-for="p in expl.learned_parameters" :key="p">{{ p }}</li></ul></div>
        <div><h4 class="font-semibold">How predictions are made</h4><p>{{ expl.how_predictions_are_made }}</p></div>
        <div><h4 class="font-semibold">Performance</h4><p>{{ expl.performance }}</p><p v-if="expl.generalization">{{ expl.generalization }}</p></div>
        <div><h4 class="font-semibold">What this model cannot reliably conclude</h4><ul class="list-inside list-disc text-slate-700"><li v-for="l in expl.limitations" :key="l">{{ l }}</li></ul></div>
      </section>

      <!-- PREDICT -->
      <section v-if="tab === 'predict'" class="grid gap-4 lg:grid-cols-2">
        <form class="card space-y-3" @submit.prevent="predict">
          <h3 class="font-semibold">Predict a new observation</h3>
          <p class="text-xs text-slate-500">This uses the model trained in this run. It only makes sense for rows that resemble the training data.</p>
          <div v-for="f in featureMeta" :key="f">
            <label class="label" :for="'in-' + f">{{ f }}</label>
            <input :id="'in-' + f" v-model="inputs[f]" class="input" required :placeholder="`value for ${f}`" />
          </div>
          <button class="btn-primary" :disabled="predicting">{{ predicting ? 'Predicting…' : 'Predict' }}</button>
          <StatusMessage kind="error" :message="predError" />
        </form>
        <div v-if="pred" class="card space-y-3 text-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">Prediction</div>
          <div class="text-3xl font-bold text-brand-700">{{ typeof pred.prediction === 'number' ? fmt(pred.prediction) : pred.prediction }}</div>
          <div v-if="pred.probabilities" class="space-y-1">
            <div v-for="(p, c) in pred.probabilities" :key="c" class="flex items-center gap-2">
              <span class="w-24 truncate text-xs">{{ c }}</span>
              <div class="h-2 flex-1 rounded bg-slate-100"><div class="h-2 rounded bg-brand-500" :style="{ width: pct(p) }" /></div>
              <span class="w-14 text-right text-xs tabular-nums">{{ pct(p) }}</span>
            </div>
          </div>
          <template v-if="pred.explanation.type === 'linear' && pred.explanation.terms">
            <div class="formula">ŷ = {{ fmt(pred.explanation.intercept) }}<span v-for="t in pred.explanation.terms" :key="t.feature"> + ({{ fmt(t.coefficient) }} × {{ fmt(t.value) }})</span> = {{ fmt(pred.explanation.prediction) }}</div>
            <p class="text-xs text-slate-500">Each term is coefficient × input. Categorical inputs appear as 0/1 indicator columns.</p>
          </template>
          <div v-else-if="pred.explanation.type === 'linear'" class="formula">{{ pred.explanation.formula }}</div>
          <p v-else-if="pred.explanation.type === 'probability'" class="formula">{{ pred.explanation.rule }}</p>
          <template v-else-if="pred.explanation.type === 'tree_path'">
            <ol class="space-y-1">
              <li v-for="(st, i) in pred.explanation.steps" :key="i" class="rounded bg-slate-50 px-3 py-1.5">
                {{ Number(i) + 1 }}. {{ st.question }} value = {{ fmt(st.sample_value) }} → <b>{{ st.answer }}</b> <span class="text-slate-500">({{ st.condition_met }})</span>
              </li>
            </ol>
            <p>Reached leaf #{{ pred.explanation.leaf_id }} with {{ pred.explanation.leaf.samples }} training rows<span v-if="pred.explanation.leaf.class_counts">: {{ pred.explanation.leaf.class_counts }}</span>.</p>
            <TreeDiagram v-if="tree" :tree="tree" :highlight="pred.explanation.path" />
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
