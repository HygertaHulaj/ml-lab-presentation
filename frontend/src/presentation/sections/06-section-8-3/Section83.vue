<script setup lang="ts">
/**
 * Section 6 — DS4A Section 8.3 "Characteristics of Machine Learning Methods" (book pp. 368–379), in source order.
 * Every tree, count, threshold and accuracy comes from the backend (`/concepts/tree`, `/concepts/carseats-explore`).
 * → first advances the current module's own stages (each module exposes `advance()`), then moves on.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, CARSEAT_FEATURES, type ConceptTree } from '../../api'
import TreeAnatomy from './TreeAnatomy.vue'
import SurrogateDemo from './SurrogateDemo.vue'
import ReadingTree from './ReadingTree.vue'
import ExplanatoryVars from './ExplanatoryVars.vue'
import PenguinQuiz from './PenguinQuiz.vue'
import BothTasks from './BothTasks.vue'
import InterpComplexity from './InterpComplexity.vue'
import ComplexityControls from './ComplexityControls.vue'
import NestedTrees from './NestedTrees.vue'
import ChoiceQuiz from '../../../visualizations/concepts/ChoiceQuiz.vue'
import { DEFS, INF_PRED, INF_PRED_OPTIONS, REG_CLASS } from './content'

const ID = 'section-8-3'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const mod = ref<{ advance: () => boolean } | null>(null)
const importance = ref<ConceptTree | null>(null)
watch(step, (s) => shell.setFieldAlpha(s === 0 || s === 13 ? 0.8 : 0.12), { immediate: true })
onMounted(async () => { try { importance.value = await presentationApi.tree({ features: CARSEAT_FEATURES, max_depth: 3 }) } catch { /* the step shows its text without the bars */ } })
useSectionKeys((e) => ((e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') ? mod.value?.advance() ?? false : false))

const HEAD = [
  { page: 'p. 368', q: 'Are all machine-learning methods alike?', title: 'Characteristics of Machine Learning Methods' },
  { page: 'pp. 368–369', q: 'What does a decision tree look like?', title: 'Decision trees' },
  { page: 'pp. 369–370', q: 'Which variables may we use?', title: 'The car seat data, and a trap' },
  { page: 'pp. 370–371', q: 'How do we read a tree?', title: 'Reading a decision tree' },
  { page: 'pp. 371–372', q: 'What makes a good explanatory variable?', title: 'Choosing explanatory variables' },
  { page: 'p. 373', q: 'Can you read this tree?', title: 'Try it yourself: reading a decision tree' },
  { page: 'pp. 373–374', q: 'What type is the response variable?', title: 'Regression versus classification' },
  { page: 'pp. 374–375', q: 'Can one method do both?', title: 'One method, both tasks' },
  { page: 'p. 375', q: 'Do we want accurate answers, or understanding?', title: 'Inference versus prediction' },
  { page: 'pp. 375–376', q: 'Which task, and which goal?', title: 'Try it yourself: inference versus prediction' },
  { page: 'pp. 376–377', q: 'Can a model be both powerful and easy to explain?', title: 'Interpretability and complexity' },
  { page: 'p. 377', q: 'How do we control a tree\'s complexity?', title: 'Max depth and min n' },
  { page: 'pp. 377–379', q: 'Which tree would you choose?', title: 'Try it yourself: interpretability versus complexity' },
  { page: 'pp. 368–379', q: 'What did Section 8.3 teach us?', title: 'Summary' },
]
const head = computed(() => HEAD[step.value])
const regItems = REG_CLASS.map((r) => ({ q: r.q, options: ['Regression', 'Classification'], answer: r.answer }))
const infItems = INF_PRED.map((r) => ({ q: r.q, options: INF_PRED_OPTIONS, answer: r.answer, why: r.why }))
const imp = computed(() => {
  const fi = importance.value?.tree.feature_importances ?? {}
  return Object.entries(fi).slice(0, 5).map(([k, v]) => ({ k: k.replace(/_(Good|Bad|Medium|Yes|No)$/, ' = $1').replace(/_/g, ' '), v }))
})
const CHARS = [
  { t: 'Decision trees', s: 'questions, branches, leaves' },
  { t: 'Regression vs. classification', s: 'number or category?' },
  { t: 'Inference vs. prediction', s: 'understand or predict?' },
  { t: 'Interpretability vs. complexity', s: 'explainable or flexible?' },
]
const SUMMARY = [
  { k: 'Decision trees', v: 'Read top to bottom: each split asks one question; each leaf is a prediction with its counts.' },
  { k: 'No surrogates', v: 'Never use a disguised copy of the response (sales for sales_cat) as an explanatory variable.' },
  { k: 'Regression vs. classification', v: 'Decided by the response: quantitative means regression, categorical means classification.' },
  { k: 'Inference vs. prediction', v: 'Understanding relationships vs. predicting accurately. Both need a model that predicts well.' },
  { k: 'Interpretability vs. complexity', v: 'More depth (or smaller min n) gives a more flexible tree that is harder to explain.' },
]
</script>

<template>
  <section class="s83" :data-step="step" data-testid="section-83">
    <header class="head">
      <div class="kicker">Section 8.3</div>
      <p class="q" data-testid="s83-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="intro">
        <h1>{{ head.title }}</h1>
        <p>Supervised and unsupervised methods are very different. This section studies supervised methods through one model, the <b>decision tree</b>, using the book's car seat data (400 stores).</p>
        <div class="chars"><div v-for="(c, i) in CHARS" :key="c.t" class="char" :style="{ animationDelay: i * 0.12 + 's' }"><strong>{{ c.t }}</strong><span>{{ c.s }}</span></div></div>
      </div>
      <TreeAnatomy v-else-if="step === 1" ref="mod" />
      <SurrogateDemo v-else-if="step === 2" ref="mod" />
      <ReadingTree v-else-if="step === 3" ref="mod" />
      <ExplanatoryVars v-else-if="step === 4" ref="mod" />
      <PenguinQuiz v-else-if="step === 5" ref="mod" />
      <div v-else-if="step === 6" class="two" data-testid="m-regclass">
        <div class="defs">
          <div class="card r"><strong>Regression</strong><span>{{ DEFS.regression }}</span><em>car seats: predict <code>sales</code></em></div>
          <div class="card c"><strong>Classification</strong><span>{{ DEFS.classification }}</span><em>car seats: predict <code>sales_cat</code> (High / Low)</em></div>
        </div>
        <ChoiceQuiz ref="mod" :items="regItems" testid="regclass" :columns="2" />
      </div>
      <BothTasks v-else-if="step === 7" />
      <div v-else-if="step === 8" class="two" data-testid="m-infpred">
        <div class="defs">
          <div class="card p"><strong>Prediction</strong><span>{{ DEFS.prediction }}</span><em>RadiologyML: doctors care that it predicts accurately and fast.</em></div>
          <div class="card i"><strong>Inference</strong><span>{{ DEFS.inference }}</span><em>Car seats: which variables are associated with sales, and how?</em></div>
          <p class="tip">Quick Tip, p. 375: a model built for inference that predicts poorly is generally not worth interpreting.</p>
        </div>
        <div class="imp">
          <h3>An inference question: which variables drive car seat sales?</h3>
          <div v-for="b in imp" :key="b.k" class="bar"><span>{{ b.k }}</span><i :style="{ width: b.v * 100 + '%' }" /><b>{{ (b.v * 100).toFixed(0) }} %</b></div>
          <p class="src">Share of the depth-3 tree's impurity reduction per variable · computed by the backend</p>
        </div>
      </div>
      <div v-else-if="step === 9" class="full"><ChoiceQuiz ref="mod" :items="infItems" testid="infpred" /></div>
      <InterpComplexity v-else-if="step === 10" ref="mod" />
      <ComplexityControls v-else-if="step === 11" ref="mod" />
      <NestedTrees v-else-if="step === 12" ref="mod" />
      <div v-else class="summary" data-testid="s83-summary">
        <div v-for="(s, i) in SUMMARY" :key="s.k" class="sum" :style="{ animationDelay: i * 0.15 + 's' }"><strong>{{ s.k }}</strong><span>{{ s.v }}</span></div>
        <SectionBridge id="section-8-3" :answer="false" :next="false" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.s83 { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
/* `safe center`: centre when the module fits, otherwise start below the header (never overflow into it) */
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.intro { width: 100%; }
.intro h1 { font: 600 clamp(34px, 4.2vw, 72px) / 1.08 'Space Grotesk', system-ui; max-width: 18ch; }
.intro p { max-width: 70ch; margin-top: 18px; font-size: clamp(16px, 1.4vw, 24px); color: rgb(var(--c-soft)); line-height: 1.5; }
.intro b { color: rgb(var(--c-data)); }
.chars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 34px; max-width: 1300px; }
.char { display: flex; flex-direction: column; gap: 8px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-feature)); animation: rise .6s ease both; }
.char strong { font: 600 clamp(17px, 1.4vw, 24px) 'Space Grotesk', system-ui; }
.char span { color: rgb(var(--c-dim)); font-size: max(15px, var(--up-15, 15px)); }
.two { display: grid; grid-template-columns: 1fr 1.25fr; gap: 3vw; width: 100%; align-items: start; }
.defs { display: flex; flex-direction: column; gap: 12px; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border-radius: 14px; background: rgba(var(--c-surface), .78); border-left: 3px solid; }
.card.r { border-color: rgb(var(--c-feature)); } .card.c { border-color: rgb(var(--c-ok)); } .card.p { border-color: rgb(var(--c-data)); } .card.i { border-color: rgb(var(--c-human)); }
.card strong { font: 600 max(20px, var(--up-20, 20px)) 'Space Grotesk', system-ui; }
.card span { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.45; }
.card em { font-style: normal; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
code { font-family: 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-data-soft)); }
.tip { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-human)); }
.imp h3 { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; margin-bottom: 12px; }
.bar { display: grid; grid-template-columns: 180px 1fr 50px; align-items: center; gap: 10px; margin: 8px 0; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); }
.bar i { display: block; height: 12px; border-radius: 6px; background: linear-gradient(90deg, rgb(var(--c-compute)), rgb(var(--c-data))); }
.bar b { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; text-align: right; }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
.full { width: 100%; max-width: 1200px; }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-feature)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) { .chars, .summary { grid-template-columns: 1fr 1fr; } .two { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .char, .sum { animation: none; } }
</style>
