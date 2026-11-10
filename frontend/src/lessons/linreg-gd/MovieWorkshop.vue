<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import CinematicLessonShell from '../../components/lesson/CinematicLessonShell.vue'
import { useLinregLessonStore, runLinRegGd } from '../../stores/linregLesson'
import { errorMessage } from '../../api/client'
import { toggleFullscreen, useLessonShortcuts } from '../../engine/InteractionController'
import { usePresentation } from '../../presentation/store'
import { themeVars } from '../../presentation/theme'
import GdScene from './GdScene.vue'
import GdMathPanel from './GdMathPanel.vue'
import GdLabPanel from './GdLabPanel.vue'
import type { LinRegTrace } from './types'
import { budgetPlot, costPaths, movieExamples } from './workshop'

const store = useLinregLessonStore()
const theme = usePresentation()
const vars = computed(() => themeVars(theme.theme, 'lab'))
const stages = ['Story', 'Predict', 'Watch', 'Try', 'Solution']
const stage = ref(0)
const prediction = ref('')
const ratePrediction = ref('')
const root = ref<HTMLElement | null>(null)
const baseline = shallowRef<LinRegTrace[]>([])
const comparison = shallowRef<LinRegTrace[]>([])
const experimenting = ref(false)
const experimentError = ref('')
const watchScene = ref('c-rise')
const examples = computed(() => baseline.value[1] ? movieExamples(baseline.value[1]) : [])
const line = computed(() => baseline.value[1])
const plot = computed(() => line.value ? budgetPlot(line.value) : null)
const models = computed(() => baseline.value[0]?.models ?? [])
const paths = computed(() => costPaths(comparison.value))
const ready = computed(() => !!line.value && !store.loading && !store.error)
const allowedNext = computed(() => stage.value !== 1 || !!prediction.value)
const selectedMovie = ref(0)
const example = computed(() => examples.value[selectedMovie.value])
// Show one recorded observation and its recorded least-squares prediction, without running a model in the UI.
const predictionForExample = computed(() => example.value && line.value ? line.value.ols.fitted[example.value.index] : null)
const format = (v: number) => Math.abs(v) >= 1e5 || (Math.abs(v) < 0.001 && v !== 0) ? v.toExponential(3) : v.toFixed(3)
const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

async function load() {
  baseline.value = []
  await store.load('shah-8-4-movies')
  if (!store.error) baseline.value = [...store.traces]
}
function themeKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName ?? '')) return
  if (event.key.toLowerCase() === 'l') { event.preventDefault(); theme.theme = theme.theme === 'warm' ? 'light' : 'warm' }
}
onMounted(() => { void load(); window.addEventListener('keydown', themeKey) })
onBeforeUnmount(() => { store.controller.pause(); window.removeEventListener('keydown', themeKey) })

async function go(index: number) {
  if (!ready.value || index < 0 || index >= stages.length) return
  store.controller.pause()
  stage.value = index
  if (index === 2) {
    await nextTick()
    store.setMode('story')
    store.seekScene(watchScene.value)
  }
}
function next() { if (allowedNext.value) void go(stage.value + 1) }
// Stop the focused demonstration at its interpretation instead of running into the outro.
watch(() => store.position, (t) => {
  if (stage.value !== 2 || !store.playing) return
  const stop = store.timeline?.scenes.find((s) => s.id === (watchScene.value.startsWith('a-') ? 'a-read' : 'c-read'))
  if (stop && t >= stop.start) { store.controller.pause(); store.controller.seek(stop.start) }
})
async function experiment() {
  if (!store.manifest || experimenting.value) return
  experimenting.value = true
  experimentError.value = ''
  try {
    const config = store.manifest.parts[1].config
    comparison.value = await Promise.all([0.1, 2.2].map((learning_rate) =>
      runLinRegGd({ ...config, learning_rate, iterations: 80 }).then((r) => r.trace)))
  } catch (e) { experimentError.value = errorMessage(e) }
  finally { experimenting.value = false }
}
async function watchRun(rate: number) {
  await store.rerun(1, { learning_rate: rate, iterations: 80 }, 'c-descend')
  if (!store.error) { watchScene.value = 'c-descend'; await go(2) }
}
async function watchPlane() {
  watchScene.value = 'a-rise'
  await go(2)
}
useLessonShortcuts({
  right: () => { if (stage.value !== 2) next() },
  left: () => { if (stage.value !== 2) void go(stage.value - 1) },
  f: () => { if (stage.value !== 2) void toggleFullscreen(root.value) },
})
</script>

