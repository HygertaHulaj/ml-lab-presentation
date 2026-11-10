<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useDatasets } from '../stores/datasets'
import type { ExerciseDetail, SolveResult } from '../types'
import PageHeader from '../components/layout/PageHeader.vue'
import StatusMessage from '../components/layout/StatusMessage.vue'
import OriginBadge from '../components/ml/OriginBadge.vue'
import ExerciseSolution from '../components/exercises/ExerciseSolution.vue'
import { humanize } from '../utils/format'
import { activityById } from '../activities/registry'

const props = defineProps<{ id: string }>()
const ex = ref<ExerciseDetail | null>(null)
const result = ref<SolveResult | null>(null)
const expResult = ref<SolveResult | null>(null)
const similar = ref<{ prompt: string; answer: string; explanation: string; origin: string }[]>([])
const error = ref<string | null>(null)
const expError = ref<string | null>(null)
const loading = ref(false)
const tab = ref('problem')
const practice = ref(false)
const shownSimilar = ref<Record<number, boolean>>({})
const params = ref<Record<string, unknown>>({})
const matricesJson = ref('')
const datasetId = ref('')
const ds = useDatasets()

const TABS = [['problem', '1 · Problem'], ['understand', '2 · Understand'], ['solve', '3 · Solve step by step'], ['code', '4 · Python'],
  ['experiment', '5 · Experiment'], ['interpret', '6 · Interpretation'], ['similar', '7 · Similar problems']] as const

