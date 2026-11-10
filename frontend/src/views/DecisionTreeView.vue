<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { api, trainAndWait } from '../api/endpoints'
import { errorMessage } from '../api/client'
import type { RunDetail, Tree, TreeNode } from '../types'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import DatasetConfig from '../components/ml/DatasetConfig.vue'
import TreeDiagram from '../components/ml/TreeDiagram.vue'
import RunResults from '../components/ml/RunResults.vue'
import PlotlyChart from '../components/charts/PlotlyChart.vue'
import { fmt } from '../utils/format'

const datasetId = ref('penguins')
const target = ref('species')
const features = ref<string[]>(['island', 'bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g', 'sex', 'year'])
const maxDepth = ref<number | null>(2)
const minSplit = ref(2)
const criterion = ref('')
const testSize = ref(0.2)
const seed = ref(1234)
const compareDepths = ref('1, 5, 7')

const busy = ref(false)
const error = ref<string | null>(null)
const run = ref<RunDetail | null>(null)
const splits = ref<any[]>([])
const selected = ref<TreeNode | null>(null)
const comparison = ref<{ depth: number; run: RunDetail }[]>([])
const cmpTab = ref(0)

const tree = computed(() => (run.value?.model_summary?.tree as Tree) ?? null)
const splitInfo = computed(() => (selected.value ? splits.value.find((s) => s.node_id === selected.value!.id) : null))

const presets = [
  { label: 'AC 6 · penguins species', ds: 'penguins', t: 'species', f: ['island', 'bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g', 'sex', 'year'], depths: '1, 5, 7' },
  { label: 'AC 3 · college private', ds: 'college', t: 'private', f: ['apps', 'accept', 'enroll', 'top_10_perc', 'top_25_perc', 'f_undergrad', 'p_undergrad', 'outstate', 'room_board', 'books', 'personal', 'ph_d', 'terminal', 's_f_ratio', 'perc_alumni', 'expend', 'grad_rate'], depths: '1, 2, 3' },
  { label: 'Car seats · sales_cat', ds: 'carseats', t: 'sales_cat', f: ['competitor_price', 'income', 'advertising', 'population', 'price', 'shelf_location', 'age', 'education', 'urban', 'us'], depths: '1, 3, 8' },
]
async function applyPreset(p: (typeof presets)[number]) {
  datasetId.value = p.ds
  await nextTick()
  target.value = p.t
  await nextTick()
  features.value = [...p.f]
  compareDepths.value = p.depths
}

function experiment(depth: number | null) {
  return { dataset_id: datasetId.value, algorithm: 'decision_tree' as const, target_column: target.value, feature_columns: features.value,
    hyperparameters: { max_depth: depth, min_samples_split: minSplit.value, criterion: criterion.value || null }, test_size: testSize.value, random_seed: seed.value }
}

