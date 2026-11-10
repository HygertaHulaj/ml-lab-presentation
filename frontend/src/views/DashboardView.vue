<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, Brain, Database, GitBranch, PenLine, TrendingDown } from 'lucide-vue-next'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useDatasets } from '../stores/datasets'
import type { ExerciseSummary, Experiment } from '../types'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import OriginBadge from '../components/ml/OriginBadge.vue'
import { NAV } from '../components/layout/nav'
import { humanize } from '../utils/format'

const ds = useDatasets()
const exercises = ref<ExerciseSummary[]>([])
const recent = ref<Experiment[]>([])
const error = ref<string | null>(null)
onMounted(async () => {
  try {
    await ds.load(true)
    ;[exercises.value, recent.value] = await Promise.all([api.exercises(), api.experiments(8)])
  } catch (e) {
    error.value = errorMessage(e)
  }
})
const algorithms = [
  { name: 'Linear regression', icon: TrendingDown, desc: 'Least squares, coefficients, R², RMSE' },
  { name: 'Logistic regression', icon: Brain, desc: 'Probabilities and decision thresholds' },
  { name: 'Decision trees', icon: GitBranch, desc: 'Real splits, rules, prediction paths' },
  { name: 'Gradient descent', icon: TrendingDown, desc: 'From-scratch NumPy, every iteration logged' },
]
const byBook = computed(() => ({
  DS4A: exercises.value.filter((e) => e.book === 'DS4A'),
  HoIDS: exercises.value.filter((e) => e.book === 'HoIDS'),
}))
</script>

<template>
  <PageHeader title="ML " subtitle="Train, predict, explain & explore. An interactive laboratory for Lecture 8 — Machine Learning (DS4A Ch. 8 and Shah Ch. 8). Every number on these pages is computed from real model training or from the counts you enter." />
  <StatusMessage kind="error" :message="error" />

  <div class="grid gap-4 md:grid-cols-3">
    <div class="card"><div class="text-3xl font-bold">{{ exercises.length }}</div><div class="text-sm text-slate-500">textbook exercises with live solutions</div></div>
    <div class="card"><div class="text-3xl font-bold">{{ ds.items.length }}</div><div class="text-sm text-slate-500">datasets ({{ ds.items.filter((d) => d.origin === 'textbook').length }} from the textbooks)</div></div>
    <div class="card"><div class="text-3xl font-bold">4</div><div class="text-sm text-slate-500">trainable algorithms + evaluation tools</div></div>
  </div>

  <div class="mt-6 grid gap-6 lg:grid-cols-2">
    <section class="card">
      <h2 class="mb-3 flex items-center gap-2 font-semibold"><PenLine class="h-4 w-4" /> Exercises</h2>
      <div v-for="(list, book) in byBook" :key="book" class="mb-4">
        <div class="label">{{ book === 'DS4A' ? 'Data Science for All — Ch. 8 Applying the Concepts' : 'Hands-On Intro to Data Science — Ch. 8' }}</div>
        <ul class="divide-y divide-slate-100">
          <li v-for="e in list" :key="e.id">
            <RouterLink :to="`/exercises/${e.id}`" class="flex items-center justify-between gap-2 py-1.5 text-sm hover:text-brand-700">
              <span><span class="text-slate-400">{{ e.exercise_number }}</span> · {{ e.title }}</span>
              <span class="shrink-0 text-xs text-slate-400">{{ e.kind }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <div class="space-y-6">
      <section class="card">
        <h2 class="mb-3 font-semibold">Supported algorithms</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="a in algorithms" :key="a.name" class="flex gap-3 rounded-lg bg-slate-50 p-3">
            <component :is="a.icon" class="mt-0.5 h-5 w-5 text-brand-600" />
            <div><div class="text-sm font-medium">{{ a.name }}</div><div class="text-xs text-slate-500">{{ a.desc }}</div></div>
          </div>
        </div>
      </section>
      <section class="card">
        <h2 class="mb-3 flex items-center gap-2 font-semibold"><Database class="h-4 w-4" /> Datasets</h2>
        <ul class="space-y-1.5 text-sm">
          <li v-for="d in ds.items" :key="d.id" class="flex items-center justify-between gap-2">
            <span class="truncate">{{ d.name }}</span>
            <span class="flex shrink-0 items-center gap-2 text-xs text-slate-400">{{ d.row_count }} rows <OriginBadge :origin="d.origin" /></span>
          </li>
        </ul>
        <p class="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">Not bundled: the kangaroo nasal data for Shah TiY 8.1 (OA 8.2) could not be obtained from an authentic source. Upload it in “Solve a New Problem” and run TiY 8.1 from the Exercise Academy.</p>
      </section>
      <section class="card">
        <h2 class="mb-3 font-semibold">Recent experiments</h2>
        <p v-if="!recent.length" class="text-sm text-slate-500">No experiments yet — train a model in the Training Studio.</p>
        <ul class="space-y-1 text-sm">
          <li v-for="e in recent" :key="e.id" class="flex justify-between gap-2"><span class="truncate">{{ e.name }}</span><span class="shrink-0 text-xs text-slate-400">{{ humanize(e.status.toLowerCase()) }}</span></li>
        </ul>
      </section>
    </div>
  </div>

  <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <RouterLink v-for="n in NAV.slice(1)" :key="n.to" :to="n.to" class="card flex items-center justify-between gap-2 py-4 hover:border-brand-500">
      <span class="flex items-center gap-2 text-sm font-medium"><component :is="n.icon" class="h-4 w-4 text-brand-600" />{{ n.label }}</span>
      <ArrowRight class="h-4 w-4 text-slate-400" />
    </RouterLink>
  </section>
</template>
