<script setup lang="ts">
/**
 * Section 5 — DS4A Section 8.2 "Three Steps in the Machine Learning Process" (book pp. 365–368), in source order.
 * Each module: a question → a relatable scenario → a visual → the mechanism step by step → controls →
 * a real numerical example where the book has one → a summary line → the next module.
 * → first advances the current module's own stages (each module exposes `advance()`), then moves on.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type AnalyzeProduce } from '../../api'
import { errorMessage } from '../../../api/client'
import SupervisedUnsupervised from './SupervisedUnsupervised.vue'
import RecipeAnalogy from './RecipeAnalogy.vue'
import RadiologyLoop from './RadiologyLoop.vue'
import ThreeSteps from './ThreeSteps.vue'
import IngestData from './IngestData.vue'
import TidyData from './TidyData.vue'
import TeslaCase from './TeslaCase.vue'
import AnalyzeData from './AnalyzeData.vue'
import ProduceResults from './ProduceResults.vue'
import WellnessQuiz from './WellnessQuiz.vue'

const ID = 'section-8-2'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const fit = ref<AnalyzeProduce | null>(null)
const fitError = ref<string | null>(null)
const mod = ref<{ advance: () => boolean } | null>(null)

onMounted(async () => {
  try { fit.value = await presentationApi.analyzeAndProduce() } catch (e) { fitError.value = errorMessage(e) }
})
watch(step, (s) => shell.setFieldAlpha(s === 0 || s === 4 ? 0.8 : 0.15), { immediate: true })

useSectionKeys((e) => {
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '
  return fwd ? mod.value?.advance() ?? false : false
})

interface Head { page: string; q: string; title: string; lead?: string }
const HEAD: Head[] = [
  { page: 'pp. 365–368', q: 'How does a system like RadiologyML actually learn?', title: 'Three Steps in the Machine Learning Process' },
  { page: 'p. 365', q: 'Do we know the answer we want to predict?', title: 'Supervised and unsupervised learning', lead: 'Machine-learning problems generally fall into two categories.' },
  { page: 'p. 365', q: 'What is a model?', title: 'A model is like a recipe', lead: 'Modeling estimates how the variables in our data behave, usually as an explicit mathematical form fitted to the data.' },
  { page: 'p. 366', q: 'Where do RadiologyML\'s lessons come from?', title: 'RadiologyML: a tool produced by machine learning' },
  { page: 'p. 366', q: 'What happens between raw data and a result?', title: 'Machine learning in three primary steps' },
  { page: 'p. 366', q: 'What do we feed the machine?', title: 'Step 1: Ingesting data', lead: 'Machine-learning methods are hungry for data: structured or unstructured data is fed into the system.' },
  { page: 'p. 366', q: 'What shape should the data have?', title: 'Quick Tip: tidy data', lead: 'Most machine-learning methods require structured data, specifically tidy data.' },
  { page: 'p. 366', q: 'What does ingestion look like at scale?', title: 'Case study: how Tesla uses machine learning' },
  { page: 'p. 366', q: 'Who does the analysis?', title: 'Step 2: Analyzing the data', lead: 'The system fits a model that relates one variable to the others, behind the scenes, with no person guiding every step.' },
  { page: 'p. 367', q: 'What do we do with a fitted model?', title: 'Step 3: Producing model-based results', lead: 'Apply the model to new data, then deliver the results to people or turn them into automatic actions.' },
  { page: 'pp. 367–368', q: 'Can you spot the three steps in a new app?', title: 'Try it yourself: the Mental Wellness Assistant', lead: 'Assign each feature to Step 1, 2 or 3.' },
]
const head = computed(() => HEAD[step.value])
const mapActive = computed(() => (step.value >= 5 && step.value <= 7 ? 0 : step.value === 8 ? 1 : step.value === 9 ? 2 : -1))
const SUMMARY = computed(() => [
  { k: 'Two kinds of problems', v: 'Supervised: a response variable is known. Unsupervised: find patterns or groups without one.' },
  { k: 'A model is a recipe', v: 'An estimated form that turns data (ingredients) into an outcome; different models give different results.' },
  { k: 'Step 1 · Ingest', v: 'Feed structured or unstructured data in; most methods need tidy, structured data.' },
  { k: 'Step 2 · Analyze', v: `The system fits the model automatically: here, ${fit.value ? fit.value.iterations_run.toLocaleString('en') : 'thousands of'} gradient-descent iterations with no human steps.` },
  { k: 'Step 3 · Produce results', v: 'Apply the model to new data; inform people or automate actions.' },
])
</script>

<template>
  <section class="s82" :data-step="step" data-testid="section-82">
    <header class="head">
      <div class="top">
        <div class="kicker">Section 8.2</div>
        <ThreeSteps v-if="mapActive >= 0" :active="mapActive" compact class="mini" />
      </div>
      <p class="q" data-testid="s82-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
      <p v-if="head.lead" class="lead">{{ head.lead }}</p>
    </header>

    <div class="body" :class="'s' + step">
      <div v-if="step === 0" class="intro">
        <h1>{{ head.title }}</h1>
        <p>A machine learns in three steps: first it <b>collects data</b>, then it <b>looks for patterns</b> in that data, and finally it <b>uses those patterns to give a result</b>. We will follow these steps with RadiologyML.</p>
        <ThreeSteps :active="-1" :reduced="store.reducedMotion" class="preview" />
      </div>
      <SupervisedUnsupervised v-else-if="step === 1" ref="mod" />
      <RecipeAnalogy v-else-if="step === 2" ref="mod" :reduced="store.reducedMotion" />
      <RadiologyLoop v-else-if="step === 3" ref="mod" />
      <ThreeSteps v-else-if="step === 4" :active="-1" :reduced="store.reducedMotion" />
      <IngestData v-else-if="step === 5" ref="mod" />
      <TidyData v-else-if="step === 6" ref="mod" :reduced="store.reducedMotion" />
      <TeslaCase v-else-if="step === 7" :reduced="store.reducedMotion" />
      <template v-else-if="step === 8 || step === 9">
        <div v-if="fitError" class="err" role="alert">The backend is not reachable ({{ fitError }}).</div>
        <AnalyzeData v-else-if="fit && step === 8" ref="mod" :data="fit" :reduced="store.reducedMotion" />
        <ProduceResults v-else-if="fit" ref="mod" :data="fit" :reduced="store.reducedMotion" />
      </template>
      <WellnessQuiz v-else ref="mod" />
    </div>
  </section>
</template>

<style scoped>
.s82 { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.top { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.mini { width: auto; }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
.lead { max-width: 90ch; margin-top: 6px; font-size: max(clamp(15px, 1.15vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.45; }
/* `safe center`: centre when the module fits, otherwise start below the header (never overflow upwards into it) */
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 10px; overflow-y: auto; overflow-x: hidden; }
.intro { width: 100%; }
.intro .preview { margin-top: 40px; max-width: 1300px; }
.intro h1 { font: 600 clamp(36px, 4.4vw, 76px) / 1.08 'Space Grotesk', system-ui; }
.intro p { max-width: 70ch; margin-top: 22px; font-size: clamp(17px, 1.5vw, 26px); color: rgb(var(--c-soft)); line-height: 1.5; }
.intro b { color: rgb(var(--c-data)); }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-data)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
.next { grid-column: 1 / -1; margin-top: 10px; color: rgb(var(--c-data-soft)); font-size: max(16px, var(--up-16, 16px)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.err { color: rgb(var(--c-human)); }
@media (max-width: 1000px) { .summary { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .sum { animation: none; } }
</style>
