<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Check, RefreshCw, X } from 'lucide-vue-next'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { usePractice } from '../stores/practice'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import { fmt, humanize, pct } from '../utils/format'

const store = usePractice()
const categories = ref<Record<string, string>>({})
const difficulties = ref<string[]>([])
const category = ref('confusion_matrix')
const difficulty = ref('beginner')
const problem = ref<Record<string, any> | null>(null)
const answers = reactive<Record<string, string>>({})
const feedback = ref<Awaited<ReturnType<typeof api.practiceCheck>> | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const c = await api.practiceCategories()
    categories.value = c.categories
    difficulties.value = c.difficulties
    await next()
  } catch (e) { error.value = errorMessage(e) }
})

async function next() {
  error.value = null
  feedback.value = null
  for (const k of Object.keys(answers)) delete answers[k]
  try { problem.value = await api.practiceNew(category.value, difficulty.value) } catch (e) { error.value = errorMessage(e) }
}
async function check() {
  if (!problem.value) return
  try {
    feedback.value = await api.practiceCheck(problem.value.problem_id, { ...answers })
    store.record({ problemId: problem.value.problem_id, category: category.value, difficulty: difficulty.value, correct: feedback.value.correct, at: Date.now() })
  } catch (e) { error.value = errorMessage(e) }
}
const choiceFields: Record<string, string[]> = { approach: ['regression', 'classification'], diagnosis: ['overfitted', 'well-fitted', 'underfitted'] }
</script>

<template>
  <PageHeader title="Practice Mode" subtitle="Fresh, automatically generated problems. Answers are checked by recomputing the solution on the server (two-decimal rounding is accepted)." />
  <div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
    <div class="space-y-4">
      <div class="card flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1"><label class="label" for="pc">Category</label><select id="pc" v-model="category" class="input" @change="next"><option v-for="(d, k) in categories" :key="k" :value="k">{{ d }}</option></select></div>
        <div><label class="label" for="pd">Difficulty</label><select id="pd" v-model="difficulty" class="input" @change="next"><option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option></select></div>
        <button class="btn-secondary" @click="next"><RefreshCw class="h-4 w-4" /> New problem</button>
      </div>
      <StatusMessage kind="error" :message="error" />
      <form v-if="problem" class="card space-y-4" @submit.prevent="check">
        <div class="text-xs font-semibold text-slate-500 uppercase">{{ problem.title }} · {{ problem.difficulty }}</div>
        <p class="text-base">{{ problem.prompt }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="f in problem.answer_fields" :key="f">
            <label class="label" :for="'a-' + f">{{ humanize(f) }}</label>
            <select v-if="choiceFields[f]" :id="'a-' + f" v-model="answers[f]" class="input"><option value="" disabled>choose…</option><option v-for="c in choiceFields[f]" :key="c" :value="c">{{ c }}</option></select>
            <input v-else :id="'a-' + f" v-model="answers[f]" class="input" inputmode="decimal" placeholder="number or 'undefined'" />
          </div>
        </div>
        <button class="btn-primary">Check answer</button>
        <div v-if="feedback" :class="['rounded-lg p-4 text-sm', feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900']">
          <p class="mb-2 flex items-center gap-2 font-semibold"><Check v-if="feedback.correct" class="h-4 w-4" /><X v-else class="h-4 w-4" />{{ feedback.correct ? 'Correct!' : 'Not all answers are correct.' }}</p>
          <ul class="mb-2 space-y-0.5">
            <li v-for="(r, k) in feedback.results" :key="k">{{ humanize(String(k)) }}: you gave <b>{{ r.given ?? '—' }}</b>, expected <b>{{ r.expected === null ? 'undefined' : fmt(r.expected) }}</b> {{ r.correct ? '✓' : '✗' }}</li>
          </ul>
          <div class="text-xs font-semibold uppercase opacity-70">Worked solution</div>
          <ol class="mt-1 list-inside list-decimal space-y-0.5 font-mono text-xs"><li v-for="e in feedback.explanation" :key="e">{{ e }}</li></ol>
        </div>
      </form>
    </div>
    <aside class="card h-fit space-y-3 text-sm">
      <h3 class="font-semibold">This session</h3>
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class="rounded bg-slate-50 p-2"><div class="text-2xl font-bold">{{ store.attempts.length }}</div><div class="text-xs text-slate-500">attempts</div></div>
        <div class="rounded bg-slate-50 p-2"><div class="text-2xl font-bold">{{ store.solved }}</div><div class="text-xs text-slate-500">solved</div></div>
      </div>
      <p>Accuracy: <b>{{ pct(store.accuracy, 0) }}</b></p>
      <ul class="space-y-1 text-xs">
        <li v-for="(v, k) in store.byCategory" :key="k" class="flex justify-between"><span>{{ humanize(String(k)) }}</span><span>{{ v.correct }}/{{ v.tries }}</span></li>
      </ul>
      <p class="text-xs text-slate-400">Progress is kept only for this browser session.</p>
    </aside>
  </div>
</template>
