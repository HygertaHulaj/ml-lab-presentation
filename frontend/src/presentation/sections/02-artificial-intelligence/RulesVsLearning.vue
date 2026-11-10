<script setup lang="ts">
/**
 * Traditional programming vs learning from examples, on real data (Iris versicolor vs virginica, petal length).
 * Top: a person writes the rule (drag the threshold). Bottom: the algorithm tries every candidate threshold on 70
 * labelled training flowers and keeps the best. Then both rules are tested on 30 unseen flowers.
 * Every accuracy and the learned threshold come from GET /api/v1/concepts/rule-vs-learned.
 * Sub-stages advance with → (`advance()`): idle → learning → learned → tested.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { presentationApi, type RuleVsLearned } from '../../api'
import { errorMessage } from '../../../api/client'

const props = defineProps<{ reduced: boolean }>()
const data = ref<RuleVsLearned | null>(null)
const error = ref<string | null>(null)
const human = ref(5.5)
const humanAcc = ref<{ train: number; test: number } | null>(null)
const stage = ref<'idle' | 'learning' | 'learned' | 'tested'>('idle')
const scan = reactive({ i: -1 })
let tween: gsap.core.Tween | null = null
let debounce = 0

const X0 = 3.0, X1 = 7.2, PX0 = 60, PX1 = 960
const px = (v: number) => PX0 + ((v - X0) / (X1 - X0)) * (PX1 - PX0)
const fromPx = (p: number) => X0 + ((p - PX0) / (PX1 - PX0)) * (X1 - X0)
const ticks = [3, 4, 5, 6, 7]

/** dot-plot: stack points that fall in the same 0.1-cm bin */
function stack(xs: number[], pos: boolean[]) {
  const counts = new Map<string, number>()
  return xs.map((x, i) => {
    const key = x.toFixed(1) + (pos[i] ? 'p' : 'n')
    const c = counts.get(key) ?? 0
    counts.set(key, c + 1)
    return { x, pos: pos[i], k: c }
  })
}
const train = computed(() => (data.value ? stack(data.value.train.x, data.value.train.positive) : []))
const test = computed(() => (data.value ? stack(data.value.test.x, data.value.test.positive) : []))
const cands = computed(() => data.value?.candidates ?? [])
const scanned = computed(() => cands.value.slice(0, Math.max(0, Math.floor(scan.i) + 1)))
const bestSoFar = computed(() => scanned.value.reduce<typeof cands.value[number] | null>((b, c) => (!b || c.train_accuracy > b.train_accuracy ? c : b), null))
const learnedShown = computed(() => stage.value === 'learned' || stage.value === 'tested')
const pct = (v: number | undefined) => (v === undefined ? '—' : `${(v * 100).toFixed(1)} %`)

async function load() {
  try {
    const r = await presentationApi.ruleVsLearned(human.value)
    data.value = r
    humanAcc.value = { train: r.human.train_accuracy, test: r.human.test_accuracy }
    error.value = null
  } catch (e) { error.value = errorMessage(e) }
}
watch(human, () => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(load, 180)
})
onMounted(load)
onBeforeUnmount(() => { tween?.kill(); window.clearTimeout(debounce) })

function learn() {
  if (!data.value) return
  stage.value = 'learning'
  tween?.kill()
  const end = cands.value.length - 1
  if (props.reduced) { scan.i = end; stage.value = 'learned'; return }
  scan.i = -1
  tween = gsap.to(scan, { i: end, duration: 3.2, ease: 'power1.inOut', onComplete: () => { stage.value = 'learned' } })
}
function reset() { tween?.kill(); scan.i = -1; stage.value = 'idle' }
/** → key: move through the sub-stages; returns false when the presenter may leave the step. */
function advance(): boolean {
  if (stage.value === 'idle') { learn(); return true }
  if (stage.value === 'learning') { tween?.progress(1); return true }
  if (stage.value === 'learned') { stage.value = 'tested'; return true }
  return false
}
function back(): boolean {
  if (stage.value === 'tested') { stage.value = 'learned'; return true }
  if (stage.value !== 'idle') { reset(); return true }
  return false
}
defineExpose({ advance, back })

// draggable threshold on the person's lane
const svg = ref<SVGSVGElement | null>(null)
let dragging = false
function pointerX(e: PointerEvent) {
  const r = svg.value!.getBoundingClientRect()
  return ((e.clientX - r.left) / r.width) * 1000
}
function down(e: PointerEvent) { dragging = true; (e.target as Element).setPointerCapture?.(e.pointerId); move(e) }
function move(e: PointerEvent) { if (!dragging) return; human.value = Math.round(Math.min(7, Math.max(3.2, fromPx(pointerX(e)))) * 20) / 20 }
function up() { dragging = false }
</script>

