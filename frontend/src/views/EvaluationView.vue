<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import ConfusionMatrix from '../components/ml/ConfusionMatrix.vue'
import MetricCard from '../components/ml/MetricCard.vue'
import DatasetConfig from '../components/ml/DatasetConfig.vue'
import PlotlyChart from '../components/charts/PlotlyChart.vue'
import { fmt } from '../utils/format'

// ---------------- confusion-matrix calculator
const cm = reactive({ tp: 22, fp: 11, fn: 11, tn: 37, positive_label: 'High', negative_label: 'Low' })
const cmResult = ref<Record<string, any> | null>(null)
const cmError = ref<string | null>(null)
async function calc() {
  cmError.value = null
  try { cmResult.value = await api.confusion({ ...cm }) } catch (e) { cmError.value = errorMessage(e); cmResult.value = null }
}
calc()
const cmPresets = [
  { label: 'Table 8.3 (DS4A p.382)', v: { tp: 22, fp: 11, fn: 11, tn: 37, positive_label: 'High', negative_label: 'Low' } },
  { label: 'AC 7 result (depth 1)', v: { tp: 12, fp: 5, fn: 21, tn: 43, positive_label: 'High', negative_label: 'Low' } },
  { label: 'AC 8 · Model 3 test', v: { tp: 48, fp: 33, fn: 0, tn: 0, positive_label: '1', negative_label: '0' } },
]

// ---------------- complexity lab
const datasetId = ref('carseats')
const target = ref('sales_cat')
const features = ref<string[]>(['competitor_price', 'income', 'advertising', 'population', 'price', 'shelf_location', 'age', 'education', 'urban', 'us'])
const maxD = ref(15)
const seed = ref(1234)
const testSize = ref(0.2)
const lab = ref<Record<string, any> | null>(null)
const labError = ref<string | null>(null)
const labBusy = ref(false)
async function runLab() {
  labError.value = null
  labBusy.value = true
  try {
    lab.value = await api.complexity({ dataset_id: datasetId.value, target_column: target.value, feature_columns: features.value,
      depths: Array.from({ length: maxD.value }, (_, i) => i + 1), random_seed: seed.value, test_size: testSize.value })
  } catch (e) { labError.value = errorMessage(e) } finally { labBusy.value = false }
}
const labChart = computed(() => {
  if (!lab.value) return null
  const r = lab.value.rows as any[]
  const shapes = lab.value.baseline != null ? [{ type: 'line', x0: 1, x1: r.length, y0: lab.value.baseline, y1: lab.value.baseline, line: { dash: 'dot', color: '#94a3b8' } }] : []
  return { data: [
    { x: r.map((x) => x.max_depth), y: r.map((x) => x.train), name: 'training', mode: 'lines+markers', line: { color: '#6366f1' } },
    { x: r.map((x) => x.max_depth), y: r.map((x) => x.test), name: 'test', mode: 'lines+markers', line: { color: '#f59e0b' } },
  ], layout: { xaxis: { title: { text: 'max depth (model complexity →)' }, dtick: 1 }, yaxis: { title: { text: lab.value.metric } }, shapes } }
})
</script>

