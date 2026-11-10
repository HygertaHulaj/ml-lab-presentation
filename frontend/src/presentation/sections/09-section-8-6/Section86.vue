<script setup lang="ts">
/**
 * Section 9 — DS4A Section 8.6 "Use High-Quality Data in Machine Learning" (book pp. 392–393), in source order.
 * Each of the four dimensions is measured on real data by the backend (`GET /concepts/data-quality`); the practice
 * quiz is written for this presentation and labelled so.
 * → first advances the current module's own stages (each module exposes `advance()`), then moves on.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type DataQuality } from '../../api'
import { errorMessage } from '../../../api/client'
import ChoiceQuiz from '../../../visualizations/concepts/ChoiceQuiz.vue'
import FreshnessDemo from './FreshnessDemo.vue'
import VolumeDemo from './VolumeDemo.vue'
import DiversityDemo from './DiversityDemo.vue'
import QualityDemo from './QualityDemo.vue'
import { DIMENSIONS, PRACTICE, PRACTICE_OPTIONS, SUMMARY } from './content'

const ID = 'section-8-6'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const mod = ref<{ advance: () => boolean } | null>(null)
const dq = ref<DataQuality | null>(null)
const error = ref<string | null>(null)
watch(step, (s) => shell.setFieldAlpha(s === 0 || s === 7 ? 0.8 : 0.12), { immediate: true })
onMounted(async () => { try { dq.value = await presentationApi.dataQuality() } catch (e) { error.value = errorMessage(e) } })
useSectionKeys((e) => ((e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') ? mod.value?.advance() ?? false : false))

const HEAD = [
  { page: 'p. 392', q: 'Is a clever algorithm enough?', title: 'Use high-quality data in machine learning' },
  { page: 'p. 393', q: 'What happens when the world changes?', title: 'Data freshness' },
  { page: 'p. 393', q: 'How much data is enough?', title: 'Data volume' },
  { page: 'p. 393', q: 'Who is in the data, and who is missing?', title: 'Data diversity' },
  { page: 'p. 393', q: 'What if the data are wrong or blurred?', title: 'Data quality' },
  { page: 'p. 393', q: 'What should training data look like?', title: 'Representative data' },
  { page: 'practice', q: 'Which dimension is at risk?', title: 'Practice: spot the data problem' },
  { page: 'pp. 392–393', q: 'What did Section 8.6 teach us?', title: 'Summary' },
]
const head = computed(() => HEAD[step.value])
const dim = computed(() => (step.value >= 1 && step.value <= 4 ? DIMENSIONS[step.value - 1] : null))
const practice = PRACTICE.map((p) => ({ q: p.q, options: PRACTICE_OPTIONS, answer: p.answer, why: p.why }))

// representative data: a schematic population (seeded) and two samples of the same size
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }
const GROUPS = ['data', 'human', 'feature', 'ok'] as const
const SHARES = [0.4, 0.25, 0.2, 0.15]
const population = (() => {
  const r = rng(393)
  return Array.from({ length: 160 }, (_, i) => {
    let u = r(), g = 0
    while (g < SHARES.length - 1 && u > SHARES[g]) { u -= SHARES[g]; g++ }
    return { x: 20 + (i % 16) * 22, y: 20 + Math.floor(i / 16) * 22, g }
  })
})()
// stratified: each group in proportion to its share of the population
const sampleGood = computed(() => {
  const counts = GROUPS.map((_, g) => population.filter((p) => p.g === g).length)
  return counts.flatMap((c, g) => Array<number>(Math.max(1, Math.round((c / population.length) * 20))).fill(g))
})
const sampleBad = computed(() => population.filter((p) => p.g === 0).slice(0, sampleGood.value.length).map((p) => p.g))
</script>

<template>
  <section class="s86" :data-step="step" data-testid="section-86">
    <header class="head">
      <div class="kicker">Section 8.6{{ head.page === 'practice' ? ' · practice, beyond the book' : '' }}</div>
      <p class="q" data-testid="s86-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="intro">
        <h1>Garbage in, garbage out</h1>
        <p>AI can look seamless, but the results of a machine learning method are only as good as the data it uses. Four dimensions of the data decide how useful a model will be:</p>
        <div class="dims"><div v-for="(d, i) in DIMENSIONS" :key="d.k" class="dim" :style="{ borderColor: `rgb(var(--c-${d.tone}))`, animationDelay: i * 0.12 + 's' }"><strong :style="{ color: `rgb(var(--c-${d.tone}))` }">{{ d.k }}</strong><span>{{ d.def }}</span></div></div>
      </div>

      <div v-else-if="dim" class="dimstep">
        <div class="left">
          <div class="card" :style="{ borderColor: `rgb(var(--c-${dim.tone}))` }"><strong :style="{ color: `rgb(var(--c-${dim.tone}))` }">{{ dim.k }}</strong><span>{{ dim.def }}</span></div>
          <p class="rad"><b>RadiologyML:</b> {{ dim.radiology }}</p>
          <p v-if="step === 4" class="rank">The book ranks data quality highest, above diversity and even volume.</p>
        </div>
        <div class="right">
          <div v-if="error" class="err" data-testid="s86-error">The backend is not reachable ({{ error }}). Start it, then reload: every number here is measured there.</div>
          <div v-else-if="!dq" class="loading">Measuring…</div>
          <template v-else>
            <FreshnessDemo v-if="step === 1" ref="mod" :data="dq.freshness" />
            <VolumeDemo v-else-if="step === 2" ref="mod" :data="dq.volume" :n-test="dq.dataset.digits_test" />
            <DiversityDemo v-else-if="step === 3" ref="mod" :data="dq.diversity" />
            <QualityDemo v-else ref="mod" :data="dq.quality" />
          </template>
        </div>
      </div>

      <div v-else-if="step === 5" class="repr" data-testid="m-representative">
        <svg viewBox="0 0 380 240" class="pop" role="img" aria-label="A population with four groups">
          <circle v-for="(p, i) in population" :key="i" :cx="p.x" :cy="p.y" r="7" :style="{ fill: `rgb(var(--c-${GROUPS[p.g]}))` }" />
        </svg>
        <div class="samples">
          <p class="lead">Training data should represent the data the model will be used on, just as a sample should represent its population in statistical inference.</p>
          <div class="smp good"><strong>Representative sample</strong><span class="dots"><i v-for="(g, i) in sampleGood" :key="i" :style="{ background: `rgb(var(--c-${GROUPS[g]}))` }" /></span><small>every group, in about the right share</small></div>
          <div class="smp bad"><strong>One community only</strong><span class="dots"><i v-for="(g, i) in sampleBad" :key="i" :style="{ background: `rgb(var(--c-${GROUPS[g]}))` }" /></span><small>like RadiologyML's training images, or the one-island penguin model</small></div>
          <p class="small">Ensuring freshness, volume, diversity and quality is a great way to get there (p. 393).</p>
          <p class="src">Schematic population (illustrative)</p>
        </div>
      </div>

      <div v-else-if="step === 6" class="full" data-testid="m-practice">
        <ChoiceQuiz ref="mod" :items="practice" testid="practice" :columns="2" />
        <p class="src">Scenarios written for this presentation (not from the book)</p>
      </div>

      <div v-else class="summary" data-testid="s86-summary">
        <div v-for="(s, i) in SUMMARY" :key="s.k" class="sum" :style="{ animationDelay: i * 0.15 + 's' }"><strong>{{ s.k }}</strong><span>{{ s.v }}</span></div>
        <SectionBridge id="section-8-6" :answer="false" :next="false" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.s86 { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.intro { width: 100%; }
.intro h1 { font: 600 clamp(38px, 4.6vw, 78px) / 1.05 'Space Grotesk', system-ui; }
.intro p { max-width: 72ch; margin-top: 18px; font-size: clamp(16px, 1.35vw, 23px); color: rgb(var(--c-soft)); line-height: 1.5; }
.dims { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 30px; }
.dim { display: flex; flex-direction: column; gap: 8px; padding: 20px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid; animation: rise .6s ease both; }
.dim strong { font: 600 clamp(18px, 1.5vw, 26px) 'Space Grotesk', system-ui; }
.dim span { color: rgb(var(--c-soft)); font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); line-height: 1.45; }
.dimstep { display: grid; grid-template-columns: 0.9fr 1.3fr; gap: 3vw; width: 100%; align-items: center; }
.card { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-left: 4px solid; }
.card strong { font: 600 clamp(20px, 1.6vw, 28px) 'Space Grotesk', system-ui; }
.card span { font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.5; }
.rad { margin-top: 14px; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.rad b { color: rgb(var(--c-human)); }
.rank { margin-top: 10px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-accent)); }
.right { min-width: 0; }
.repr { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.pop { width: 100%; max-height: 46vh; }
.lead { font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-text)); line-height: 1.5; }
.smp { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-left: 3px solid; }
.smp.good { border-color: rgb(var(--c-ok)); } .smp.bad { border-color: rgb(var(--c-warn)); }
.smp strong { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.dots { display: flex; gap: 6px; flex-wrap: wrap; }
.dots i { width: 16px; height: 16px; border-radius: 8px; }
.smp small { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); }
.small { margin-top: 12px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.full { width: 100%; max-width: 1300px; display: grid; gap: 10px; }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
.bridge { grid-column: 1 / -1; margin-top: 8px; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-dim)); }
.src { margin-top: 6px; font-size: 12px; color: rgb(var(--c-faint)); }
.err { color: rgb(var(--c-warn)); font-size: max(18px, var(--up-18, 18px)); }
.loading { color: rgb(var(--c-dim)); font-size: max(18px, var(--up-18, 18px)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) { .dims, .summary { grid-template-columns: 1fr 1fr; } .dimstep, .repr { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .dim, .sum { animation: none; } }
</style>