async function load() {
  error.value = null
  result.value = expResult.value = null
  tab.value = 'problem'
  try {
    ex.value = await api.exercise(props.id)
    similar.value = await api.similar(props.id)
    params.value = JSON.parse(JSON.stringify(ex.value.parameters ?? {}))
    matricesJson.value = params.value.matrices ? JSON.stringify(params.value.matrices, null, 1) : ''
    if (ex.value.id !== 'hoids-tiy8-1') {
      loading.value = true
      result.value = await api.solve(props.id)
    }
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(() => ds.load())
watch(() => props.id, load, { immediate: true })

const scalarParams = computed(() => Object.entries(params.value).filter(([k, v]) => k !== 'dataset_id' && (typeof v !== 'object' || v === null)))
async function rerun() {
  expError.value = null
  expResult.value = null
  try {
    const p: Record<string, unknown> = { ...params.value }
    if (matricesJson.value) p.matrices = JSON.parse(matricesJson.value)
    if (typeof p.depths === 'string') p.depths = (p.depths as string).split(',').map((s) => parseInt(s.trim(), 10))
    delete p.dataset_id
    expResult.value = await api.solve(props.id, p, datasetId.value || null)
  } catch (e) {
    expError.value = e instanceof SyntaxError ? 'The matrices are not valid JSON.' : errorMessage(e)
  }
}
const depthsText = computed({
  get: () => (Array.isArray(params.value.depths) ? (params.value.depths as number[]).join(', ') : String(params.value.depths ?? '')),
  set: (v: string) => (params.value.depths = v),
})
</script>

<template>
  <StatusMessage kind="error" :message="error" />
  <template v-if="ex">
    <PageHeader :title="ex.title" :subtitle="`${ex.book === 'DS4A' ? 'Data Science for All (Davis & Glanz)' : 'A Hands-On Introduction to Data Science (Shah)'} · Chapter ${ex.chapter} · ${ex.exercise_number} · ${ex.source_page}`">
      <OriginBadge :origin="ex.origin" />
      <RouterLink v-if="activityById(ex.id)" :to="`/activities/${ex.id}`" class="btn-secondary px-3 py-1.5 text-sm" data-testid="exercise-cinematic">▶ Watch as a cinematic activity</RouterLink>
      <RouterLink v-if="activityById(ex.id)?.lesson" :to="`/lessons/${activityById(ex.id)!.lesson}`" class="btn-secondary px-3 py-1.5 text-sm" data-testid="exercise-lesson">▶ 3D cinematic lesson</RouterLink>
      <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"><input v-model="practice" type="checkbox" /> Practice mode (hide answers)</label>
    </PageHeader>

    <div class="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      <button v-for="[k, label] in TABS" :key="k" role="tab" :aria-selected="tab === k" :class="['tab', tab === k && 'tab-active']" @click="tab = k">{{ label }}</button>
    </div>

    <section v-if="tab === 'problem'" class="card space-y-4">
      <p class="text-sm leading-relaxed">{{ ex.description }}</p>
      <div><div class="label">Required outputs</div>
        <ol class="list-inside list-decimal space-y-1 text-sm"><li v-for="q in ex.questions" :key="q.id">{{ q.prompt }}</li></ol></div>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>Dataset: <b>{{ ex.required_dataset ?? 'none (conceptual)' }}</b></span><span>Type: <b>{{ ex.kind }}</b></span>
      </div>
      <div v-for="n in ex.notes" :key="n" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{{ n }}</div>
    </section>

    <section v-if="tab === 'understand'" class="card space-y-4">
      <p class="text-sm leading-relaxed">{{ ex.understand }}</p>
      <div><div class="label">Concepts tested</div><div class="flex flex-wrap gap-1.5"><span v-for="c in ex.concepts" :key="c" class="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">{{ c }}</span></div></div>
    </section>

    <section v-if="tab === 'solve'">
      <StatusMessage v-if="loading" kind="loading" message="Computing the solution on the server…" />
      <div v-if="ex.id === 'hoids-tiy8-1' && !result" class="card space-y-2 text-sm">
        <p>This exercise needs the kangaroo nasal-dimension data from Shah's online resources (OA 8.2), which is not bundled because an authentic copy could not be obtained.</p>
        <p>Upload the CSV in <RouterLink to="/playground" class="text-brand-600 hover:underline">Solve a New Problem</RouterLink>, then choose it in the <b>Experiment</b> tab.</p>
      </div>
      <ExerciseSolution v-if="result" :exercise="ex" :result="result" :practice="practice" />
    </section>

    <section v-if="tab === 'code'" class="space-y-3">
      <p class="text-sm text-slate-600">Readable code equivalent to what the server runs for this exercise.</p>
      <pre v-if="ex.python_code" class="code-block">{{ ex.python_code }}</pre>
      <p v-else class="card text-sm text-slate-600">This activity is conceptual: it is answered by applying the textbook definitions (see Understand), not by code.</p>
    </section>

    <section v-if="tab === 'experiment'" class="space-y-4">
      <form v-if="Object.keys(params).length" class="card space-y-3" @submit.prevent="rerun">
        <p class="text-sm text-slate-600">Change the inputs and re-solve. Results are recomputed from scratch on the server.</p>
        <div v-if="ex.id === 'hoids-tiy8-1'">
          <label class="label" for="tiyds">Uploaded kangaroo dataset</label>
          <select id="tiyds" v-model="datasetId" class="input"><option value="">— choose —</option><option v-for="d in ds.items.filter((x) => x.origin === 'upload')" :key="d.id" :value="d.id">{{ d.name }}</option></select>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="[k] in scalarParams" :key="k">
            <label class="label" :for="'p-' + k">{{ humanize(k) }}</label>
            <select v-if="typeof params[k] === 'boolean'" :id="'p-' + k" v-model="params[k]" class="input"><option :value="true">true</option><option :value="false">false</option></select>
            <input v-else-if="typeof params[k] === 'number'" :id="'p-' + k" v-model.number="params[k]" type="number" step="any" class="input" />
            <input v-else :id="'p-' + k" v-model="params[k]" class="input" />
          </div>
          <div v-if="'depths' in params"><label class="label" for="p-depths">Depths (comma separated)</label><input id="p-depths" v-model="depthsText" class="input" /></div>
        </div>
        <div v-if="matricesJson"><label class="label" for="mx">Confusion matrices (rows = actual 0/1, columns = predicted 0/1)</label><textarea id="mx" v-model="matricesJson" rows="10" class="input font-mono text-xs" /></div>
        <button class="btn-primary">Re-solve</button>
        <StatusMessage kind="error" :message="expError" />
      </form>
      <p v-else class="card text-sm text-slate-600">This activity has no numerical inputs. Use the Similar problems tab, or the Learn page activity, to practise the concept.</p>
      <ExerciseSolution v-if="expResult" :exercise="ex" :result="expResult" />
    </section>

    <section v-if="tab === 'interpret'" class="card space-y-4 text-sm">
      <div><div class="label">What the result means</div><p>{{ ex.interpretation }}</p></div>
      <div><div class="label">Common mistakes</div><ul class="list-inside list-disc space-y-1"><li v-for="m in ex.common_mistakes" :key="m">{{ m }}</li></ul></div>
    </section>

    <section v-if="tab === 'similar'" class="space-y-3">
      <p class="text-xs text-slate-500">Supplementary problems (not from the textbook) using the same concept. Answers are hidden until you reveal them.</p>
      <div v-for="(s, i) in similar" :key="i" class="card">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-medium">{{ s.prompt }}</p>
          <button class="btn-secondary shrink-0 px-2 py-1 text-xs" @click="shownSimilar[i] = !shownSimilar[i]">{{ shownSimilar[i] ? 'Hide' : 'Show answer' }}</button>
        </div>
        <div v-if="shownSimilar[i]" class="mt-2 rounded bg-slate-50 px-3 py-2 text-sm"><b>{{ s.answer }}</b> — {{ s.explanation }}</div>
      </div>
      <RouterLink to="/practice" class="btn-secondary">More generated practice →</RouterLink>
    </section>
  </template>
</template>