<template>
  <div class="rvl" data-testid="rules-vs-learning">
    <div v-if="error" class="err" role="alert">The backend is not reachable ({{ error }}). Start it to run this demo.</div>
    <svg ref="svg" viewBox="0 0 1000 560" class="plot" @pointermove="move" @pointerup="up" @pointerleave="up">
      <!-- lane A: person -->
      <text x="60" y="34" class="lane-t">A rule written by a person</text>
      <text x="60" y="58" class="lane-s">"virginica if petal length ≥ {{ human.toFixed(2) }} cm"</text>
      <rect :x="PX0" y="74" :width="px(human) - PX0" height="150" class="reg-n" />
      <rect :x="px(human)" y="74" :width="PX1 - px(human)" height="150" class="reg-p" />
      <circle v-for="(d, i) in train" :key="'a' + i" :cx="px(d.x)" :cy="210 - d.k * 11" r="4.6" :class="d.pos ? 'dot-p' : 'dot-n'" />
      <g class="test" :class="{ on: stage === 'tested' }">
        <circle v-for="(d, i) in test" :key="'at' + i" :cx="px(d.x)" :cy="236 + d.k * 8" r="5" :class="['ring', d.pos ? 'ring-p' : 'ring-n']" />
      </g>
      <g class="handle" data-testid="human-threshold" @pointerdown="down">
        <line :x1="px(human)" :x2="px(human)" y1="66" y2="250" class="thr-h" />
        <rect :x="px(human) - 14" y="60" width="28" height="22" rx="6" class="knob" />
        <text :x="px(human)" y="76" text-anchor="middle" class="knob-t">⟷</text>
      </g>

      <!-- lane B: learned -->
      <text x="60" y="300" class="lane-t">A rule learned from {{ data?.split.n_train ?? 70 }} labelled examples</text>
      <text x="60" y="324" class="lane-s">{{ learnedShown && data ? `learned: virginica if petal length ≥ ${data.learned.threshold.toFixed(2)} cm` : stage === 'learning' ? 'trying every possible threshold…' : 'press → to let the algorithm learn' }}</text>
      <g v-if="bestSoFar">
        <rect :x="PX0" y="340" :width="px(bestSoFar.threshold) - PX0" height="150" class="reg-n" />
        <rect :x="px(bestSoFar.threshold)" y="340" :width="PX1 - px(bestSoFar.threshold)" height="150" class="reg-p" />
      </g>
      <rect v-for="c in scanned" :key="'c' + c.threshold" :x="px(c.threshold) - 2" :y="440 - (c.train_accuracy - 0.4) * 170" width="4" :height="(c.train_accuracy - 0.4) * 170" :class="['bar', bestSoFar && c.threshold === bestSoFar.threshold ? 'bar-best' : '']" />
      <circle v-for="(d, i) in train" :key="'b' + i" :cx="px(d.x)" :cy="476 - d.k * 11" r="4.6" :class="d.pos ? 'dot-p' : 'dot-n'" />
      <g class="test" :class="{ on: stage === 'tested' }">
        <circle v-for="(d, i) in test" :key="'bt' + i" :cx="px(d.x)" :cy="497 + d.k * 7" r="5" :class="['ring', d.pos ? 'ring-p' : 'ring-n']" />
      </g>
      <line v-if="stage === 'learning' && cands[Math.max(0, Math.floor(scan.i))]" :x1="px(cands[Math.max(0, Math.floor(scan.i))].threshold)" :x2="px(cands[Math.max(0, Math.floor(scan.i))].threshold)" y1="336" y2="516" class="cursor" />
      <line v-if="bestSoFar" :x1="px(bestSoFar.threshold)" :x2="px(bestSoFar.threshold)" y1="336" y2="516" class="thr-l" data-testid="learned-threshold" />

      <!-- axis -->
      <line :x1="PX0" :x2="PX1" y1="530" y2="530" class="axis" />
      <g v-for="t in ticks" :key="t"><line :x1="px(t)" :x2="px(t)" y1="526" y2="534" class="axis" /><text :x="px(t)" y="552" text-anchor="middle" class="tick">{{ t }} cm</text></g>
      <text x="960" y="552" text-anchor="end" class="tick">petal length</text>
    </svg>

    <aside class="scores">
      <div class="legend"><span class="dn" /> versicolor <span class="dp" /> virginica <span class="dr" /> unseen test flower</div>
      <div class="score" data-testid="score-human">
        <strong>Person's rule</strong>
        <span>training <b>{{ pct(humanAcc?.train) }}</b></span>
        <span v-if="stage === 'tested'">unseen <b>{{ pct(humanAcc?.test) }}</b></span>
      </div>
      <div class="score learned" data-testid="score-learned">
        <strong>Learned rule</strong>
        <span>training <b>{{ learnedShown ? pct(data?.learned.train_accuracy) : bestSoFar ? pct(bestSoFar.train_accuracy) : '—' }}</b></span>
        <span v-if="stage === 'tested'">unseen <b>{{ pct(data?.learned.test_accuracy) }}</b></span>
      </div>
      <div class="acts">
        <button v-if="stage === 'idle'" class="btn" data-testid="learn" @click="learn">Learn from examples</button>
        <button v-else-if="stage === 'learned'" class="btn" data-testid="test-unseen" @click="stage = 'tested'">Test on {{ data?.split.n_test ?? 30 }} unseen flowers</button>
        <button v-if="stage !== 'idle'" class="btn ghost" @click="reset">Reset</button>
      </div>
      <p class="src">Real data: {{ data?.source ?? 'Iris (Fisher, 1936)' }}. Split {{ data?.split.n_train }}/{{ data?.split.n_test }}, seed {{ data?.split.seed }}.</p>
    </aside>
  </div>
