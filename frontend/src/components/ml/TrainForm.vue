<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { trainAndWait } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useDatasets } from '../../stores/datasets'
import type { Algorithm, RunStatus, Task } from '../../types'
import StatusMessage from '../layout/StatusMessage.vue'
import DatasetConfig from './DatasetConfig.vue'

const props = defineProps<{ initialDataset?: string; allowedAlgorithms?: Algorithm[] }>()
const emit = defineEmits<{ trained: [runId: string] }>()

const store = useDatasets()
const datasetId = ref(props.initialDataset ?? '')
watch(() => props.initialDataset, (v) => v && (datasetId.value = v))
const target = ref('')
const features = ref<string[]>([])
const algorithm = ref<Algorithm>(props.allowedAlgorithms?.[0] ?? 'decision_tree')
const cfg = reactive({ test_size: 0.2, random_seed: 42, positive_label: '', max_depth: 3 as number | null, min_samples_split: 2, min_samples_leaf: 1,
  criterion: '', C: 1.0, threshold: 0.5, learning_rate: 0.1, iterations: 1000, standardize_x: true })
const busy = ref(false)
const status = ref<RunStatus | null>(null)
const error = ref<string | null>(null)

const targetCol = computed(() => store.byId(datasetId.value)?.column_metadata.find((c) => c.name === target.value))
const task = computed<Task | null>(() => (!targetCol.value ? null : targetCol.value.kind === 'categorical' || targetCol.value.unique <= 2 ? 'classification' : 'regression'))
const classes = computed(() => (targetCol.value?.kind === 'categorical' && targetCol.value.top_values ? Object.keys(targetCol.value.top_values) : []))
const algos = computed(() => {
  const all: { v: Algorithm; label: string; tasks: Task[] }[] = [
    { v: 'linear_regression', label: 'Linear regression', tasks: ['regression'] },
    { v: 'logistic_regression', label: 'Logistic regression', tasks: ['classification'] },
    { v: 'decision_tree', label: 'Decision tree', tasks: ['classification', 'regression'] },
    { v: 'gradient_descent', label: 'Gradient descent (1 feature, from scratch)', tasks: ['regression'] },
  ]
  return all.filter((a) => (!props.allowedAlgorithms || props.allowedAlgorithms.includes(a.v)) && (!task.value || a.tasks.includes(task.value)))
})
watch(algos, (a) => { if (a.length && !a.some((x) => x.v === algorithm.value)) algorithm.value = a[0].v })
const incompatible = computed(() => {
  if (algorithm.value === 'gradient_descent' && features.value.length !== 1) return 'Gradient descent (ŷ = wx + b) needs exactly one numeric feature.'
  return null
})

async function train() {
  error.value = null
  busy.value = true
  status.value = null
  try {
    const hp: Record<string, unknown> =
      algorithm.value === 'decision_tree' ? { max_depth: cfg.max_depth || null, min_samples_split: cfg.min_samples_split, min_samples_leaf: cfg.min_samples_leaf, criterion: cfg.criterion || null }
      : algorithm.value === 'logistic_regression' ? { C: cfg.C, threshold: classes.value.length === 2 ? cfg.threshold : null }
      : algorithm.value === 'gradient_descent' ? { learning_rate: cfg.learning_rate, iterations: cfg.iterations, standardize_x: cfg.standardize_x, loss: 'mse' }
      : {}
    const st = await trainAndWait({ dataset_id: datasetId.value, algorithm: algorithm.value, task: task.value, target_column: target.value,
      feature_columns: features.value, hyperparameters: hp, test_size: cfg.test_size, random_seed: cfg.random_seed,
      positive_label: cfg.positive_label || null }, (s) => (status.value = s))
    if (st.status === 'FAILED') error.value = `Training failed: ${st.error}`
    emit('trained', st.run_id)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="card space-y-4" @submit.prevent="train">
    <DatasetConfig v-model:dataset-id="datasetId" v-model:target="target" v-model:features="features" />
    <template v-if="target">
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Task detected from the target: <b>{{ task }}</b> {{ task === 'classification' ? '(categorical response)' : '(quantitative response)' }}</div>
      <div><label class="label" for="algo">Model</label>
        <select id="algo" v-model="algorithm" class="input"><option v-for="a in algos" :key="a.v" :value="a.v">{{ a.label }}</option></select></div>

      <div v-if="algorithm === 'decision_tree'" class="grid grid-cols-2 gap-3">
        <div><label class="label" for="md">Max depth</label><input id="md" v-model.number="cfg.max_depth" type="number" min="1" max="30" class="input" placeholder="unlimited" /></div>
        <div><label class="label" for="mss">Min samples to split</label><input id="mss" v-model.number="cfg.min_samples_split" type="number" min="2" max="1000" class="input" /></div>
        <div><label class="label" for="msl">Min samples per leaf</label><input id="msl" v-model.number="cfg.min_samples_leaf" type="number" min="1" max="1000" class="input" /></div>
        <div><label class="label" for="crit">Criterion</label><select id="crit" v-model="cfg.criterion" class="input"><option value="">default</option><template v-if="task === 'classification'"><option value="gini">gini</option><option value="entropy">entropy</option></template><template v-else><option value="squared_error">squared_error</option><option value="absolute_error">absolute_error</option></template></select></div>
      </div>
      <div v-if="algorithm === 'logistic_regression'" class="grid grid-cols-2 gap-3">
        <div><label class="label" for="C">C (inverse regularisation)</label><input id="C" v-model.number="cfg.C" type="number" step="any" min="0.0001" max="10000" class="input" /></div>
        <div v-if="classes.length === 2"><label class="label" for="thr">Decision threshold</label><input id="thr" v-model.number="cfg.threshold" type="number" step="0.05" min="0.05" max="0.95" class="input" /></div>
      </div>
      <div v-if="algorithm === 'gradient_descent'" class="grid grid-cols-2 gap-3">
        <div><label class="label" for="glr">Learning rate</label><input id="glr" v-model.number="cfg.learning_rate" type="number" step="any" class="input" /></div>
        <div><label class="label" for="git">Iterations</label><input id="git" v-model.number="cfg.iterations" type="number" min="1" max="100000" class="input" /></div>
        <label class="col-span-2 flex items-center gap-2 text-sm"><input v-model="cfg.standardize_x" type="checkbox" /> Standardize x</label>
      </div>
      <div v-if="task === 'classification' && classes.length === 2"><label class="label" for="pos">Positive class</label>
        <select id="pos" v-model="cfg.positive_label" class="input"><option value="">default ({{ [...classes].sort()[1] }})</option><option v-for="c in classes" :key="c" :value="c">{{ c }}</option></select></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="ts">Test share</label><input id="ts" v-model.number="cfg.test_size" type="number" step="0.05" min="0.05" max="0.5" class="input" /></div>
        <div><label class="label" for="seed">Random seed</label><input id="seed" v-model.number="cfg.random_seed" type="number" min="0" class="input" /></div>
      </div>
    </template>
    <StatusMessage kind="info" :message="incompatible" />
    <button class="btn-primary w-full justify-center" :disabled="busy || !target || !features.length || !!incompatible">{{ busy ? 'Training…' : 'Train model' }}</button>
    <div v-if="busy && status" class="space-y-1">
      <div class="h-2 overflow-hidden rounded bg-slate-100"><div class="h-2 bg-brand-500 transition-all" :style="{ width: `${Math.max(5, status.progress * 100)}%` }" /></div>
      <p class="text-xs text-slate-500">{{ status.status }} — progress reported by the server</p>
    </div>
    <StatusMessage kind="error" :message="error" />
  </form>
</template>
