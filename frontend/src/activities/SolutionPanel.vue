<script setup lang="ts">
/**
 * Solution mode: each question with its computed answer and explanation (from the backend solver and the exercise
 * definition), then the book-style interpretation, common mistakes, data notes and the Python that reproduces it.
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../types'
import type { ActivityDef } from './types'

const props = defineProps<{ detail: ExerciseDetail; solve: SolveResult; next: ActivityDef | null }>()
const rows = computed(() => props.solve.answers.map((a, i) => {
  const q = props.detail.questions.find((x) => x.id === a.id) ?? props.detail.questions[i]
  return { id: a.id, prompt: a.prompt ?? q?.prompt ?? '', answer: a.answer, explanation: a.explanation || q?.explanation || '' }
}))
const human = (s: string) => s.replace(/_/g, ' ')
function show(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)))
  if (typeof v === 'string') return v
  return ''
}
const isTable = (v: unknown): v is Record<string, unknown>[] => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object'
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
</script>

<template>
  <section class="sp" data-testid="ap-solution">
    <div class="qs">
      <article v-for="r in rows" :key="r.id" class="q" :data-testid="`sol-${r.id}`">
        <p v-if="r.prompt" class="prompt">{{ r.id }}. {{ r.prompt }}</p>
        <p v-else class="prompt">Question {{ r.id }}</p>
        <div v-if="isTable(r.answer)" class="tbl">
          <table><thead><tr><th v-for="k in Object.keys(r.answer[0])" :key="k">{{ human(k) }}</th></tr></thead>
            <tbody><tr v-for="(row, j) in r.answer" :key="j"><td v-for="k in Object.keys(r.answer[0])" :key="k">{{ show(row[k]) || JSON.stringify(row[k]) }}</td></tr></tbody></table>
        </div>
        <dl v-else-if="isObj(r.answer)" class="kv">
          <template v-for="(v, k) in r.answer" :key="k"><dt>{{ human(String(k)) }}</dt><dd>{{ show(v) || (isObj(v) ? Object.entries(v).map(([a, b]) => `${human(a)}: ${b}`).join(' · ') : JSON.stringify(v)) }}</dd></template>
        </dl>
        <p v-else class="ans">{{ show(r.answer) }}</p>
        <p v-if="r.explanation" class="why">{{ r.explanation }}</p>
      </article>
    </div>
    <aside>
      <div v-if="detail.interpretation" class="box"><h3>Interpretation</h3><p>{{ detail.interpretation }}</p></div>
      <div v-if="detail.common_mistakes.length" class="box"><h3>Common mistakes</h3><ul><li v-for="m in detail.common_mistakes" :key="m">{{ m }}</li></ul></div>
      <div v-if="detail.notes.length" class="box note"><h3>Notes on the data</h3><ul><li v-for="n in detail.notes" :key="n">{{ n }}</li></ul></div>
      <details v-if="detail.python_code" class="box code"><summary>Python that reproduces this</summary><pre>{{ detail.python_code }}</pre></details>
      <RouterLink v-if="next" :to="`/activities/${next.id}`" class="next" data-testid="sol-next">Next activity: {{ next.label }} · {{ next.title }} →</RouterLink>
      <p class="src">All answers computed by the backend solver for {{ detail.exercise_number }} ({{ detail.source_page }}).</p>
    </aside>
  </section>
</template>

<style scoped>
.sp { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3vw; width: 100%; max-width: 1500px; margin: 0 auto; padding-top: 8px; align-items: start; }
.qs { display: grid; gap: 10px; }
.q { padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .8); border-left: 3px solid rgb(var(--c-accent)); }
.prompt { font-size: 14px; color: rgb(var(--c-soft)); line-height: 1.4; }
.ans { margin-top: 6px; font: 600 clamp(16px, 1.3vw, 21px) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.why { margin-top: 6px; font-size: 14px; color: rgb(var(--c-dim)); line-height: 1.5; }
.kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin-top: 8px; font-size: 14px; }
.kv dt { color: rgb(var(--c-dim)); text-transform: capitalize; }
.kv dd { color: rgb(var(--c-text)); }
.tbl { overflow-x: auto; margin-top: 8px; }
table { border-collapse: collapse; font-size: 13px; }
th, td { padding: 4px 10px; border-bottom: 1px solid rgba(var(--c-dim), .2); text-align: left; }
th { color: rgb(var(--c-dim)); font-weight: 600; text-transform: capitalize; }
td { color: rgb(var(--c-text)); font-family: 'JetBrains Mono', monospace; }
aside { display: grid; gap: 10px; }
.box { padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .8); }
.box h3 { font: 600 15px 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); margin-bottom: 6px; }
.box p, .box li { font-size: 14px; color: rgb(var(--c-soft)); line-height: 1.5; }
.box ul { margin-left: 18px; display: grid; gap: 4px; }
.note h3 { color: rgb(var(--c-human)); }
.code summary { cursor: pointer; font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
pre { margin-top: 8px; max-height: 300px; overflow: auto; font: 12px/1.5 'JetBrains Mono', monospace; color: rgb(var(--c-text)); white-space: pre; }
.next { display: block; padding: 12px 16px; border-radius: 12px; border: 1px solid rgb(var(--c-accent)); color: rgb(var(--c-accent)); font: 600 15px 'Space Grotesk', system-ui; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
@media (max-width: 1000px) { .sp { grid-template-columns: 1fr; } }
</style>
