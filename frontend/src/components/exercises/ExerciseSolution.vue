<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import type { ExerciseDetail, SolveResult, Tree } from '../../types'
import { fmt } from '../../utils/format'
import PlotlyChart from '../charts/PlotlyChart.vue'
import ConfusionMatrix from '../ml/ConfusionMatrix.vue'
import TreeDiagram from '../ml/TreeDiagram.vue'
import AnswerValue from './AnswerValue.vue'

/** Renders a solver result: numbered answers (optionally hidden for practice) + the visuals the result contains. */
const props = defineProps<{ exercise: ExerciseDetail; result: SolveResult; practice?: boolean }>()
const revealed = reactive<Record<string, boolean>>({})
const depthTab = ref(0)
const prompts = computed(() => Object.fromEntries(props.exercise.questions.map((q) => [q.id, q.prompt])))
const r = computed(() => props.result as Record<string, any>)

const ac8Chart = computed(() => {
  const t = r.value.accuracy_table as { model: string; dataset: string; exact: number }[] | undefined
  if (!t) return null
  const models = [...new Set(t.map((x) => x.model))]
  const series = (ds: string, color: string) => ({ type: 'bar', name: ds, x: models.map((m) => m.replace('_', ' ')), y: models.map((m) => t.find((x) => x.model === m && x.dataset === ds)!.exact), marker: { color }, text: models.map((m) => t.find((x) => x.model === m && x.dataset === ds)!.exact.toFixed(2)), textposition: 'outside' })
  return { data: [series('training', '#6366f1'), series('testing', '#f59e0b')], layout: { barmode: 'group', yaxis: { range: [0, 1], title: { text: 'accuracy' } } } }
})

const gd = computed(() => r.value.gradient_descent as Record<string, any> | undefined)
const gdChart = computed(() => {
  if (!gd.value || !r.value.data) return null
  const x = r.value.data.x as number[], y = r.value.data.y as number[]
  const lo = Math.min(...x), hi = Math.max(...x)
  const ols = r.value.ols
  const hist = (gd.value.history ?? []) as { iteration: number; w: number; b: number }[]
  const pick = hist.filter((_, i) => i < 5 || i % Math.max(1, Math.floor(hist.length / 12)) === 0)
  return {
    data: [
      { x, y, mode: 'markers', name: 'data', marker: { color: '#334155', size: 8 } },
      ...pick.map((h, i) => ({ x: [lo, hi], y: [h.w * lo + h.b, h.w * hi + h.b], mode: 'lines', showlegend: i === 0, name: 'GD lines (iterations)', line: { color: 'rgba(239,68,68,0.3)' } })),
      { x: [lo, hi], y: [gd.value.w * lo + gd.value.b, gd.value.w * hi + gd.value.b], mode: 'lines', name: 'GD final', line: { color: '#ef4444', width: 3 } },
      { x: [lo, hi], y: [ols.slope * lo + ols.intercept, ols.slope * hi + ols.intercept], mode: 'lines', name: 'least squares', line: { color: '#10b981', dash: 'dash', width: 2 } },
    ],
    layout: {},
  }
})
const lossChart = computed(() => {
  const h = (gd.value?.history ?? r.value.gradient_descent?.history) as { iteration: number; loss?: number; cost?: number }[] | undefined
  if (!h?.length) return null
  return { data: [{ x: h.map((s) => s.iteration), y: h.map((s) => s.loss ?? s.cost), mode: 'lines', line: { color: '#4f46e5' } }],
    layout: { xaxis: { title: { text: 'iteration' } }, yaxis: { title: { text: 'cost' }, type: 'log' } } }
})
const olsChart = computed(() => {
  if (gd.value || !r.value.ols || !r.value.data) return null
  const x = r.value.data.x as number[], y = r.value.data.y as number[]
  const lo = Math.min(...x), hi = Math.max(...x), o = r.value.ols
  return { data: [{ x, y, mode: 'markers', name: 'data', marker: { color: '#334155', size: 8 } },
    { x: [lo, hi], y: [o.slope * lo + o.intercept, o.slope * hi + o.intercept], mode: 'lines', name: `ŷ = ${o.slope.toFixed(3)}x ${o.intercept >= 0 ? '+' : '−'} ${Math.abs(o.intercept).toFixed(3)}`, line: { color: '#4f46e5', width: 3 } }], layout: {} }
})
</script>