<template>
  <div ref="root" class="workshop" :style="vars" :data-theme="theme.theme" data-testid="movie-workshop">
    <header class="journey">
      <RouterLink to="/activities" class="back">← Activities</RouterLink>
      <nav aria-label="Classroom journey">
        <button v-for="(label, i) in stages" :key="label" :aria-current="stage === i ? 'step' : undefined" :disabled="!ready" @click="go(i)"><span>{{ i + 1 }}</span>{{ label }}</button>
      </nav>
      <div class="display-controls"><button @click="theme.theme = theme.theme === 'warm' ? 'light' : 'warm'">{{ theme.theme === 'warm' ? 'Light room' : 'Dark room' }} (L)</button><button class="fullscreen" @click="toggleFullscreen(root)">Full screen</button></div>
    </header>
    <div v-if="!ready" class="loading" role="status">
      <template v-if="store.error"><p role="alert">{{ store.error }}</p><button class="primary" @click="load">Retry loading movies</button></template>
      <p v-else>Loading the book’s movie observations and computed models…</p>
    </div>
    <template v-else>
      <div v-if="stage === 2" class="cinema">
        <div class="watch-stops" aria-label="Demonstration moments"><span>One model, two views</span><button @click="store.controller.pause(); store.seekScene(watchScene.startsWith('a-') ? 'a-guess' : 'c-residuals')">1. Inspect errors</button><button v-if="!watchScene.startsWith('a-')" @click="store.controller.pause(); store.seekScene('c-bowl')">2. Reveal the bowl</button><button @click="store.controller.pause(); store.seekScene(watchScene.startsWith('a-') ? 'a-descend' : 'c-descend')">3. Watch updates · press Space</button></div>
        <CinematicLessonShell :store="store" initially-started :camera="[0, 2.2, 15]" back-to="/activities" accent="movies">
          <template #scene="{ reducedMotion, onContextLost }"><GdScene :reduced-motion="reducedMotion" @contextlost="onContextLost" /></template>
          <template #math="{ large }"><GdMathPanel :large="large" /></template>
          <template #lab><GdLabPanel /></template>
        </CinematicLessonShell>
      </div>
      <main v-else :key="stage" class="content" :data-testid="`workshop-stage-${stage}`">
        <p class="eyebrow">Hands-On Problem 8.4 · Movies, 2014–2015 · Shah, p. 233</p>
        <template v-if="stage === 0">
          <h1>Can money buy a better movie rating?</h1>
          <p class="lead">Before fitting a model, look at three real observations. Does a bigger budget seem to guarantee a higher rating?</p>
          <div class="story-evidence"><figure v-if="plot" class="budget-plot"><svg viewBox="0 0 800 280" role="img" :aria-label="`Budget versus observed rating for ${line!.n} movies; each dot is an observation`"><path d="M64 30V220H750" class="chart-axis" /><circle v-for="point in plot.points" :key="point.index" :cx="point.x" :cy="point.y" :r="examples.some((e) => e.index === point.index) ? 6 : 3.5" :class="examples.some((e) => e.index === point.index) ? 'example-dot' : 'observation-dot'" /><text x="64" y="20">Observed rating</text><text x="20" y="47">{{ plot.maxRating }}</text><text x="20" y="220">{{ plot.minRating }}</text><text x="64" y="246">$0</text><text x="560" y="246">{{ money(plot.maxBudget) }}</text><text x="310" y="270">Budget ($) →</text></svg><figcaption>All observations, before any model. Larger outlined dots locate the three example cards.</figcaption></figure>
          <div class="movie-grid">
            <article v-for="(movie, i) in examples" :key="movie.index" class="movie-card">
              <span class="number">{{ ['Lower', 'Middle', 'Higher'][i] }} budget example</span>
              <h2>{{ movie.name }}</h2><dl><div><dt>Budget</dt><dd>{{ money(movie.budget) }}</dd></div><div><dt>Observed rating</dt><dd>{{ movie.rating }}</dd></div></dl>
            </article>
          </div>
          </div>
          <p class="note">Examples selected near the 15th, 50th and 85th budget percentiles of the {{ line!.n }} complete observations used in all comparisons. Three examples start a question; the model uses all observations.</p>
        </template>
        <template v-if="stage === 1">
          <h1>Make a prediction before the reveal.</h1>
          <p class="lead">Will adding social-media reactions to budget make ratings much easier to predict?</p>
          <div class="choices" role="group" aria-label="Audience prediction">
            <button v-for="choice in ['A large improvement', 'A small improvement', 'I need evidence']" :key="choice" :aria-pressed="prediction === choice" @click="prediction = choice">{{ choice }}</button>
          </div>
          <p class="prompt">Discuss: what might affect a rating that a budget or a follower count cannot capture?</p>
          <p v-if="prediction" class="note" data-testid="workshop-prediction">Your prediction: {{ prediction }}. Keep it in mind as we inspect the errors.</p>
        </template>
        <template v-if="stage === 3">
          <h1>Would bigger steps get there faster?</h1>
          <p class="lead">Change one thing: the learning rate α. Both runs start from zero, use the same standardized budget predictor, and allow 80 updates.</p>
          <div v-if="!comparison.length" class="choices" role="group" aria-label="Learning rate prediction"><button v-for="choice in ['Faster and still stable', 'It could overshoot']" :key="choice" :aria-pressed="ratePrediction === choice" @click="ratePrediction = choice">{{ choice }}</button></div>
          <p v-if="comparison.length" class="note">Your prediction: {{ ratePrediction }}. Read the cost change as well as the stopping reason.</p>
          <button class="primary" :disabled="!ratePrediction || experimenting" @click="experiment">{{ experimenting ? 'Computing both runs…' : comparison.length ? 'Run comparison again' : 'Test the prediction' }}</button>
          <p v-if="experimentError" role="alert">{{ experimentError }}</p>
          <div v-if="comparison.length" data-testid="workshop-comparison">
            <svg class="cost-chart" viewBox="0 0 800 270" role="img" aria-label="Cost against iteration for both learning rates on the same log scale">
              <path d="M48 25V230H755" class="chart-axis" />
              <polyline v-for="(path, i) in paths" :key="i" :points="path" fill="none" :class="i ? 'fast-path' : 'stable-path'" stroke-width="4" />
              <text x="48" y="18">log(1 + cost J)</text><text x="48" y="252">0</text><text x="630" y="252">iteration → 80</text>
            </svg>
            <div class="results"><article v-for="(run, i) in comparison" :key="run.learning_rate" :class="['result', i ? 'fast' : 'stable']"><h2>α = {{ run.learning_rate }}</h2><p class="outcome">{{ run.final.cost > run.initial_cost ? 'Cost increased' : 'Cost decreased' }}</p><p>Stopped: {{ run.stop_reason }} · {{ run.iterations_run }} updates</p><p>J: {{ format(run.initial_cost) }} → {{ format(run.final.cost) }}</p><button @click="watchRun(run.learning_rate)">Watch this run in 3D →</button></article></div>
            <p class="note">Both curves share the same axes; height uses log(1 + J) so exploding costs remain visible. At 80 updates, a growing cost can still report max_iterations: that is the stopping reason, not evidence of a good fit.</p>
          </div>
        </template>
        <template v-if="stage === 4">
          <h1>A better fit can still be a weak predictor.</h1>
          <p class="lead">{{ prediction ? `You predicted: “${prediction}.”` : 'Revisit the opening question.' }} Here is the least-squares evidence on the same {{ line!.n }} movies.</p>
          <div class="results" data-testid="workshop-solution">
            <article class="result"><h2>Budget alone</h2><p class="score">{{ (line!.ols.r2 * 100).toFixed(1) }}%</p><p>of observed rating variation accounted for · R² {{ line!.ols.r2.toFixed(3) }}</p></article>
            <article v-for="model in models" :key="model.label" class="result"><h2>{{ model.label }}</h2><p class="score">{{ (model.r2 * 100).toFixed(1) }}%</p><p>R² {{ model.r2.toFixed(3) }} · adjusted R² {{ model.adj_r2.toFixed(3) }}</p></article>
          </div>
          <div v-if="baseline[0]?.single_predictors" class="worked" data-testid="workshop-single">
            <h2>Which single factor? The criterion</h2>
            <p>Strongest absolute sample correlation with rating, on the same {{ baseline[0].n }} movies. For one predictor this is the same as the highest in-sample R² (R² = r²).</p>
            <p v-for="q in baseline[0].single_predictors" :key="q.predictor">{{ q.predictor.replace(/_/g, ' ') }}: r = {{ q.r.toFixed(3) }} · R² = {{ q.r2.toFixed(3) }}</p>
            <p>This ranks associations in these observations. It is not causal, and it is not evidence of the best prediction for unseen movies.</p>
          </div>
          <p class="prompt">The optimizer finds a good fit for this model. It cannot create information the predictors do not contain.</p>
          <details class="worked"><summary>Return to one movie: inspect a prediction</summary><label>Observation <select v-model.number="selectedMovie"><option v-for="(movie, i) in examples" :key="movie.index" :value="i">{{ movie.name }}</option></select></label><p v-if="example && predictionForExample !== null">{{ example.name }}: observed {{ example.rating }}, budget-only prediction {{ format(predictionForExample) }}.</p><p>R² describes fit to these observations. We have not measured performance on unseen movies, and association does not establish causation.</p></details>
          <div class="followups"><button @click="watchPlane">Add a predictor: watch the movie plane →</button><RouterLink to="/activities/hoids-hop8-4">Open the worked activity →</RouterLink><RouterLink to="/lessons/shah-8-2-airlines">Next: Airlines · from a line to a plane →</RouterLink><RouterLink to="/lessons/shah-8-3-rock">Advanced: Rock · a slice of a larger model →</RouterLink></div>
        </template>
      </main>
      <footer class="journey-footer"><button :disabled="stage === 0" @click="go(stage - 1)">← Back</button><p>{{ stage === 2 ? 'Space: play/pause · ← →: scene steps · Continue when ready' : '← →: journey steps · F: full screen' }}</p><button v-if="stage < 4" class="primary" :disabled="!allowedNext" @click="next">{{ ['Make a prediction →', 'Inspect the fit in 3D →', 'Try the learning-rate experiment →', 'Reveal the evidence →'][stage] }}</button><RouterLink v-else to="/activities">Back to activities →</RouterLink></footer>
    </template>
  </div>
