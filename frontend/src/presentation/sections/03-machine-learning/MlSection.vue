<script setup lang="ts">
/**
 * Section 3 — What is Machine Learning? (DS4A §8.1 p. 364; §8.2 p. 365)
 * Steps: 0 the idea · 1 traditional programming · 2 training · 3 inference · 4 side by side · 5 training vs inference.
 * Each pipeline is a pure function of `prog.p`; GSAP only tweens p. The presenter can play, pause, replay and scrub,
 * and → first completes a running animation before moving on.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { Pause, Play, RotateCcw } from 'lucide-vue-next'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type RuleVsLearned } from '../../api'
import { errorMessage } from '../../../api/client'
import PipelineLane from './PipelineLane.vue'

const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf('machine-learning'))
const data = ref<RuleVsLearned | null>(null)
const error = ref<string | null>(null)
const prog = reactive({ p: 0 })
const playing = ref(false)
let tween: gsap.core.Tween | null = null

const DURATION: Record<number, number> = { 1: 7, 2: 7.5, 3: 7, 4: 13 }
const animated = computed(() => step.value >= 1 && step.value <= 4)

function play(from?: number) {
  tween?.kill()
  if (from !== undefined) prog.p = from
  if (store.reducedMotion) { prog.p = 1; playing.value = false; return }
  if (prog.p >= 1) prog.p = 0
  playing.value = true
  tween = gsap.to(prog, { p: 1, duration: (DURATION[step.value] ?? 7) * (1 - prog.p), ease: 'none', onComplete: () => { playing.value = false } })
}
function pause() { tween?.kill(); playing.value = false }
function toggle() { if (playing.value) pause(); else play() }
function scrub(e: Event) { pause(); prog.p = +(e.target as HTMLInputElement).value }

function enter() {
  pause()
  prog.p = 0
  shell.setFieldAlpha(step.value === 0 ? 1 : step.value === 5 ? 0.5 : 0.2)
  if (animated.value && data.value) play(0)
}
watch(step, enter)
onMounted(async () => {
  try { data.value = await presentationApi.ruleVsLearned(5.5) } catch (e) { error.value = errorMessage(e) }
  enter()
})
onBeforeUnmount(() => tween?.kill())

useSectionKeys((e) => {
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '
  if (animated.value && fwd && prog.p < 1) { pause(); prog.p = 1; return true }
  if (animated.value && e.key.toLowerCase() === 'r') { play(0); return true }
  if (animated.value && e.key.toLowerCase() === 'p') { toggle(); return true }
  return false
})

const TEXT: Record<number, { kicker: string; title: string; lead: string }> = {
  1: { kicker: 'Traditional programming', title: 'A person writes the rules', lead: 'The program applies a rule someone chose (petal length ≥ 5.5 cm means virginica) to every new flower. It never changes unless a person rewrites it.' },
  2: { kicker: 'Machine learning · training', title: 'The rule is learned from examples', lead: 'Flowers with known answers (the reference outputs) go into a learning algorithm. It tries every candidate rule and keeps the one that fits the examples best. The result is a trained model.' },
  3: { kicker: 'Machine learning · inference', title: 'The trained model meets new data', lead: 'New flowers arrive without labels. The trained model predicts each one. We can only check the predictions because we kept the true answers aside.' },
  4: { kicker: 'Side by side', title: 'Same data, two ways to get a rule', lead: 'Top: the rule comes from a person. Bottom: it is learned first (training), then applied (inference). Both then make predictions, and both can be wrong.' },
}
const pct = (v?: number) => (v === undefined ? '—' : `${(v * 100).toFixed(1)} %`)
</script>

<template>
  <section class="ml" :data-step="step" :data-progress="prog.p.toFixed(3)" data-testid="section-ml">
    <!-- 0: the idea -->
    <div v-if="step === 0" class="idea" data-testid="ml-idea">
      <div class="kicker">Section 03 · Machine learning</div>
      <h1>Learning patterns from data<br /><span>instead of explicitly programming every decision.</span></h1>
      <p class="quote">"…designed to identify patterns, make predictions, and learn from examples without being explicitly programmed with fixed instructions for each task." <small>DS4A §8.1, p. 364</small></p>
    </div>

    <!-- 1–4: pipelines -->
    <div v-else-if="animated" class="layout">
      <header class="head">
        <div class="kicker">{{ TEXT[step].kicker }}</div>
        <h2>{{ TEXT[step].title }}</h2>
        <p class="lead">{{ TEXT[step].lead }}</p>
      </header>
      <div v-if="error" class="err" role="alert">The backend is not reachable ({{ error }}). Start it to run this demo.</div>
      <div v-else-if="data" class="vis" :class="{ two: step === 4 }">
        <PipelineLane v-if="step === 1" mode="traditional" :p="prog.p" :data="data" />
        <PipelineLane v-else-if="step === 2" mode="training" :p="prog.p" :data="data" />
        <PipelineLane v-else-if="step === 3" mode="inference" :p="prog.p" :data="data" />
        <template v-else>
          <div class="lane-wrap"><span class="tag t">Traditional programming</span><PipelineLane mode="traditional" :p="prog.p" :data="data" compact /></div>
          <div class="lane-wrap"><span class="tag m">Machine learning: {{ prog.p < 0.5 ? 'training' : 'inference' }}</span><PipelineLane mode="ml-full" :p="prog.p" :data="data" compact /></div>
        </template>
      </div>
      <div v-if="data" class="player" data-testid="ml-player">
        <button class="ctl" :aria-label="playing ? 'Pause animation (P)' : 'Play animation (P)'" data-testid="ml-play" @click="toggle"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
        <button class="ctl" aria-label="Replay animation (R)" data-testid="ml-replay" @click="play(0)"><RotateCcw class="ic" /></button>
        <input class="scrub" type="range" min="0" max="1" step="0.001" :value="prog.p" aria-label="Animation position" data-testid="ml-scrub" @input="scrub" />
        <span class="src">Real data: {{ data.source }} · learned rule from {{ data.split.n_train }} flowers, tested on {{ data.split.n_test }}</span>
      </div>
    </div>

    <!-- 5: training vs inference -->
    <div v-else class="layout recap" data-testid="ml-recap">
      <header class="head">
        <div class="kicker">The key distinction</div>
        <h2>Training happens once. Inference happens every time.</h2>
      </header>
      <div class="cols">
        <div class="col train">
          <h3>Training</h3>
          <dl>
            <dt>Input</dt><dd>examples <b>with</b> reference outputs (labels)</dd>
            <dt>Does</dt><dd>searches for the rule or model that fits them best</dd>
            <dt>Output</dt><dd>a trained model: here, petal ≥ {{ data?.learned.threshold.toFixed(2) ?? '…' }} cm</dd>
            <dt>Check</dt><dd>training accuracy {{ pct(data?.learned.train_accuracy) }} (optimistic: it has seen these flowers)</dd>
          </dl>
        </div>
        <div class="col infer">
          <h3>Inference</h3>
          <dl>
            <dt>Input</dt><dd>new data <b>without</b> labels</dd>
            <dt>Does</dt><dd>applies the trained model</dd>
            <dt>Output</dt><dd>predictions, one per new example</dd>
            <dt>Check</dt><dd>on unseen flowers {{ pct(data?.learned.test_accuracy) }}: the honest estimate</dd>
          </dl>
        </div>
      </div>
      <p class="foot">Traditional programming has no training step. A person's rule scored {{ pct(data?.human.test_accuracy) }} on the same unseen flowers.</p>
    </div>
  </section>
</template>

<style scoped>
.ml { position: absolute; inset: 0; }
.idea { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 9vw; }
.idea h1 { margin-top: 18px; font: 600 clamp(34px, 4.4vw, 76px) / 1.12 'Space Grotesk', system-ui; }
.idea h1 span { font-weight: 400; color: rgb(var(--c-data-soft)); font-size: .72em; }
.quote { margin-top: 34px; max-width: 60ch; font: 400 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) / 1.5 'Inter', system-ui; color: rgb(var(--c-soft)); font-style: italic; }
.quote small { display: block; margin-top: 8px; font-style: normal; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-faint)); }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.layout { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 84px 6vw 92px; gap: 10px; }
.head h2 { font: 600 clamp(28px, 2.8vw, 48px) / 1.1 'Space Grotesk', system-ui; margin-top: 8px; }
.lead { max-width: 80ch; margin-top: 8px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.vis { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.vis > :deep(svg) { width: 100%; height: 100%; max-width: 1560px; }
.vis.two { flex-direction: column; gap: 4px; }
.lane-wrap { position: relative; flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; }
.lane-wrap :deep(svg) { flex: 1; min-height: 0; width: 100%; max-width: 1400px; }
.tag { align-self: flex-start; font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; letter-spacing: .18em; text-transform: uppercase; white-space: nowrap; }
.tag.t { color: rgb(var(--c-human)); } .tag.m { color: rgb(var(--c-feature)); }
.player { display: flex; align-items: center; gap: 8px; }
.ctl { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: rgb(var(--c-text)); background: rgba(var(--c-text), .06); }
.ctl:hover { background: rgba(var(--c-text), .12); }
.ic { width: 18px; height: 18px; }
.scrub { width: min(360px, 30vw); accent-color: rgb(var(--c-data)); }
.src { margin-left: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
.err { color: rgb(var(--c-human)); }
.recap .cols { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; align-items: safe center; overflow-y: auto; }
.col { padding: 28px 30px; border-radius: 20px; background: rgba(var(--c-surface), .72); border-top: 3px solid; }
.col.train { border-color: rgb(var(--c-feature)); } .col.infer { border-color: rgb(var(--c-ok)); }
.col h3 { font: 600 clamp(24px, 2.2vw, 38px) 'Space Grotesk', system-ui; margin-bottom: 14px; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 12px 18px; font-size: max(clamp(15px, 1.25vw, 21px), var(--up-15, 15px)); }
dt { color: rgb(var(--c-faint)); text-transform: uppercase; letter-spacing: .12em; font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; padding-top: 4px; }
dd { color: rgb(var(--c-text)); line-height: 1.4; }
dd b { color: rgb(var(--c-human)); }
.foot { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-dim)); }
button:focus-visible, input:focus-visible { outline: 2px solid rgb(var(--c-data)); outline-offset: 2px; }
@media (max-width: 900px) { .recap .cols { grid-template-columns: 1fr; } }
</style>