<template>
  <div class="space-y-5">
    <ol class="space-y-3">
      <li v-for="a in result.answers" :key="a.id" class="rounded-lg border border-slate-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-medium text-slate-800"><span class="mr-1 text-brand-600">Q{{ a.id }}.</span> {{ prompts[a.id] ?? a.prompt ?? '' }}</p>
          <button v-if="practice" class="btn-secondary shrink-0 px-2 py-1 text-xs" @click="revealed[a.id] = !revealed[a.id]">
            <EyeOff v-if="revealed[a.id]" class="h-3.5 w-3.5" /><Eye v-else class="h-3.5 w-3.5" />{{ revealed[a.id] ? 'Hide' : 'Reveal' }}
          </button>
        </div>
        <div v-if="!practice || revealed[a.id]" class="mt-2 space-y-2">
          <div class="text-sm"><AnswerValue :value="a.answer" /></div>
          <p v-if="a.explanation" class="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{{ a.explanation }}</p>
        </div>
        <p v-else class="mt-2 text-xs text-slate-400">Answer hidden — work it out first, then reveal.</p>
      </li>
    </ol>

    <div v-if="r.tree && (!practice || Object.keys(revealed).length)" class="card">
      <h3 class="mb-2 font-semibold">Fitted tree (from scikit-learn)</h3>
      <TreeDiagram :tree="r.tree as Tree" />
    </div>
    <div v-if="r.trees" class="card">
      <div class="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
        <button v-for="(t, i) in r.trees" :key="i" :class="['tab', depthTab === Number(i) && 'tab-active']" @click="depthTab = Number(i)">max depth {{ t.max_depth }}</button>
      </div>
      <table class="mb-3 w-full text-sm">
        <thead><tr class="text-left text-xs text-slate-500"><th>max depth</th><th>actual depth</th><th>splits</th><th>leaves</th><th>correct (training)</th><th>features used</th></tr></thead>
        <tbody><tr v-for="s in r.summary" :key="s.max_depth" class="border-t border-slate-100"><td>{{ s.max_depth }}</td><td>{{ s.actual_depth }}</td><td>{{ s.splits }}</td><td>{{ s.leaves }}</td><td>{{ s.correct }}/{{ s.n }} ({{ fmt(s.training_accuracy, 3) }})</td><td class="text-xs">{{ s.features_used.join(', ') }}</td></tr></tbody>
      </table>
      <TreeDiagram :tree="r.trees[depthTab].tree as Tree" />
    </div>
    <div v-if="r.confusion_matrix" class="card">
      <h3 class="mb-2 font-semibold">Test confusion matrix</h3>
      <ConfusionMatrix :labels="r.confusion_matrix.labels" :matrix="r.confusion_matrix.matrix" />
      <p class="mt-2 text-center text-xs text-slate-500">{{ r.confusion_matrix.layout }}; positive class = {{ r.confusion_matrix.labels[0] }}</p>
    </div>
    <div v-if="ac8Chart" class="card">
      <h3 class="mb-2 font-semibold">Training vs testing accuracy</h3>
      <PlotlyChart :data="ac8Chart.data" :layout="ac8Chart.layout" :height="320" />
      <div class="mt-3 grid gap-4 md:grid-cols-3">
        <div v-for="(sets, name) in exercise.parameters.matrices as Record<string, any>" :key="name" class="space-y-2">
          <div class="text-center text-xs font-semibold">{{ String(name).replace('_', ' ') }}</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="split in ['training', 'testing']" :key="split"><div class="text-center text-[10px] text-slate-500">{{ split }}</div><ConfusionMatrix :labels="['0', '1']" :matrix="sets[split]" :positive-first="false" /></div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="olsChart" class="card"><h3 class="mb-2 font-semibold">Fitted line</h3><PlotlyChart :data="olsChart.data" :layout="olsChart.layout" /></div>
    <div v-if="gdChart" class="card"><h3 class="mb-2 font-semibold">Gradient descent vs least squares</h3><PlotlyChart :data="gdChart.data" :layout="gdChart.layout" />
      <RouterLink to="/gradient-descent" class="text-sm text-brand-600 hover:underline">Step through every iteration in the Gradient Descent Visualizer →</RouterLink></div>
    <div v-if="lossChart" class="card"><h3 class="mb-2 font-semibold">Cost per iteration (correct sum of squared errors)</h3><PlotlyChart :data="lossChart.data" :layout="lossChart.layout" :height="280" /></div>
  </div>
</template>
