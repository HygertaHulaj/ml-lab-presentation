<script setup lang="ts">
/**
 * Worked example between DS4A §8.3 and §8.4 (audit C3, §4): Shah, HoIDS Hands-On Problem 8.4 (p. 233), the 2014–2015
 * movies. Question → audience prediction → which predictor (stated criterion) → one movie's error → squared cost →
 * line and bowl → learning-rate experiment → in-sample evidence. Then Section 8.4 asks the next question: does it work
 * on movies the model never saw? (step "Back to the movies").
 * Everything is computed by the backend (`GET /lessons/shah-8-4-movies`, `POST /simulations/linreg-gd`); this section
 * renders it inside the presentation shell: one set of controls, one theme. The 3D lesson stays an optional extension.
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { errorMessage } from '../../../api/client'
import { lessonsApi } from '../../../api/lessons'
import { runLinRegGd } from '../../../stores/linregLesson'
import type { GdManifest, LinRegTrace } from '../../../lessons/linreg-gd/types'
import { costPaths, movieExamples } from '../../../lessons/linreg-gd/workshop'
import SectionBridge from '../common/SectionBridge.vue'
import MovieScatter from './MovieScatter.vue'
import CostBowl2D from './CostBowl2D.vue'

const ID = 'movies'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const beat = ref(0)
watch(step, (s) => { beat.value = 0; shell.setFieldAlpha(s === 0 || s === 7 ? 0.7 : 0.1) }, { immediate: true })

const manifest = shallowRef<GdManifest | null>(null)
const plane = shallowRef<LinRegTrace | null>(null) // part (a): budget + followers, with the model comparison and the predictor ranking
const line = shallowRef<LinRegTrace | null>(null) // part (c): budget alone, with the cost surface
const runs = shallowRef<LinRegTrace[]>([])
const error = ref<string | null>(null)
const running = ref(false)
onMounted(async () => {
  try {
    const m = (await lessonsApi.lesson('shah-8-4-movies')) as unknown as GdManifest
    manifest.value = m
    const [a, c] = await Promise.all(m.parts.map((p) => runLinRegGd(p.config).then((r) => r.trace)))
    plane.value = a; line.value = c
  } catch (e) { error.value = errorMessage(e) }
})

const examples = computed(() => (line.value ? movieExamples(line.value) : []))
const selected = computed(() => {
  const ex = examples.value
  return ex.find((e) => e.name === store.movie) ?? ex[1] ?? null
})
function pick(name: string) { store.movie = name }
watch(examples, (ex) => { if (ex.length && !ex.some((e) => e.name === store.movie)) store.movie = ex[1].name }, { immediate: true })

const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
const f3 = (v: number) => v.toFixed(3)
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const residual = computed(() => (line.value && selected.value ? line.value.diagnostics.residuals[selected.value.index] : null))
const fittedSel = computed(() => (line.value && selected.value ? line.value.ols.fitted[selected.value.index] : null))
const ref0 = computed(() => (line.value ? { intercept: line.value.ols.intercept, slope: line.value.ols.coefficients[0] } : null))

// step 5: learner-paced beats through recorded iterations (no autoplay): 0, 1, 3, 10, then the last recorded frame
const ITERS = computed(() => (line.value ? [0, 1, 3, 10, line.value.iterations_run] : [0]))
const frameIdx = computed(() => {
  if (!line.value) return 0
  const want = ITERS.value[Math.min(beat.value, ITERS.value.length - 1)]
  const i = line.value.frames.findIndex((fr) => fr.iteration >= want)
  return i < 0 ? line.value.frames.length - 1 : i
})
const frame = computed(() => line.value?.frames[frameIdx.value] ?? null)

// step 6: predict first, then the backend runs both learning rates (80 updates each, same start)
const RATES = [0.1, 2.2]
const ratePrediction = ref('')
async function runExperiment() {
  if (!manifest.value || running.value) return
  running.value = true
  try {
    const cfg = manifest.value.parts[1].config
    runs.value = await Promise.all(RATES.map((learning_rate) => runLinRegGd({ ...cfg, learning_rate, iterations: 80 }).then((r) => r.trace)))
    beat.value = 1
  } catch (e) { error.value = errorMessage(e) } finally { running.value = false }
}
const paths = computed(() => costPaths(runs.value))

useSectionKeys((e) => {
  if (!(e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) return false
  if (step.value === 5 && beat.value < ITERS.value.length - 1) { beat.value++; return true }
  if (step.value === 6 && beat.value === 0 && ratePrediction.value) { void runExperiment(); return true }
  return false
})

const HEAD = [
  { q: 'A category answers which kind. How does a model learn how much?', title: 'Can money buy a better movie rating?' },
  { q: 'Before any model: what do you expect?', title: 'Make a prediction' },
  { q: 'Five factors are available. Which one first?', title: 'Which single predictor, and by what criterion?' },
  { q: 'How wrong is the model for one movie?', title: "One movie's error" },
  { q: 'How do we add up all the errors?', title: 'From errors to one number: the cost' },
  { q: 'How does the line find its place?', title: 'The line and the bowl' },
  { q: 'Would bigger steps get there faster?', title: 'A learning-rate experiment' },
  { q: 'What do we know now, and what not yet?', title: 'The evidence so far' },
]
const head = computed(() => HEAD[step.value])
const CHOICES = ['A large improvement', 'A small improvement', 'No improvement', 'I need evidence first']
</script>

<template>
  <section class="mv" :data-step="step" data-testid="section-movies">
    <header class="head">
      <div class="kicker">Worked example · Shah Problem 8.4</div>
      <p class="q" data-testid="movies-question">{{ head.q }}</p>
      <h2>{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="error" class="err" data-testid="movies-error">The backend is not reachable ({{ error }}). Start it, then reload: every number here is computed there.</div>
      <div v-else-if="!line || !plane" class="loading">Loading the movies and the computed models…</div>

      <div v-else-if="step === 0" class="two">
        <MovieScatter :trace="line" :examples="examples.map((e) => e.index)" :selected="selected?.index ?? null" />
        <div class="side">
          <p class="lead">{{ line.n }} movies from 2014 and 2015, each with its budget and its audience rating. Does a bigger budget go with a higher rating?</p>
          <div class="cards">
            <button v-for="(m, i) in examples" :key="m.index" class="mcard" :class="{ on: m.name === selected?.name }" :data-testid="`movie-pick-${i}`" @click="pick(m.name)">
              <small>{{ ['Lower', 'Middle', 'Higher'][i] }} budget</small><strong>{{ m.name }}</strong><span>{{ money(m.budget) }} · rating {{ m.rating }}</span>
            </button>
          </div>
          <p class="note">Examples near the 15th, 50th and 85th budget percentiles of the complete observations; pick one to follow through the example and into Section 8.4.</p>
        </div>
      </div>

      <div v-else-if="step === 1" class="center">
        <p class="lead">Budget alone, versus budget plus social-media reactions (followers, likes, dislikes, comments). How much easier will ratings be to predict?</p>
        <div class="choices" role="group" aria-label="Audience prediction">
          <button v-for="c in CHOICES" :key="c" :aria-pressed="store.moviePrediction === c" :data-testid="`movie-predict-${CHOICES.indexOf(c)}`" @click="store.moviePrediction = c">{{ c }}</button>
        </div>
        <p class="prompt">Give a reason: what might affect a rating that a budget or a follower count cannot capture?</p>
      </div>

      <div v-else-if="step === 2" class="two">
        <div class="ranks" data-testid="movie-ranks">
          <div v-for="q in plane.single_predictors" :key="q.predictor" class="rank" :class="{ best: q.predictor === plane.single_predictors![0].predictor }">
            <span class="nm">{{ q.predictor.replace(/_/g, ' ') }}</span>
            <span class="bar"><i :style="{ width: `${Math.abs(q.r) * 100 / Math.abs(plane.single_predictors![0].r) * 0.9}%` }" /></span>
            <span class="v">r = {{ f3(q.r) }} · R² = {{ f3(q.r2) }}</span>
          </div>
        </div>
        <div class="side">
          <p class="lead"><b>Criterion:</b> the strongest absolute sample correlation with rating. For one predictor this is the same as the highest R² on these {{ plane.n }} movies (R² = r²).</p>
          <p class="lead"><b>{{ plane.single_predictors![0].predictor.replace(/_/g, ' ') }}</b> comes first, and it still accounts for only {{ pct(plane.single_predictors![0].r2) }} of the variation.</p>
          <p class="note">In-sample association on the same movies: not a cause, and not proof of the best prediction for new movies.</p>
        </div>
      </div>

      <div v-else-if="step === 3 && selected && fittedSel !== null && residual !== null" class="two">
        <MovieScatter :trace="line" :reference="ref0" :selected="selected.index" :examples="examples.map((e) => e.index)" residuals="selected" />
        <div class="side">
          <div class="cards row"><button v-for="(m, i) in examples" :key="m.index" class="mcard small" :class="{ on: m.name === selected.name }" @click="pick(m.name)"><strong>{{ m.name }}</strong></button></div>
          <dl class="calc" data-testid="movie-residual">
            <dt>observed rating</dt><dd>{{ selected.rating }}</dd>
            <dt>line's prediction</dt><dd>{{ f3(fittedSel) }}</dd>
            <dt>error (residual)</dt><dd class="warn">{{ f3(residual) }}</dd>
            <dt>squared error</dt><dd>{{ f3(residual ** 2) }}</dd>
          </dl>
          <p class="note">The dashed line is the least-squares line for budget alone. Squaring stops positive and negative errors cancelling, and makes large errors count more.</p>
        </div>
      </div>

      <div v-else-if="step === 4" class="two">
        <MovieScatter :trace="line" :reference="ref0" :selected="selected?.index ?? null" residuals="all" />
        <div class="side">
          <p class="formula">J = (1 / 2m) · Σ (prediction − observed)²</p>
          <p class="lead">Every movie's error counts. With m = {{ line.n }} movies, the cost of the flat line at zero is J = <b>{{ f3(line.initial_cost) }}</b>; the least-squares line brings it down to J = <b data-testid="movie-jmin">{{ f3(line.surface!.minimum.cost) }}</b>.</p>
          <p class="note">Half the mean squared error (Shah eq. 8.5). The ½ only simplifies the gradient; it does not change which line is best.</p>
        </div>
      </div>

      <div v-else-if="step === 5 && frame" class="two">
        <MovieScatter :trace="line" :line="{ intercept: frame.display.intercept, slope: frame.display.slopes[0], tone: 'data' }" :reference="beat >= ITERS.length - 1 ? ref0 : null" />
        <div class="side">
          <CostBowl2D :trace="line" :upto="frameIdx" />
          <p class="lead" data-testid="movie-iter">Iteration <b>{{ frame.iteration }}</b> · cost J = <b>{{ f3(frame.cost) }}</b><template v-if="beat >= ITERS.length - 1"> · {{ line.stop_reason === 'converged' ? 'the change in cost fell below the tolerance' : line.stop_reason === 'diverged' ? 'the cost is growing' : 'iteration limit reached' }}</template></p>
          <p class="note">Left: the line in the data. Right: each point of the map is one possible line; darker means higher cost. The slope of the line is not the gradient: the gradient is the direction in which the cost rises fastest, and each step goes the other way (α = {{ line.learning_rate }}). → steps through iterations 0, 1, 3, 10 and the end.</p>
        </div>
      </div>

      <div v-else-if="step === 6" class="center">
        <p class="lead">Same start, same standardized budget, 80 updates. Only the learning rate α changes: {{ RATES.join(' or ') }}.</p>
        <div v-if="beat === 0" class="choices" role="group" aria-label="Learning-rate prediction">
          <button v-for="c in ['Faster, and still stable', 'It could overshoot']" :key="c" :aria-pressed="ratePrediction === c" @click="ratePrediction = c">{{ c }}</button>
        </div>
        <button v-if="beat === 0" class="primary" :disabled="!ratePrediction || running" data-testid="movie-run" @click="runExperiment">{{ running ? 'Computing both runs…' : 'Run both (→)' }}</button>
        <div v-else class="exp" data-testid="movie-experiment">
          <svg viewBox="0 0 800 270" class="cost" role="img" aria-label="Cost against iteration for both learning rates on the same scale">
            <path d="M48 25V230H755" class="axis" />
            <polyline v-for="(p, i) in paths" :key="i" :points="p" class="cpath" :style="{ stroke: i ? 'rgb(var(--c-warn))' : 'rgb(var(--c-data))' }" />
            <text x="52" y="20" class="tick">log(1 + J)</text><text x="640" y="254" class="tick">iteration → 80</text>
          </svg>
          <div class="runs">
            <div v-for="(r, i) in runs" :key="r.learning_rate" class="run" :style="{ borderColor: i ? 'rgb(var(--c-warn))' : 'rgb(var(--c-data))' }">
              <strong>α = {{ r.learning_rate }}</strong>
              <span>{{ r.final.cost > r.initial_cost ? 'cost grew' : 'cost fell' }}: J {{ f3(r.initial_cost) }} → {{ r.final.cost > 1e6 ? r.final.cost.toExponential(2) : f3(r.final.cost) }}</span>
              <span>stopped: {{ r.stop_reason === 'converged' ? 'change below tolerance' : r.stop_reason === 'diverged' ? 'diverged' : 'iteration limit' }} after {{ r.iterations_run }} updates</span>
            </div>
          </div>
          <p class="note">Your prediction: {{ ratePrediction }}. A run that stops at the iteration limit is not evidence of a good fit; read the cost as well as the stopping reason.</p>
        </div>
      </div>

      <div v-else-if="step === 7" class="evidence">
        <p class="lead">{{ store.moviePrediction ? `You predicted: “${store.moviePrediction}.”` : 'Revisit the opening question.' }} All scores below are <b>in-sample</b>: fitted and scored on the same {{ line.n }} movies.</p>
        <div class="results" data-testid="movie-evidence">
          <div class="res"><small>Budget alone</small><strong>{{ pct(line.ols.r2) }}</strong><span>R² {{ f3(line.ols.r2) }} · fitted data</span></div>
          <div v-for="m in plane.models" :key="m.label" class="res"><small>{{ m.label }}</small><strong>{{ pct(m.r2) }}</strong><span>R² {{ f3(m.r2) }} · adjusted {{ f3(m.adj_r2) }} · fitted data</span></div>
        </div>
        <p class="lead">The optimizer found the best line for these movies. It cannot create information the predictors do not contain, and it has not yet been tested on movies it never saw.</p>
        <SectionBridge id="movies" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.mv { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .22em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 clamp(16px, 1.25vw, 22px) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.two { display: grid; grid-template-columns: 1.35fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.center { width: 100%; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
.lead { font-size: clamp(17px, 1.35vw, 24px); line-height: 1.5; color: rgb(var(--c-text)); }
.lead b { color: rgb(var(--c-accent)); }
.note { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); line-height: 1.5; color: rgb(var(--c-soft)); }
.prompt { font-size: max(clamp(16px, 1.2vw, 21px), var(--up-16, 16px)); color: rgb(var(--c-human)); }
.cards { display: grid; gap: 10px; }
.cards.row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.mcard { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 12px 16px; border-radius: 14px; background: rgba(var(--c-surface), .8); border: 2px solid transparent; }
.mcard.on { border-color: rgb(var(--c-accent)); }
.mcard small { font: 600 max(12px, var(--up-12, 12px)) 'Space Grotesk', system-ui; letter-spacing: .1em; text-transform: uppercase; color: rgb(var(--c-dim)); }
.mcard strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.mcard.small strong { font-size: max(clamp(14px, 1vw, 17px), var(--up-14, 14px)); }
.mcard span { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.choices { display: flex; flex-wrap: wrap; gap: 12px; }
.choices button, .primary { padding: 14px 22px; border-radius: 14px; font: 600 max(clamp(16px, 1.2vw, 21px), var(--up-16, 16px)) 'Space Grotesk', system-ui; background: rgba(var(--c-surface), .85); border: 2px solid rgba(var(--c-accent), .4); color: rgb(var(--c-text)); }
.choices button[aria-pressed='true'] { background: rgba(var(--c-accent), .25); border-color: rgb(var(--c-accent)); }
.primary { align-self: flex-start; background: rgba(var(--c-accent), .25); }
.primary:disabled { opacity: .45; }
.ranks { display: grid; gap: 12px; }
.rank { display: grid; grid-template-columns: 170px 1fr 220px; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px; background: rgba(var(--c-surface), .7); }
.rank.best { outline: 2px solid rgb(var(--c-accent)); }
.rank .nm { font: 600 max(clamp(16px, 1.2vw, 20px), var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.rank .bar { height: 12px; border-radius: 6px; background: rgba(var(--c-text), .08); }
.rank .bar i { display: block; height: 100%; border-radius: 6px; background: rgb(var(--c-data)); }
.rank .v { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); font-variant-numeric: tabular-nums; }
.calc { display: grid; grid-template-columns: auto auto; gap: 8px 20px; padding: 16px 20px; border-radius: 14px; background: rgba(var(--c-surface), .8); font-size: clamp(17px, 1.3vw, 23px); }
.calc dt { color: rgb(var(--c-soft)); } .calc dd { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.calc dd.warn { color: rgb(var(--c-warn)); }
.formula { font: 600 clamp(18px, 1.5vw, 26px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.exp { display: grid; gap: 14px; }
.cost { width: 100%; max-height: 34vh; }
.axis { fill: none; stroke: rgba(var(--c-dim), .5); }
.cpath { fill: none; stroke-width: 4; }
.tick { font: 14px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.runs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.run { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; border-radius: 12px; background: rgba(var(--c-surface), .8); border-left: 4px solid; font-size: max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)); }
.run strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.evidence { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.results { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.res { display: flex; flex-direction: column; gap: 4px; padding: 16px 20px; border-radius: 16px; background: rgba(var(--c-surface), .8); border-top: 3px solid rgb(var(--c-accent)); }
.res small { font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; letter-spacing: .08em; text-transform: uppercase; color: rgb(var(--c-dim)); }
.res strong { font: 600 clamp(28px, 2.6vw, 44px) 'Space Grotesk', system-ui; }
.res span { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.links { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.links a { color: rgb(var(--c-data)); text-decoration: underline; text-underline-offset: 3px; }
.err { color: rgb(var(--c-warn)); font-size: max(18px, var(--up-18, 18px)); }
.loading { color: rgb(var(--c-dim)); font-size: max(18px, var(--up-18, 18px)); }
@media (max-width: 1000px) { .two, .results, .runs { grid-template-columns: 1fr; } .rank { grid-template-columns: 120px 1fr; } .rank .v { grid-column: 1 / -1; } }
</style>