</template>

<style scoped>
.rvl { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 26px; align-items: center; width: 100%; }
.plot { width: 100%; height: auto; touch-action: none; user-select: none; }
.lane-t { font: 600 22px 'Space Grotesk', system-ui; fill: rgb(var(--c-text)); }
.lane-s { font: 500 16px 'JetBrains Mono', Consolas, monospace; fill: rgb(var(--c-data-soft)); }
.reg-n { fill: rgba(var(--c-ok), .08); } /* versicolor: the species palette (theme SPECIES_TOKEN) */
.reg-p { fill: rgba(var(--c-feature), .1); }
.dot-n { fill: rgb(var(--c-ok)); }
.dot-p { fill: rgb(var(--c-feature)); }
.ring { fill: none; stroke-width: 2.2; }
.ring-n { stroke: rgb(var(--c-ok)); }
.ring-p { stroke: rgb(var(--c-feature)); }
.test { opacity: 0; transition: opacity .8s; }
.test.on { opacity: 1; }
.thr-h { stroke: rgb(var(--c-human)); stroke-width: 3; }
.thr-l { stroke: rgb(var(--c-ok)); stroke-width: 3; }
.handle { cursor: ew-resize; }
.knob { fill: rgb(var(--c-human)); }
.knob-t { fill: rgb(var(--c-ground2)); font: 700 14px system-ui; pointer-events: none; }
.bar { fill: rgba(var(--c-data-soft), .55); }
.bar-best { fill: rgb(var(--c-ok)); }
.cursor { stroke: rgb(var(--c-text)); stroke-width: 1.5; stroke-dasharray: 4 4; }
.axis { stroke: rgba(var(--c-dim), .5); }
.tick { fill: rgb(var(--c-faint)); font: 500 14px 'Inter', system-ui; }
.scores { display: flex; flex-direction: column; gap: 14px; }
.legend { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.legend span { display: inline-block; width: 10px; height: 10px; border-radius: 99px; margin-left: 6px; }
.dn { background: rgb(var(--c-ok)); } .dp { background: rgb(var(--c-feature)); } .dr { border: 2px solid rgb(var(--c-dim)); }
.score { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: 14px; background: rgba(var(--c-surface), .75); border-left: 3px solid rgb(var(--c-human)); }
.score.learned { border-left-color: rgb(var(--c-ok)); }
.score strong { font: 600 max(17px, var(--up-17, 17px)) 'Space Grotesk', system-ui; }
.score span { color: rgb(var(--c-soft)); font-size: max(15px, var(--up-15, 15px)); }
.score b { color: rgb(var(--c-strong)); font-family: 'JetBrains Mono', Consolas, monospace; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { padding: 10px 16px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
.err { grid-column: 1 / -1; color: rgb(var(--c-human)); }
@media (max-width: 900px) { .rvl { grid-template-columns: 1fr; } }
</style>