</template>

<style scoped>
.workshop { --accent: rgb(var(--c-accent)); height: 100dvh; display: flex; flex-direction: column; background: rgb(var(--c-ground)); color: rgb(var(--c-text)); font-family: Inter, system-ui, sans-serif; }
.journey, .journey-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; background: rgb(var(--c-surface)); flex-shrink: 0; }
.journey nav { display: flex; flex-wrap: wrap; gap: 8px; }
.display-controls { display: flex; gap: 8px; font-size: 13px; }
button, select, .followups a { border: 1px solid rgba(var(--c-text), .25); border-radius: 10px; padding: 10px 16px; cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
button:focus-visible, a:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
button[aria-current], button[aria-pressed=true] { border-color: var(--accent); background: rgba(var(--c-accent), .15); }
nav button { font-size: 14px; } nav span { margin-right: 8px; color: var(--accent); }
.content { flex: 1; overflow-y: auto; padding: clamp(20px, 3vw, 44px); }
.eyebrow, .number { color: var(--accent); font-size: 14px; letter-spacing: .08em; }
h1 { font-size: clamp(30px, 3.5vw, 62px); line-height: 1.1; max-width: 1100px; margin: 18px 0; font-weight: 600; }
.lead, .prompt { max-width: 1100px; font-size: clamp(20px, 1.65vw, 28px); line-height: 1.5; margin: 20px 0; }
.movie-grid, .results { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 20px; margin: 28px 0; }
.movie-card, .result, .worked { background: rgb(var(--c-surface)); border: 1px solid rgba(var(--c-accent), .25); border-radius: 18px; padding: 24px; }
h2 { font-size: 23px; font-weight: 600; line-height: 1.3; margin-bottom: 16px; }
.movie-card h2 { margin: 8px 0; font-size: 22px; }
.story-evidence { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; align-items: center; margin: 24px 0; } .story-evidence .movie-grid { grid-template-columns: 1fr; margin: 0; gap: 12px; } .story-evidence .movie-card { padding: 16px 20px; } .story-evidence dl { display: flex; gap: 24px; } .story-evidence dl div { flex: 1; padding: 6px 0; align-items: center; } .story-evidence dt { font-size: 14px; } .story-evidence dd { font-size: 20px; } .story-evidence .number { font-size: 12px; }
dl div { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid rgba(var(--c-text), .15); } dt { color: rgb(var(--c-soft)); } dd { font-size: 23px; }
.note { font-size: 16px; line-height: 1.55; color: rgb(var(--c-soft)); max-width: 1100px; }
.choices { display: flex; flex-wrap: wrap; gap: 18px; margin: 32px 0; } .choices button { font-size: 23px; padding: 22px 28px; text-align: left; }
.primary { background: var(--accent); color: rgb(var(--c-ground)); font-weight: 600; }
.prompt { border-left: 4px solid var(--accent); padding-left: 24px; }
.result .outcome { font-weight: 600; } .result p, .worked p { font-size: 20px; line-height: 1.5; margin: 10px 0; } .score { font-size: 46px !important; color: var(--accent); }
.worked summary { cursor: pointer; font-size: 22px; } .worked label { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; } select { background: rgb(var(--c-surface)); max-width: 100%; }
.followups { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
.cost-chart { max-height: 210px; width: 100%; margin-top: 20px; } .cost-chart text { fill: rgb(var(--c-soft)); font-size: 16px; } .chart-axis { fill: none; stroke: rgb(var(--c-dim)); }
.budget-plot { max-width: 1000px; background: rgb(var(--c-surface)); border-radius: 18px; padding: 12px; } .budget-plot svg { width: 100%; max-height: 340px; } .budget-plot text { fill: rgb(var(--c-soft)); font-size: 16px; } .budget-plot figcaption { font-size: 14px; color: rgb(var(--c-soft)); text-align: center; } .observation-dot { fill: rgb(var(--c-data)); opacity: .65; } .example-dot { fill: rgb(var(--c-ground)); stroke: var(--accent); stroke-width: 3; }
.stable-path { stroke: var(--accent); } .fast-path { stroke: rgb(var(--c-warn)); stroke-dasharray: 9 5; }
.stable { border-top: 4px solid var(--accent); } .fast { border-top: 4px solid rgb(var(--c-warn)); }
.cinema { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; } .cinema :deep(.lesson-root) { height: auto; flex: 1; min-height: 0; width: 100%; }
.watch-stops { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 8px 20px; font-size: 14px; } .watch-stops span { color: var(--accent); } .watch-stops button { padding: 6px 10px; }
.journey-footer { font-size: 14px; } .journey-footer p { color: rgb(var(--c-soft)); } .loading { margin: auto; padding: 32px; }
@media (max-width: 1000px) { .story-evidence { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .journey { padding: 10px; flex-wrap: wrap; gap: 8px; } .journey nav { order: 3; width: 100%; gap: 4px; } nav button { flex: 1; padding: 8px 4px; font-size: 12px; } nav span { display: none; } .journey-footer { padding: 10px; gap: 8px; } .journey-footer p { display: none; } .content { padding: 24px 16px; } .choices button { font-size: 20px; padding: 16px; } }
</style>
