<script setup lang="ts">
/**
 * Section 7 — DS4A Section 8.4 "Machine Learning Method Evaluation" (book pp. 380–388), in source order.
 * One backend call (`GET /concepts/evaluation`) provides every number: the recomputed Table 8.3, the metrics, the
 * regression scores, the No Free Lunch comparison, Fig. 8.17's models and the p. 388 exercise accuracies.
 * → first advances the current module's own stages (each module exposes `advance()`), then moves on.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type Evaluation } from '../../api'
import { errorMessage } from '../../../api/client'
import ChoiceQuiz from '../../../visualizations/concepts/ChoiceQuiz.vue'
import ValidationSplit from './ValidationSplit.vue'
import TestStores from './TestStores.vue'
import MistakeTypes from './MistakeTypes.vue'
import MetricExplorer from './MetricExplorer.vue'
import RegressionEval from './RegressionEval.vue'
import NoFreeLunch from './NoFreeLunch.vue'
import FitCurve from './FitCurve.vue'
import DepthSweep from './DepthSweep.vue'
import FitExercise from './FitExercise.vue'
import MoviesReturn from './MoviesReturn.vue'
import { COOKIES, DEFS, SUMMARY } from './content'

const ID = 'section-8-4'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const reduced = computed(() => store.reducedMotion)
const mod = ref<{ advance: () => boolean } | null>(null)
const ev = ref<Evaluation | null>(null)
const error = ref<string | null>(null)
watch(step, (s) => shell.setFieldAlpha(s === 0 || s === 14 ? 0.8 : 0.12), { immediate: true })
onMounted(async () => { try { ev.value = await presentationApi.evaluation() } catch (e) { error.value = errorMessage(e) } })
useSectionKeys((e) => ((e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') ? mod.value?.advance() ?? false : false))

const HEAD = [
  { page: 'p. 380', q: 'How good is a model, really?', title: 'Machine Learning Method Evaluation' },
  { page: 'pp. 380–381', q: 'How can we test on data we do not have?', title: 'Model validation' },
  { page: 'p. 381', q: 'How often is the model right?', title: 'Accuracy on the test data' },
  { page: 'pp. 381–382', q: 'Are all mistakes equally bad?', title: 'Two kinds of mistakes' },
  { page: 'p. 382', q: 'Where exactly does the model go wrong?', title: 'The confusion matrix (Table 8.3)' },
  { page: 'p. 383', q: 'Which mistakes do we want to avoid?', title: 'Precision, recall and specificity' },
  { page: 'p. 383', q: 'Can you compute them?', title: 'Try it yourself: accuracy, precision, recall, specificity' },
  { page: 'p. 384', q: 'What if the answer is a number?', title: 'Evaluating regression models' },
  { page: 'p. 384', q: 'Is there one best method?', title: 'The "No Free Lunch" theorem' },
  { page: 'pp. 384–385', q: 'Can a model learn too much?', title: 'Overfitting and underfitting' },
  { page: 'pp. 385–387', q: 'Why does training error flatter?', title: 'Training error versus test error' },
  { page: 'p. 387', q: 'Does this happen on real data?', title: 'The same effect on the car seat data' },
  { page: 'p. 388', q: 'Overfitted, underfitted or well fitted?', title: 'Try it yourself: three models' },
  { page: 'beyond', q: 'Does the movie model work on movies it never saw?', title: 'Back to the movies: fitted versus held-out' },
  { page: 'pp. 380–388', q: 'What did Section 8.4 teach us?', title: 'Summary' },
]
const head = computed(() => HEAD[step.value])
const QUESTIONS = [
  { k: 'Did it learn?', s: 'validation: train, then test on unseen data' },
  { k: 'Which mistakes?', s: 'the confusion matrix and its metrics' },
  { k: 'Which model?', s: 'choose by validation, confirm once on test data: no free lunch' },
  { k: 'Too simple or too complex?', s: 'underfitting and overfitting' },
]
const metricQuiz = computed(() => {
  const m = ev.value?.classification.metrics
  if (!m) return []
  const f = (v: number | null) => (v ?? 0).toFixed(2)
  const opts = [...new Set([m.accuracy, m.precision, m.recall, m.specificity, m.misclassification].map(f))].sort()
  return [
    { q: 'Accuracy of the tree on the test data', options: opts, answer: f(m.accuracy), why: `(${m.tp} + ${m.tn}) / ${m.n}` },
    { q: 'Precision', options: opts, answer: f(m.precision), why: `${m.tp} / (${m.tp} + ${m.fp})` },
    { q: 'Recall', options: opts, answer: f(m.recall), why: `${m.tp} / (${m.tp} + ${m.fn})` },
    { q: 'Specificity', options: opts, answer: f(m.specificity), why: `${m.tn} / (${m.tn} + ${m.fp})` },
  ]
})
</script>

<template>
  <section class="s84" :data-step="step" data-testid="section-84">
    <header class="head">
      <div class="kicker">Section 8.4{{ head.page === 'beyond' ? ' · beyond the book · Shah Problem 8.4 data' : '' }}</div>
      <p class="q" data-testid="s84-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="intro">
        <h1>{{ head.title }}</h1>
        <p>Section 8.3 described what models are like, and the movie example lowered the error on movies the model had already seen. Now we judge how well models work on observations they have <b>never seen</b>. Four questions:</p>
        <div class="chars"><div v-for="(c, i) in QUESTIONS" :key="c.k" class="char" :style="{ animationDelay: i * 0.12 + 's' }"><strong>{{ c.k }}</strong><span>{{ c.s }}</span></div></div>
      </div>
      <MoviesReturn v-else-if="step === 13" ref="mod" />
      <div v-else-if="step === 14" class="summary" data-testid="s84-summary">
        <div v-for="(s, i) in SUMMARY" :key="s.k" class="sum" :style="{ animationDelay: i * 0.15 + 's' }"><strong>{{ s.k }}</strong><span>{{ s.v }}</span></div>
        <SectionBridge id="section-8-4" :answer="false" :next="false" />
      </div>
      <div v-else-if="step === 9" class="cookies" data-testid="m-cookies">
        <div class="defs">
          <div class="card o"><span>{{ DEFS.overfit }}</span></div>
          <div class="card u"><span>{{ DEFS.underfit }}</span></div>
        </div>
        <p class="lead">Remember the cookie factory from Section 8.2? Three recipes:</p>
        <div class="recipes">
          <div v-for="(c, i) in COOKIES" :key="c.k" class="recipe" :style="{ borderColor: `rgb(var(--c-${c.tone}))`, animationDelay: i * 0.15 + 's' }">
            <strong :style="{ color: `rgb(var(--c-${c.tone}))` }">{{ c.k }}</strong><em>{{ c.recipe }}</em><span>{{ c.why }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="err" data-testid="s84-error">The backend is not reachable ({{ error }}). Start it, then reload: every number on these slides is computed there.</div>
      <div v-else-if="!ev" class="loading">Computing the evaluation…</div>
      <template v-else>
        <ValidationSplit v-if="step === 1" ref="mod" :n-train="ev.classification.n_train" :n-test="ev.classification.n_test" :reduced="reduced" />
        <TestStores v-else-if="step === 2" ref="mod" :data="ev.classification" :book="ev.book_table_8_3" mode="accuracy" :reduced="reduced" />
        <MistakeTypes v-else-if="step === 3" ref="mod" />
        <TestStores v-else-if="step === 4" ref="mod" :data="ev.classification" :book="ev.book_table_8_3" mode="matrix" :reduced="reduced" />
        <MetricExplorer v-else-if="step === 5" ref="mod" :m="ev.classification.metrics" />
        <div v-else-if="step === 6" class="full" data-testid="m-metricquiz">
          <p class="lead">Use Table 8.3 (TP {{ ev.classification.metrics.tp }}, FP {{ ev.classification.metrics.fp }}, FN {{ ev.classification.metrics.fn }}, TN {{ ev.classification.metrics.tn }}). Round to two decimal places.</p>
          <ChoiceQuiz ref="mod" :items="metricQuiz" testid="metricquiz" :columns="2" />
          <p class="src">Question 5 of the book (describe the results with the STAR framework) is for discussion.</p>
        </div>
        <RegressionEval v-else-if="step === 7" ref="mod" :data="ev.regression" />
        <NoFreeLunch v-else-if="step === 8" ref="mod" :problems="ev.no_free_lunch" />
        <FitCurve v-else-if="step === 10" ref="mod" :data="ev.fit_curve" />
        <DepthSweep v-else-if="step === 11" ref="mod" :rows="ev.depth_sweep" :selection="ev.depth_selection" />
        <FitExercise v-else-if="step === 12" ref="mod" :models="ev.fit_exercise" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.s84 { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
/* `safe center`: centre when the module fits, otherwise start below the header (never overflow into it) */
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.intro { width: 100%; }
.intro h1 { font: 600 clamp(34px, 4.2vw, 72px) / 1.08 'Space Grotesk', system-ui; max-width: 18ch; }
.intro p { max-width: 70ch; margin-top: 18px; font-size: clamp(16px, 1.4vw, 24px); color: rgb(var(--c-soft)); line-height: 1.5; }
.intro b { color: rgb(var(--c-accent)); }
.chars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 34px; max-width: 1300px; }
.char { display: flex; flex-direction: column; gap: 8px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.char strong { font: 600 clamp(17px, 1.4vw, 24px) 'Space Grotesk', system-ui; }
.char span { color: rgb(var(--c-dim)); font-size: max(15px, var(--up-15, 15px)); }
.full { width: 100%; max-width: 1200px; display: grid; gap: 12px; }
.lead { font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.5; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
.cookies { width: 100%; display: grid; gap: 14px; }
.defs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.card { padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .78); border-left: 3px solid; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); line-height: 1.45; color: rgb(var(--c-text)); }
.card.o { border-color: rgb(var(--c-warn)); } .card.u { border-color: rgb(var(--c-human)); }
.recipes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.recipe { display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid; animation: rise .6s ease both; }
.recipe strong { font: 600 clamp(18px, 1.4vw, 24px) 'Space Grotesk', system-ui; }
.recipe em { font-style: italic; color: rgb(var(--c-text)); font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); line-height: 1.4; }
.recipe span { color: rgb(var(--c-dim)); font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
.err { color: rgb(var(--c-warn)); font-size: max(18px, var(--up-18, 18px)); }
.loading { color: rgb(var(--c-dim)); font-size: max(18px, var(--up-18, 18px)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) { .chars, .summary, .recipes { grid-template-columns: 1fr 1fr; } .defs { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .char, .sum, .recipe { animation: none; } }
</style>