async function trainOne() {
  error.value = null
  busy.value = true
  selected.value = null
  try {
    const st = await trainAndWait(experiment(maxDepth.value || null))
    if (st.status === 'FAILED') throw new Error(st.error ?? 'failed')
    run.value = await api.run(st.run_id)
    splits.value = (await api.steps(st.run_id)).splits ?? []
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function compare() {
  error.value = null
  busy.value = true
  comparison.value = []
  try {
    const depths = compareDepths.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((d) => d >= 1 && d <= 30)
    if (!depths.length) throw new Error('Enter depths such as 1, 5, 7')
    for (const d of depths) {
      const st = await trainAndWait(experiment(d))
      if (st.status === 'FAILED') throw new Error(st.error ?? 'failed')
      comparison.value.push({ depth: d, run: await api.run(st.run_id) })
    }
    cmpTab.value = 0
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
const cmpChart = computed(() => {
  if (!comparison.value.length) return null
  const isClf = comparison.value[0].run.metrics?.task === 'classification'
  const key = isClf ? 'accuracy' : 'r2'
  const x = comparison.value.map((c) => `depth ${c.depth} (${(c.run.model_summary!.tree as Tree).n_leaves} leaves)`)
  return { data: [
    { type: 'bar', name: 'training', x, y: comparison.value.map((c) => c.run.metrics!.train[key]), marker: { color: '#6366f1' } },
    { type: 'bar', name: 'test', x, y: comparison.value.map((c) => c.run.metrics!.test[key]), marker: { color: '#f59e0b' } },
  ], layout: { barmode: 'group', yaxis: { title: { text: key }, range: [0, 1.05] } } }
})
</script>

<template>
  <PageHeader title="Decision Tree Explorer" subtitle="Fit real decision trees, read every split, see how the algorithm chose it, and compare depths for interpretability versus complexity (DS4A §8.3)." />
  <div class="grid gap-6 xl:grid-cols-[22rem_1fr]">
    <div class="space-y-4">
      <div class="card space-y-3">
        <div class="label">Textbook presets</div>
        <div class="flex flex-wrap gap-1.5"><button v-for="p in presets" :key="p.label" class="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50" @click="applyPreset(p)">{{ p.label }}</button></div>
      </div>
      <form class="card space-y-4" @submit.prevent="trainOne">
        <DatasetConfig v-model:dataset-id="datasetId" v-model:target="target" v-model:features="features" />
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="dmd">Max depth</label><input id="dmd" v-model.number="maxDepth" type="number" min="1" max="30" class="input" placeholder="unlimited" /></div>
          <div><label class="label" for="dms">Min samples split</label><input id="dms" v-model.number="minSplit" type="number" min="2" class="input" /></div>
          <div><label class="label" for="dts">Test share</label><input id="dts" v-model.number="testSize" type="number" step="0.05" min="0.05" max="0.5" class="input" /></div>
          <div><label class="label" for="dsd">Seed</label><input id="dsd" v-model.number="seed" type="number" min="0" class="input" /></div>
        </div>
        <div><label class="label" for="dcr">Split criterion</label><select id="dcr" v-model="criterion" class="input"><option value="">default (gini / squared error)</option><option value="gini">gini</option><option value="entropy">entropy</option></select></div>
        <button class="btn-primary w-full justify-center" :disabled="busy || !target || !features.length">Train tree</button>
        <div class="border-t border-slate-100 pt-3">
          <label class="label" for="cmp">Compare depths</label>
          <div class="flex gap-2"><input id="cmp" v-model="compareDepths" class="input" /><button type="button" class="btn-secondary" :disabled="busy || !target || !features.length" @click="compare">Compare</button></div>
        </div>
        <StatusMessage v-if="busy" kind="loading" message="Training on the server…" />
        <StatusMessage kind="error" :message="error" />
      </form>
    </div>

    <div class="min-w-0 space-y-4">
      <template v-if="comparison.length">
        <div class="card">
          <h3 class="mb-1 font-semibold">Depth comparison — same split, seed {{ seed }}</h3>
          <PlotlyChart v-if="cmpChart" :data="cmpChart.data" :layout="cmpChart.layout" :height="300" />
          <div class="mt-2 flex flex-wrap gap-1 border-b border-slate-200">
            <button v-for="(c, i) in comparison" :key="c.depth" :class="['tab', cmpTab === i && 'tab-active']" @click="cmpTab = i">max depth {{ c.depth }}</button>
          </div>
          <p class="my-2 text-xs text-slate-500">Actual depth {{ (comparison[cmpTab].run.model_summary!.tree as Tree).depth }}, {{ (comparison[cmpTab].run.model_summary!.tree as Tree).n_splits }} splits. If the actual depth is smaller than max depth, every leaf was already pure — the limit was never reached.</p>
          <TreeDiagram :tree="comparison[cmpTab].run.model_summary!.tree as Tree" />
        </div>
      </template>

      <template v-if="tree && run">
        <div class="card">
          <h3 class="mb-3 font-semibold">Fitted tree — depth {{ tree.depth }}, {{ tree.n_splits }} splits, {{ tree.n_leaves }} leaves</h3>
          <TreeDiagram :tree="tree" :highlight="selected ? [selected.id] : []" @select="selected = $event" />
        </div>
        <div v-if="selected" class="card space-y-2 text-sm">
          <h3 class="font-semibold">Node #{{ selected.id }} {{ selected.is_leaf ? '(leaf)' : '' }}</h3>
          <p>{{ selected.samples }} training rows · impurity ({{ tree.criterion }}) = {{ fmt(selected.impurity) }} · prediction <b>{{ selected.prediction }}</b></p>
          <p v-if="selected.class_counts">Class counts: {{ selected.class_counts }}</p>
          <template v-if="splitInfo">
            <p><b>Question:</b> {{ splitInfo.question }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <div class="rounded bg-slate-50 p-2"><b>Yes →</b> {{ splitInfo.left.condition }}<br />{{ splitInfo.left.samples }} rows, impurity {{ fmt(splitInfo.left.impurity) }}</div>
              <div class="rounded bg-slate-50 p-2"><b>No →</b> {{ splitInfo.right.condition }}<br />{{ splitInfo.right.samples }} rows, impurity {{ fmt(splitInfo.right.impurity) }}</div>
            </div>
            <div class="formula text-xs">{{ splitInfo.calculation }}</div>
            <p class="text-xs text-slate-500">The algorithm tried every feature and threshold at this node and kept the one with the largest impurity decrease. Numeric thresholds are midpoints between neighbouring observed values (sklearn), which is why the book's R output may show a rounded number such as 207 instead of 206.5.</p>
          </template>
          <p v-else class="text-xs text-slate-500">A leaf predicts the majority class (classification) or the mean target (regression) of its training rows.</p>
        </div>
        <RunResults :run-id="run.run_id" />
      </template>
      <div v-if="!tree && !comparison.length" class="card text-sm text-slate-600">Pick a preset or configure a dataset, then train a tree or compare several depths. Click any node in the tree to see how its split was chosen.</div>
    </div>
  </div>
</template>
