<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, Upload } from 'lucide-vue-next'
import { api, trainAndWait } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useDatasets } from '../stores/datasets'
import type { Algorithm, Dataset, RunDetail } from '../types'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import TrainForm from '../components/ml/TrainForm.vue'
import RunResults from '../components/ml/RunResults.vue'
import DatasetConfig from '../components/ml/DatasetConfig.vue'
import { fmt } from '../utils/format'

const CATEGORIES: { key: string; label: string; algos?: Algorithm[]; help: string }[] = [
  { key: 'regression', label: 'Regression', algos: ['linear_regression', 'decision_tree', 'gradient_descent'], help: 'Predict a quantitative target.' },
  { key: 'classification', label: 'Classification', algos: ['logistic_regression', 'decision_tree'], help: 'Predict a categorical target; get a confusion matrix.' },
  { key: 'tree', label: 'Decision tree', algos: ['decision_tree'], help: 'Readable rules and prediction paths.' },
  { key: 'confusion', label: 'Confusion-matrix analysis', algos: ['logistic_regression', 'decision_tree'], help: 'Train a classifier and analyse its errors (or use the calculator in the Evaluation Lab).' },
  { key: 'compare', label: 'Model comparison', help: 'Train every compatible model on the same split and compare test scores.' },
  { key: 'fit', label: 'Underfitting / overfitting', help: 'Train trees of increasing depth on your data.' },
  { key: 'gd', label: 'Gradient descent', help: 'Open the visualizer on your dataset.' },
]

const store = useDatasets()
store.load()
const category = ref('classification')
const datasetId = ref('')
const file = ref<File | null>(null)
const name = ref('')
const uploading = ref(false)
const upError = ref<string | null>(null)
const preview = ref<{ columns: string[]; rows: Record<string, unknown>[]; total_rows: number } | null>(null)
const runId = ref<string | null>(null)
const cat = computed(() => CATEGORIES.find((c) => c.key === category.value)!)
const ds = computed<Dataset | undefined>(() => store.byId(datasetId.value))

async function upload() {
  if (!file.value) return
  upError.value = null
  uploading.value = true
  try {
    const d = await api.upload(file.value, name.value || undefined)
    store.add(d)
    datasetId.value = d.id
  } catch (e) {
    upError.value = errorMessage(e)
  } finally {
    uploading.value = false
  }
}
watch(datasetId, async (id) => {
  preview.value = null
  runId.value = null
  if (id) preview.value = await api.preview(id, 10).catch(() => null)
})
const warnings = computed(() => {
  const w: string[] = []
  for (const c of ds.value?.column_metadata ?? []) {
    if (c.missing) w.push(`${c.name}: ${c.missing} missing values (will be imputed with the training median / most frequent value).`)
    if (c.kind === 'categorical' && c.unique > 50) w.push(`${c.name}: ${c.unique} distinct text values — probably an identifier; do not use it as a feature.`)
    if (c.unique === 1) w.push(`${c.name}: constant column — it carries no information.`)
  }
  return w
})

// ---- model comparison
const cTarget = ref('')
const cFeatures = ref<string[]>([])
const comparing = ref(false)
const cmpError = ref<string | null>(null)
const cmpRows = ref<{ algo: string; run: RunDetail }[]>([])
async function compareModels() {
  cmpError.value = null
  comparing.value = true
  cmpRows.value = []
  try {
    const col = ds.value!.column_metadata.find((c) => c.name === cTarget.value)!
    const isClf = col.kind === 'categorical' || col.unique <= 2
    const algos: Algorithm[] = isClf ? ['logistic_regression', 'decision_tree'] : ['linear_regression', 'decision_tree']
    for (const a of algos) {
      const hp = a === 'decision_tree' ? { max_depth: 4 } : {}
      const st = await trainAndWait({ dataset_id: datasetId.value, algorithm: a, target_column: cTarget.value, feature_columns: cFeatures.value, hyperparameters: hp, test_size: 0.2, random_seed: 42 })
      if (st.status === 'FAILED') throw new Error(`${a}: ${st.error}`)
      cmpRows.value.push({ algo: a + (a === 'decision_tree' ? ' (depth 4)' : ''), run: await api.run(st.run_id) })
    }
  } catch (e) {
    cmpError.value = errorMessage(e)
  } finally {
    comparing.value = false
  }
}