<template>
  <PageHeader title="Model Evaluation Lab" subtitle="Practise confusion-matrix metrics with any counts, and see underfitting and overfitting emerge as a decision tree grows (DS4A §8.4)." />

  <section class="grid gap-6 xl:grid-cols-[22rem_1fr]">
    <form class="card space-y-3" @submit.prevent="calc">
      <h2 class="font-semibold">Confusion-matrix calculator</h2>
      <div class="flex flex-wrap gap-1.5"><button v-for="p in cmPresets" :key="p.label" type="button" class="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50" @click="Object.assign(cm, p.v); calc()">{{ p.label }}</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="pl">Positive label</label><input id="pl" v-model="cm.positive_label" class="input" /></div>
        <div><label class="label" for="nl">Negative label</label><input id="nl" v-model="cm.negative_label" class="input" /></div>
        <div><label class="label" for="tp">TP</label><input id="tp" v-model.number="cm.tp" type="number" min="0" class="input" /></div>
        <div><label class="label" for="fn">FN</label><input id="fn" v-model.number="cm.fn" type="number" min="0" class="input" /></div>
        <div><label class="label" for="fp">FP</label><input id="fp" v-model.number="cm.fp" type="number" min="0" class="input" /></div>
        <div><label class="label" for="tn">TN</label><input id="tn" v-model.number="cm.tn" type="number" min="0" class="input" /></div>
      </div>
      <button class="btn-primary w-full justify-center">Calculate</button>
      <StatusMessage kind="error" :message="cmError" />
      <dl class="space-y-1 text-xs text-slate-600">
        <div><b>TP</b> predicted positive, actually positive</div><div><b>FP</b> predicted positive, actually negative</div>
        <div><b>FN</b> predicted negative, actually positive</div><div><b>TN</b> predicted negative, actually negative</div>
      </dl>
    </form>
    <div v-if="cmResult" class="min-w-0 space-y-4">
      <div class="card"><ConfusionMatrix :labels="[cmResult.positive_label, cmResult.negative_label]" :matrix="cmResult.matrix.values" /></div>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard label="Accuracy" :value="cmResult.accuracy" formula="(TP + TN) / total" :calc="cmResult.calculations.accuracy" />
        <MetricCard label="Precision" :value="cmResult.precision" formula="TP / (TP + FP)" :calc="cmResult.calculations.precision" />
        <MetricCard label="Recall (sensitivity)" :value="cmResult.recall" formula="TP / (TP + FN)" :calc="cmResult.calculations.recall" />
        <MetricCard label="Specificity" :value="cmResult.specificity" formula="TN / (TN + FP)" :calc="cmResult.calculations.specificity" />
        <MetricCard label="F1" :value="cmResult.f1" formula="2PR / (P + R)" />
        <MetricCard label="Misclassification" :value="cmResult.misclassification_rate" formula="(FP + FN) / total" />
      </div>
      <p class="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">{{ cmResult.book_note }} Book formula value: TN/(TN+FN) = {{ fmt(cmResult.negative_predictive_value) }}.</p>
    </div>
  </section>

  <section class="mt-10">
    <h2 class="mb-1 text-xl font-bold">Underfitting & overfitting lab</h2>
    <p class="mb-4 max-w-3xl text-sm text-slate-600">One real decision tree is trained for every max depth on the same train/test split (fixed seed). Training performance keeps rising with complexity; test performance tells you when the extra complexity stops helping.</p>
    <div class="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <form class="card space-y-4" @submit.prevent="runLab">
        <DatasetConfig v-model:dataset-id="datasetId" v-model:target="target" v-model:features="features" />
        <div class="grid grid-cols-3 gap-3">
          <div><label class="label" for="lmd">Depths 1…</label><input id="lmd" v-model.number="maxD" type="number" min="2" max="30" class="input" /></div>
          <div><label class="label" for="lts">Test share</label><input id="lts" v-model.number="testSize" type="number" step="0.05" min="0.05" max="0.5" class="input" /></div>
          <div><label class="label" for="lsd">Seed</label><input id="lsd" v-model.number="seed" type="number" min="0" class="input" /></div>
        </div>
        <button class="btn-primary w-full justify-center" :disabled="labBusy || !target || !features.length">{{ labBusy ? 'Training trees…' : 'Run experiment' }}</button>
        <StatusMessage kind="error" :message="labError" />
      </form>
      <div v-if="lab" class="min-w-0 space-y-4">
        <div class="card"><PlotlyChart v-if="labChart" :data="labChart.data" :layout="labChart.layout" />
          <p v-if="lab.baseline != null" class="text-xs text-slate-500">Dotted line: accuracy of always predicting the most common class ({{ fmt(lab.baseline, 3) }}).</p></div>
        <div class="card">
          <ul class="mb-3 list-inside list-disc space-y-1 text-sm"><li v-for="n in lab.notes" :key="n">{{ n }}</li></ul>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-right text-sm tabular-nums">
              <thead class="sticky top-0 bg-white"><tr class="text-xs text-slate-500"><th class="text-left">max depth</th><th>actual depth</th><th>leaves</th><th>train</th><th>test</th><th>gap</th></tr></thead>
              <tbody>
                <tr v-for="r in lab.rows" :key="r.max_depth" :class="['border-t border-slate-100', lab.best?.max_depth === r.max_depth && 'bg-emerald-50 font-semibold']">
                  <td class="text-left">{{ r.max_depth }}</td><td>{{ r.actual_depth }}</td><td>{{ r.leaves }}</td><td>{{ fmt(r.train, 3) }}</td><td>{{ fmt(r.test, 3) }}</td><td>{{ fmt(r.gap, 3) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
