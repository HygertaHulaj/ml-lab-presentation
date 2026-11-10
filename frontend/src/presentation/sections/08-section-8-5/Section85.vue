<script setup lang="ts">
/**
 * Section 8 — DS4A Section 8.5 "Deep Learning" (book pp. 389–392), in source order, plus one clearly labelled
 * extension (draw a digit). One backend call (`GET /concepts/deep-learning`) provides the trained network's numbers:
 * architecture, accuracy, real digits and their layer activations, mistakes and learning curves.
 * → first advances the current module's own stages (each module exposes `advance()`), then moves on.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type DeepLearning } from '../../api'
import { errorMessage } from '../../../api/client'
import NetworkFigure from './NetworkFigure.vue'
import LearningCurves from './LearningCurves.vue'
import DigitPixels from './DigitPixels.vue'
import ForwardPass from './ForwardPass.vue'
import DrawDigit from './DrawDigit.vue'
import { APPLICATIONS, CASES, COSTS, DL_CAVEAT, GAINS, SUMMARY } from './content'

const ID = 'section-8-5'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const mod = ref<{ advance: () => boolean } | null>(null)
const dl = ref<DeepLearning | null>(null)
const error = ref<string | null>(null)
const digit = ref(3) // the chosen example, shared by "an image is numbers" and "inside the network"
const reveal = ref(0) // simple → reveals on text steps
watch(step, (s) => { reveal.value = 0; shell.setFieldAlpha(s === 0 || s === 11 ? 0.8 : 0.12) }, { immediate: true })
onMounted(async () => { try { dl.value = await presentationApi.deepLearning() } catch (e) { error.value = errorMessage(e) } })
const REVEALS: Record<number, number> = { 1: 1, 4: 1, 5: 1 }
useSectionKeys((e) => {
  if (!(e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) return false
  if (mod.value?.advance()) return true
  if (reveal.value < (REVEALS[step.value] ?? 0)) { reveal.value++; return true }
  return false
})

const HEAD = [
  { page: 'p. 389', q: 'How does a phone read a menu in Turkish?', title: 'Deep Learning' },
  { page: 'p. 389', q: 'What do we gain, and what does it cost?', title: 'Power, at a price' },
  { page: 'p. 389', q: 'Where is deep learning already?', title: 'Why study deep learning?' },
  { page: 'pp. 389–390', q: 'What is a neural network?', title: 'Artificial neural networks (Fig. 8.23)' },
  { page: 'p. 390', q: 'Why do more layers help?', title: 'The mechanics of deep learning' },
  { page: 'p. 390', q: 'How does ChatGPT write?', title: 'Case study: ChatGPT' },
  { page: 'pp. 390–391', q: 'When are deep networks worth it?', title: 'More data, deeper networks (Fig. 8.24)' },
  { page: 'p. 391', q: 'How can a network read handwriting?', title: 'An image is an array of numbers (Fig. 8.25)' },
  { page: 'p. 391', q: 'What happens inside?', title: 'Inside a trained network' },
  { page: 'extension', q: 'Can it read your handwriting?', title: 'Try it yourself: draw a digit' },
  { page: 'pp. 391–392', q: 'Where else is this used?', title: 'Deep learning around us' },
  { page: 'pp. 389–392', q: 'What did Section 8.5 teach us?', title: 'Summary' },
]
const head = computed(() => HEAD[step.value])
const ICON: Record<string, string> = {
  voice: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  lang: 'M4 5h9M8.5 3v2M6 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8M14 21l4-9 4 9M15.5 18h5',
  car: 'M5 16l1.5-5h11L19 16M4 16h16v3H4zM7 19v2M17 19v2',
  chat: 'M4 5h16v10H9l-5 4z',
  face: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 10h.01M15 10h.01M9 15c2 1.5 4 1.5 6 0',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
}
const lossPath = computed(() => {
  const c = dl.value?.loss_curve ?? []
  if (!c.length) return ''
  const max = Math.max(...c)
  return c.map((v, i) => `${i ? 'L' : 'M'}${(i / (c.length - 1)) * 300},${90 - (v / max) * 80}`).join('')
})
</script>

<template>
  <section class="s85" :data-step="step" data-testid="section-85">
    <header class="head">
      <div class="kicker">Section 8.5{{ head.page === 'extension' ? ' · beyond the book' : '' }}</div>
      <p class="q" data-testid="s85-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="intro">
        <div>
          <h1>{{ head.title }}</h1>
          <p>Alex holds her phone up to a restaurant menu in Istanbul, and an app translates it into her own language. That app runs on <b>deep learning</b>.</p>
          <p class="small">AI imitates human behaviour. Machine learning learns it from data. Deep learning goes further, imitating the brain and nervous system with neural networks.</p>
        </div>
        <svg viewBox="0 0 360 360" class="rings" role="img" aria-label="Deep learning inside machine learning inside artificial intelligence">
          <circle cx="180" cy="180" r="170" style="fill: rgba(var(--c-human), .08); stroke: rgb(var(--c-human))" />
          <circle cx="180" cy="210" r="118" style="fill: rgba(var(--c-data), .1); stroke: rgb(var(--c-data))" />
          <circle cx="180" cy="245" r="66" style="fill: rgba(var(--c-accent), .22); stroke: rgb(var(--c-accent)); stroke-width: 3" />
          <text x="180" y="50" text-anchor="middle" class="rl" style="fill: rgb(var(--c-human))">Artificial intelligence</text>
          <text x="180" y="125" text-anchor="middle" class="rl" style="fill: rgb(var(--c-data))">Machine learning</text>
          <text x="180" y="250" text-anchor="middle" class="rl" style="fill: rgb(var(--c-accent))">Deep learning</text>
        </svg>
      </div>

      <div v-else-if="step === 1" class="balance" data-testid="m-balance">
        <div class="side gain"><h3>Gains</h3><ul><li v-for="g in GAINS" :key="g">{{ g }}</li></ul></div>
        <div class="side cost" :class="{ hide: reveal < 1 }" data-testid="s85-costs"><h3>Costs</h3><ul><li v-for="c in COSTS" :key="c">{{ c }}</li></ul></div>
        <div class="note caveat" :class="{ hide: reveal < 1 }" data-testid="s85-caveat"><p><b>Performance depends on the task, the data and the model.</b> {{ DL_CAVEAT.text }}</p><p class="src">Beyond the book: {{ DL_CAVEAT.cite }}</p></div>
      </div>

      <div v-else-if="step === 2" class="apps" data-testid="m-apps">
        <div v-for="(a, i) in APPLICATIONS" :key="a.k" class="app" :style="{ animationDelay: i * 0.1 + 's' }">
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path :d="ICON[a.icon]" /></svg>
          <strong>{{ a.k }}</strong><span>{{ a.s }}</span>
        </div>
      </div>

      <NetworkFigure v-else-if="step === 3" ref="mod" />

      <div v-else-if="step === 4" class="mech" data-testid="m-mechanics">
        <div class="stack">
          <p class="lead">Deep networks pass data through more layers and do more mathematical operations than many other models. Each layer builds on the last, so the network can form more complex features and find patterns other methods miss.</p>
          <div class="ladder"><span v-for="(l, i) in ['pixels', 'strokes and edges', 'loops and lines', 'digit shapes']" :key="l" :style="{ marginLeft: i * 28 + 'px' }">layer {{ i + 1 }}: {{ l }}</span></div>
          <p class="src">Illustration of the idea; real networks do not label their features</p>
        </div>
        <div :class="{ hide: reveal < 1 }" class="cost-card" data-testid="s85-mech-cost">
          <h3>The price</h3>
          <ul><li>needs large amounts of data</li><li>needs advanced computing for training</li><li>is challenging to understand and almost impossible to interpret</li><li>can be overkill for less complex problems</li></ul>
          <template v-if="dl">
            <p class="h">Even our small digit network has <b>{{ dl.n_weights.toLocaleString('en') }}</b> weights, trained over {{ dl.iterations }} passes:</p>
            <svg viewBox="0 0 300 100" class="loss" role="img" aria-label="Training loss falling over the passes"><path :d="lossPath" /></svg>
            <p class="src">training loss per pass, from the backend · compare a depth-2 tree: 3 questions (Section 8.3)</p>
          </template>
        </div>
      </div>

      <div v-else-if="step === 5" class="case" data-testid="m-chatgpt">
        <div class="cc">
          <p class="lead">ChatGPT is a <b>large language model</b>: deep learning that understands and generates natural language.</p>
          <ol>
            <li>It is trained on vast amounts of text: books, articles, web pages.</li>
            <li>Nobody labels that text. The model learns patterns and relationships in it by itself.</li>
            <li>Asked a question, it analyses the input, matches it to patterns it has seen and generates a response.</li>
          </ol>
          <p class="small">Uses: natural language processing, chatbots, virtual assistants (case study, p. 390).</p>
        </div>
        <div class="note" :class="{ hide: reveal < 1 }" data-testid="s85-chatgpt-note">
          <h3>A precise word</h3>
          <p>The book calls this <i>unsupervised</i> learning. More precisely it is <b>self-supervised</b>: the text supplies its own answers (the model learns to predict the next word), and the model is then fine-tuned with human feedback.</p>
          <p class="small">It generates likely text, so it can sound sure and still be wrong: check what it says.</p>
        </div>
      </div>

      <div v-else-if="step === 10" class="cases" data-testid="m-cases">
        <div v-for="c in CASES" :key="c.k" class="cs"><strong>{{ c.k }}</strong><span>{{ c.v }}</span></div>
        <p class="resp">Facial recognition is only as fair as its training data. If some groups are under-represented, it fails them more often: the data-diversity question of Section 8.6 and the chapter's ethics box (pp. 393–395).</p>
      </div>

      <div v-else-if="step === 11" class="summary" data-testid="s85-summary">
        <div v-for="(s, i) in SUMMARY" :key="s.k" class="sum" :style="{ animationDelay: i * 0.15 + 's' }"><strong>{{ s.k }}</strong><span>{{ s.v }}</span></div>
        <SectionBridge id="section-8-5" :answer="false" :next="false" />
      </div>

      <div v-else-if="error" class="err" data-testid="s85-error">The backend is not reachable ({{ error }}). Start it, then reload: the network on these slides is trained there.</div>
      <div v-else-if="!dl" class="loading">Loading the trained network…</div>
      <template v-else>
        <LearningCurves v-if="step === 6" ref="mod" :data="dl" />
        <DigitPixels v-else-if="step === 7" ref="mod" v-model="digit" :examples="dl.examples" :shading-max="dl.dataset.shading_max" />
        <ForwardPass v-else-if="step === 8" ref="mod" v-model="digit" :data="dl" />
        <DrawDigit v-else-if="step === 9" ref="mod" :architecture="dl.architecture" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.s85 { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
h3 { font: 600 clamp(18px, 1.4vw, 24px) 'Space Grotesk', system-ui; margin-bottom: 10px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.hide { opacity: 0; }
.lead { font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-text)); line-height: 1.5; }
.lead b, .intro b { color: rgb(var(--c-accent)); }
.small { margin-top: 12px; font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-dim)); line-height: 1.5; }
.src { margin-top: 6px; font-size: 12px; color: rgb(var(--c-faint)); }
.intro { display: grid; grid-template-columns: 1.2fr 1fr; gap: 4vw; align-items: center; width: 100%; }
.intro h1 { font: 600 clamp(38px, 4.6vw, 78px) / 1.05 'Space Grotesk', system-ui; }
.intro p { margin-top: 18px; max-width: 56ch; font-size: clamp(16px, 1.4vw, 24px); color: rgb(var(--c-soft)); line-height: 1.5; }
.rings { width: 100%; max-height: 52vh; }
.rings circle { stroke-width: 2; }
.rl { font: 600 17px 'Space Grotesk', system-ui; }
.balance { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; width: 100%; }
.side { padding: 22px 26px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 4px solid; transition: opacity .5s; }
.side.gain { border-color: rgb(var(--c-ok)); } .side.cost { border-color: rgb(var(--c-warn)); }
.side li, .cost-card li { margin: 10px 0 10px 18px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-text)); }
.apps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; width: 100%; }
.app { display: flex; flex-direction: column; gap: 8px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.ic { width: 38px; height: 38px; fill: none; stroke: rgb(var(--c-accent)); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.app strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.app span { color: rgb(var(--c-dim)); font-size: max(15px, var(--up-15, 15px)); }
.mech { display: grid; grid-template-columns: 1.1fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.ladder { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; }
.ladder span { align-self: flex-start; padding: 8px 14px; border-radius: 10px; background: rgba(var(--c-compute), .14); border-left: 3px solid rgb(var(--c-compute)); font: 500 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
.cost-card { padding: 20px 24px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 4px solid rgb(var(--c-warn)); transition: opacity .5s; }
.cost-card .h { margin-top: 12px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.cost-card .h b { color: rgb(var(--c-accent)); }
.loss { width: 100%; height: 90px; margin-top: 6px; }
.loss path { fill: none; stroke: rgb(var(--c-accent)); stroke-width: 2.5; }
.case { display: grid; grid-template-columns: 1.2fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.case ol { margin: 16px 0 0 20px; display: grid; gap: 10px; font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.45; }
.note { padding: 20px 24px; border-radius: 18px; background: rgba(var(--c-human), .08); border-left: 4px solid rgb(var(--c-human)); transition: opacity .5s; }
.note p { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.5; }
.note b { color: rgb(var(--c-human)); }
.balance .caveat { grid-column: 1 / -1; }
.cases { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
.cs { display: flex; flex-direction: column; gap: 10px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); }
.cs strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.cs span { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.resp { grid-column: 1 / -1; padding: 14px 18px; border-radius: 12px; background: rgba(var(--c-warn), .08); border-left: 3px solid rgb(var(--c-warn)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.5; }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
.err { color: rgb(var(--c-warn)); font-size: max(18px, var(--up-18, 18px)); }
.loading { color: rgb(var(--c-dim)); font-size: max(18px, var(--up-18, 18px)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) { .apps, .summary { grid-template-columns: 1fr 1fr; } .intro, .balance, .mech, .case, .cases { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .app, .sum { animation: none; } }
</style>
