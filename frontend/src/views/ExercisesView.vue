<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import type { ExerciseSummary } from '../types'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import OriginBadge from '../components/ml/OriginBadge.vue'

const items = ref<ExerciseSummary[]>([])
const error = ref<string | null>(null)
const loading = ref(true)
const book = ref<'all' | 'DS4A' | 'HoIDS'>('all')
onMounted(async () => {
  try { items.value = await api.exercises() } catch (e) { error.value = errorMessage(e) } finally { loading.value = false }
})
const shown = computed(() => items.value.filter((e) => book.value === 'all' || e.book === book.value))
const kindStyle: Record<string, string> = { conceptual: 'bg-sky-50 text-sky-700', computational: 'bg-violet-50 text-violet-700', training: 'bg-emerald-50 text-emerald-700' }
</script>

<template>
  <PageHeader title="Exercise Academy" subtitle="Every DS4A Chapter 8 'Applying the Concepts' activity and the Shah Chapter 8 exercises, with step-by-step solutions computed live.">
    <div class="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm" role="group" aria-label="Filter by book">
      <button v-for="b in (['all', 'DS4A', 'HoIDS'] as const)" :key="b" :class="['rounded-md px-3 py-1', book === b ? 'bg-brand-600 text-white' : 'text-slate-600']" @click="book = b">{{ b === 'all' ? 'All' : b }}</button>
    </div>
  </PageHeader>
  <StatusMessage v-if="loading" kind="loading" />
  <StatusMessage kind="error" :message="error" />
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <RouterLink v-for="e in shown" :key="e.id" :to="`/exercises/${e.id}`" class="card flex flex-col gap-2 transition hover:border-brand-500 hover:shadow-md">
      <div class="flex items-center justify-between gap-2 text-xs">
        <span class="font-semibold text-slate-500">{{ e.book }} · {{ e.exercise_number }}</span>
        <span :class="['rounded-full px-2 py-0.5 font-medium', kindStyle[e.kind]]">{{ e.kind }}</span>
      </div>
      <h3 class="font-semibold text-slate-900">{{ e.title }}</h3>
      <div class="mt-auto flex items-center justify-between text-xs text-slate-500">
        <span>{{ e.category }} · {{ e.source_page }}</span>
        <OriginBadge :origin="e.origin" />
      </div>
    </RouterLink>
  </div>
  <p class="mt-6 text-xs text-slate-500">Shah Chapter 8 contains only one “Try It Yourself” (8.1). Hands-On Problem 8.3 is included as the second student's exercise and is labelled as a Hands-On Problem, not a TiY.</p>
</template>