// ---- complexity
const fitResult = ref<Record<string, any> | null>(null)
const fitError = ref<string | null>(null)
async function runFit() {
  fitError.value = null
  try {
    fitResult.value = await api.complexity({ dataset_id: datasetId.value, target_column: cTarget.value, feature_columns: cFeatures.value, depths: Array.from({ length: 12 }, (_, i) => i + 1), random_seed: 42 })
  } catch (e) { fitError.value = errorMessage(e) }
}

// ---- export
async function exportRun() {
  if (!runId.value) return
  const [run, explanation] = await Promise.all([api.run(runId.value), api.explanation(runId.value).catch(() => null)])
  download(`experiment-${runId.value.slice(0, 8)}.json`, JSON.stringify({ exported_at: new Date().toISOString(), dataset: ds.value, run, explanation }, null, 2), 'application/json')
  const a = run.metrics?.test_actual as unknown[] | undefined, p = run.metrics?.test_predicted as unknown[] | undefined
  if (a?.length && p) download(`test-predictions-${runId.value.slice(0, 8)}.csv`, 'actual,predicted\n' + a.map((v, i) => `${v},${p[i]}`).join('\n'), 'text/csv')
}
function download(fname: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const el = document.createElement('a')
  el.href = url
  el.download = fname
  el.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <PageHeader title="Solve a New Problem" subtitle="Bring your own CSV. The same algorithms are re-trained on your data — a model trained on one dataset never 'understands' another without retraining and validation." />

  <ol class="space-y-6">
    <li class="card">
      <h2 class="mb-3 font-semibold">1 · Problem category</h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button v-for="c in CATEGORIES" :key="c.key" :class="['rounded-lg border p-3 text-left', category === c.key ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50']" @click="category = c.key; runId = null">
          <div class="text-sm font-medium">{{ c.label }}</div><div class="text-xs text-slate-500">{{ c.help }}</div>
        </button>
      </div>
    </li>

    <li class="card">
      <h2 class="mb-3 font-semibold">2 · Dataset</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <form class="space-y-3" @submit.prevent="upload">
          <label class="label" for="csv">Upload a CSV (max 5 MB, 100 000 rows, 100 columns)</label>
          <input id="csv" type="file" accept=".csv,text/csv" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" />
          <input v-model="name" class="input" placeholder="Dataset name (optional)" />
          <button class="btn-primary" :disabled="!file || uploading"><Upload class="h-4 w-4" />{{ uploading ? 'Uploading…' : 'Upload' }}</button>
          <StatusMessage kind="error" :message="upError" />
          <p class="text-xs text-slate-500">The file is parsed as data only (never executed) and stored under a server-generated name.</p>
        </form>
        <div>
          <label class="label" for="pick">…or use an existing dataset</label>
          <select id="pick" v-model="datasetId" class="input"><option value="">— choose —</option><option v-for="d in store.items" :key="d.id" :value="d.id">{{ d.name }} ({{ d.origin }})</option></select>
        </div>
      </div>
    </li>

    <li v-if="ds && preview" class="card">
      <h2 class="mb-3 font-semibold">3 · Inspect — {{ ds.name }} ({{ ds.row_count }} rows × {{ ds.column_metadata.length }} columns)</h2>
      <div class="max-h-72 overflow-auto rounded border border-slate-200">
        <table class="min-w-full text-xs">
          <thead class="sticky top-0 bg-slate-50"><tr><th v-for="c in preview.columns" :key="c" class="px-2 py-1 text-left font-semibold whitespace-nowrap">{{ c }}</th></tr></thead>
          <tbody><tr v-for="(r, i) in preview.rows" :key="i" class="border-t border-slate-100"><td v-for="c in preview.columns" :key="c" class="px-2 py-1 whitespace-nowrap">{{ r[c] ?? '∅' }}</td></tr></tbody>
        </table>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="c in ds.column_metadata" :key="c.name" class="rounded bg-slate-50 px-3 py-2 text-xs">
          <b>{{ c.name }}</b> · {{ c.kind }} · {{ c.unique }} distinct<span v-if="c.missing" class="text-amber-700"> · {{ c.missing }} missing</span>
          <div v-if="c.kind === 'numeric'" class="text-slate-500">min {{ fmt(c.min, 3) }} · mean {{ fmt(c.mean, 3) }} · max {{ fmt(c.max, 3) }}</div>
        </div>
      </div>
      <ul v-if="warnings.length" class="mt-3 space-y-1 text-xs text-amber-800"><li v-for="w in warnings" :key="w">⚠ {{ w }}</li></ul>
    </li>

    <li v-if="ds" class="space-y-4">
      <h2 class="font-semibold">4–8 · Configure, train, evaluate, predict</h2>
      <div v-if="cat.algos" class="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <TrainForm :key="datasetId + category" :initial-dataset="datasetId" :allowed-algorithms="cat.algos" @trained="runId = $event" />
        <div class="min-w-0">
          <RunResults v-if="runId" :run-id="runId" />
          <p v-else class="card text-sm text-slate-600">Choose the target and features, then train.</p>
        </div>
      </div>
      <div v-else-if="category === 'gd'" class="card text-sm">
        <p>Gradient descent uses one numeric feature and a numeric target.</p>
        <RouterLink :to="{ path: '/gradient-descent', query: { dataset: datasetId } }" class="btn-primary mt-3">Open the Gradient Descent Visualizer with {{ ds.name }}</RouterLink>
      </div>
      <div v-else class="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <form class="card space-y-4" @submit.prevent="category === 'compare' ? compareModels() : runFit()">
          <DatasetConfig v-model:dataset-id="datasetId" v-model:target="cTarget" v-model:features="cFeatures" />
          <button class="btn-primary w-full justify-center" :disabled="comparing || !cTarget || !cFeatures.length">{{ category === 'compare' ? (comparing ? 'Training models…' : 'Compare models') : 'Run complexity experiment' }}</button>
          <StatusMessage kind="error" :message="cmpError || fitError" />
        </form>
        <div class="min-w-0">
          <div v-if="category === 'compare' && cmpRows.length" class="card overflow-x-auto">
            <h3 class="mb-2 font-semibold">Same split (seed 42, 20% test) — test performance</h3>
            <table class="w-full text-sm tabular-nums">
              <thead><tr class="text-left text-xs text-slate-500"><th>Model</th><th>Train</th><th>Test</th><th>Details</th></tr></thead>
              <tbody><tr v-for="r in cmpRows" :key="r.algo" class="border-t border-slate-100">
                <td class="py-1.5 font-medium">{{ r.algo }}</td>
                <template v-if="r.run.metrics?.task === 'classification'"><td>acc {{ fmt(r.run.metrics.train.accuracy, 3) }}</td><td>acc {{ fmt(r.run.metrics.test.accuracy, 3) }}</td></template>
                <template v-else><td>R² {{ fmt(r.run.metrics?.train.r2, 3) }}</td><td>R² {{ fmt(r.run.metrics?.test.r2, 3) }} · RMSE {{ fmt(r.run.metrics?.test.rmse, 3) }}</td></template>
                <td><button class="text-xs text-brand-600 hover:underline" @click="runId = r.run.run_id">inspect</button></td>
              </tr></tbody>
            </table>
            <p class="mt-2 text-xs text-slate-500">"No free lunch" (DS4A §8.4): no single method is best for every problem — compare on test data.</p>
            <RunResults v-if="runId" class="mt-4" :run-id="runId" />
          </div>
          <div v-if="category === 'fit' && fitResult" class="card">
            <table class="w-full text-right text-sm tabular-nums">
              <thead><tr class="text-xs text-slate-500"><th class="text-left">max depth</th><th>leaves</th><th>train</th><th>test</th><th>gap</th></tr></thead>
              <tbody><tr v-for="r in fitResult.rows" :key="r.max_depth" :class="['border-t border-slate-100', fitResult.best?.max_depth === r.max_depth && 'bg-emerald-50 font-semibold']">
                <td class="text-left">{{ r.max_depth }}</td><td>{{ r.leaves }}</td><td>{{ fmt(r.train, 3) }}</td><td>{{ fmt(r.test, 3) }}</td><td>{{ fmt(r.gap, 3) }}</td></tr></tbody>
            </table>
            <ul class="mt-3 list-inside list-disc text-sm"><li v-for="n in fitResult.notes" :key="n">{{ n }}</li></ul>
            <RouterLink to="/evaluation" class="mt-2 inline-block text-sm text-brand-600 hover:underline">Chart view in the Evaluation Lab →</RouterLink>
          </div>
        </div>
      </div>
    </li>

    <li v-if="runId" class="card flex flex-wrap items-center justify-between gap-3">
      <div><h2 class="font-semibold">9 · Export</h2><p class="text-sm text-slate-600">Download the experiment (configuration, metrics, learned model, explanation) as JSON, and the test predictions as CSV.</p></div>
      <button class="btn-secondary" @click="exportRun"><Download class="h-4 w-4" /> Export results</button>
    </li>
  </ol>
</template>
