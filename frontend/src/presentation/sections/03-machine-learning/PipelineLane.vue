<script setup lang="ts">
/**
 * One pipeline, drawn as a pure function of progress `p`:
 *  traditional  RULES (written by a person) + DATA → PROGRAM → OUTPUT
 *  training     DATA + REFERENCE OUTPUTS → LEARNING ALGORITHM → TRAINED MODEL
 *  inference    NEW DATA + TRAINED MODEL → PREDICTIONS
 *  ml-full      training, then inference (used in the side-by-side comparison)
 * The samples are real Iris flowers; thresholds, candidates and predictions come from the backend.
 */
import { computed } from 'vue'
import type { RuleVsLearned } from '../../api'
import { absorbPose, LANE, modelReady, passPose, pickTestSamples, pickTrainSamples, resultsShown, scanIndex, splitFull, type LaneMode } from './pipeline'

const props = defineProps<{ mode: LaneMode; p: number; data: RuleVsLearned; compact?: boolean }>()

const phase = computed(() => (props.mode === 'ml-full' ? splitFull(props.p) : { phase: props.mode, p: props.p }))
const kind = computed(() => phase.value.phase as 'traditional' | 'training' | 'inference')
const lp = computed(() => phase.value.p)

const testSamples = computed(() => pickTestSamples(props.data))
const trainSamples = computed(() => pickTrainSamples(props.data))
const samples = computed(() => (kind.value === 'training' ? trainSamples.value : testSamples.value))
const n = computed(() => samples.value.length)
const pose = (i: number) => (kind.value === 'training' ? absorbPose(lp.value, i, n.value) : passPose(lp.value, i, n.value))
const pred = (i: number) => (kind.value === 'traditional' ? samples.value[i].predHuman : samples.value[i].predLearned)

const cand = computed(() => props.data.candidates[scanIndex(lp.value, props.data.candidates.length)])
const thrHuman = computed(() => props.data.human.threshold.toFixed(2))
const thrLearned = computed(() => props.data.learned.threshold.toFixed(2))
const showResults = computed(() => kind.value !== 'training' && resultsShown(lp.value))
const modelOut = computed(() => kind.value === 'training' && modelReady(lp.value))
const rulesIn = computed(() => Math.min(1, Math.max(0, (lp.value - 0.02) / 0.1)))

const EQ = {
  traditional: [['RULES', 'person'], ['+', ''], ['DATA', 'data'], ['→', ''], ['PROGRAM', 'box'], ['→', ''], ['OUTPUT', 'out']],
  training: [['DATA', 'data'], ['+', ''], ['REFERENCE OUTPUTS', 'label'], ['→', ''], ['LEARNING ALGORITHM', 'box'], ['→', ''], ['TRAINED MODEL', 'out']],
  inference: [['NEW DATA', 'data'], ['+', ''], ['TRAINED MODEL', 'box'], ['→', ''], ['PREDICTION', 'out']],
} as const
const eq = computed(() => EQ[kind.value])
const activeTerm = computed(() => {
  const p = lp.value
  if (kind.value === 'traditional' && p < 0.12) return 'person'
  if (p < 0.2) return 'data'
  if (p < 0.8) return 'box'
  return 'out'
})
const queueLabel = computed(() => ({ traditional: 'DATA', training: 'LABELLED EXAMPLES', inference: 'NEW DATA (no labels)' })[kind.value])
const outLabel = computed(() => ({ traditional: 'OUTPUT', training: 'TRAINED MODEL', inference: 'PREDICTIONS' })[kind.value])
const boxTitle = computed(() => ({ traditional: 'PROGRAM', training: 'LEARNING ALGORITHM', inference: 'TRAINED MODEL' })[kind.value])
const correctCount = computed(() => samples.value.filter((s, i) => pred(i) === s.truth).length)
const accAll = computed(() => (kind.value === 'traditional' ? props.data.human.test_accuracy : props.data.learned.test_accuracy))
const name = (pos: boolean | undefined) => (pos ? 'virginica' : 'versicolor')
</script>

<template>
  <svg :viewBox="`0 0 ${LANE.w} ${LANE.h}`" class="lane" :class="[kind, { compact }]" role="img" :aria-label="eq.map((e) => e[0]).join(' ')" :data-testid="'lane-' + kind">
    <!-- equation -->
    <g class="eq" transform="translate(40 40)">
      <text>
        <tspan v-for="(e, k) in eq" :key="k" :class="['term', e[1], { on: e[1] === activeTerm }]" dx="8">{{ e[0] }}</tspan>
      </text>
    </g>

    <!-- queue + output labels -->
    <text :x="LANE.queueX" y="74" text-anchor="middle" class="col-label">{{ queueLabel }}</text>
    <text :x="LANE.outX" y="74" text-anchor="middle" class="col-label">{{ outLabel }}</text>

    <!-- the machine -->
    <rect :x="LANE.boxX0" :y="LANE.boxY0" :width="LANE.boxX1 - LANE.boxX0" :height="LANE.boxY1 - LANE.boxY0" rx="22" class="box" :class="{ busy: activeTerm === 'box' }" />
    <text :x="(LANE.boxX0 + LANE.boxX1) / 2" :y="LANE.boxY0 + 36" text-anchor="middle" class="box-title">{{ boxTitle }}</text>
    <template v-if="kind === 'traditional'">
      <text :x="500" :y="LANE.midY + 4" text-anchor="middle" class="code" :opacity="rulesIn">if petal ≥ {{ thrHuman }} cm</text>
      <text :x="500" :y="LANE.midY + 34" text-anchor="middle" class="code dim" :opacity="rulesIn">→ virginica, else versicolor</text>
      <text :x="500" :y="LANE.boxY1 - 18" text-anchor="middle" class="small">rule written by a person</text>
      <!-- the person's rule card drops into the program -->
      <g :transform="`translate(500 ${18 + rulesIn * 70})`" :opacity="1 - rulesIn" class="rules-card">
        <rect x="-118" y="-16" width="236" height="32" rx="16" />
        <text text-anchor="middle" y="6">✎ RULES (by a person)</text>
      </g>
    </template>
    <template v-else-if="kind === 'training'">
      <text :x="500" :y="LANE.midY + 2" text-anchor="middle" class="code" data-testid="scan-candidate">{{ modelOut ? `best: ≥ ${thrLearned} cm` : `trying ≥ ${cand.threshold.toFixed(2)} cm` }}</text>
      <text :x="500" :y="LANE.midY + 32" text-anchor="middle" class="code dim">{{ modelOut ? `${(props.data.learned.train_accuracy * 100).toFixed(1)} % of training flowers correct` : `${(cand.train_accuracy * 100).toFixed(1)} % correct` }}</text>
      <text :x="500" :y="LANE.boxY1 - 18" text-anchor="middle" class="small">searches {{ props.data.candidates.length }} candidate rules on {{ props.data.split.n_train }} flowers</text>
      <!-- the trained model leaves the learner -->
      <g v-if="modelOut" class="model-card" :transform="`translate(${LANE.outX} ${LANE.midY})`" data-testid="trained-model">
        <rect x="-118" y="-58" width="236" height="116" rx="18" />
        <text text-anchor="middle" y="-22" class="mc-t">TRAINED MODEL</text>
        <text text-anchor="middle" y="10" class="mc-c">if petal ≥ {{ thrLearned }} cm</text>
        <text text-anchor="middle" y="36" class="mc-s">→ virginica</text>
      </g>
    </template>
    <template v-else>
      <text :x="500" :y="LANE.midY + 4" text-anchor="middle" class="code">if petal ≥ {{ thrLearned }} cm</text>
      <text :x="500" :y="LANE.midY + 34" text-anchor="middle" class="code dim">→ virginica, else versicolor</text>
      <text :x="500" :y="LANE.boxY1 - 18" text-anchor="middle" class="small">rule learned from examples</text>
    </template>

    <!-- flow guides -->
    <line :x1="LANE.queueX + 70" :x2="LANE.boxX0 - 8" :y1="LANE.midY" :y2="LANE.midY" class="guide" />
    <line v-if="kind !== 'training'" :x1="LANE.boxX1 + 8" :x2="LANE.outX - 70" :y1="LANE.midY" :y2="LANE.midY" class="guide" />

    <!-- sample tokens -->
    <g v-for="(s, i) in samples" :key="kind + i" :transform="`translate(${pose(i).x} ${pose(i).y})`" :opacity="pose(i).opacity" class="token">
      <template v-if="pose(i).stage !== 'out'">
        <rect x="-62" y="-17" width="124" height="34" rx="17" :class="['tk', kind === 'training' ? (s.truth ? 'lab-p' : 'lab-n') : 'neutral']" />
        <circle cx="-42" cy="0" r="7" :class="kind === 'training' ? (s.truth ? 'dot-p' : 'dot-n') : 'dot-q'" />
        <text x="-28" y="5" class="tk-t">{{ s.x.toFixed(1) }} cm</text>
        <text v-if="kind === 'training'" x="74" y="5" class="tk-lab" :class="s.truth ? 'p' : 'n'">{{ name(s.truth) }}</text>
        <text v-else-if="kind === 'inference'" x="44" y="5" class="tk-q">?</text>
      </template>
      <template v-else>
        <rect x="-62" y="-17" width="124" height="34" rx="17" :class="['tk', pred(i) ? 'lab-p' : 'lab-n']" />
        <text x="0" y="5" text-anchor="middle" class="tk-t">{{ name(pred(i)) }}</text>
        <text v-if="showResults" x="76" y="6" class="res" :class="pred(i) === s.truth ? 'ok' : 'bad'">{{ pred(i) === s.truth ? '✓' : '✗ ' + name(s.truth) }}</text>
      </template>
    </g>

    <!-- result line -->
    <text v-if="showResults" x="500" :y="LANE.h - 22" text-anchor="middle" class="result" :data-testid="'result-' + kind">
      {{ correctCount }} of {{ samples.length }} shown correct · on all {{ props.data.split.n_test }} unseen flowers: {{ (accAll * 100).toFixed(1) }} %
    </text>
  </svg>
</template>

<style scoped>
.lane { width: 100%; height: auto; overflow: visible; }
.term { font: 600 22px 'Space Grotesk', system-ui; letter-spacing: .06em; fill: rgba(var(--c-dim), .55); transition: fill .3s; }
.term.on { fill: rgb(var(--c-human)); }
.term.person.on { fill: rgb(var(--c-human)); }
.col-label { font: 600 14px 'Space Grotesk', system-ui; letter-spacing: .2em; fill: rgb(var(--c-faint)); }
.box { fill: rgba(var(--c-surface), .85); stroke: rgba(var(--c-data), .45); stroke-width: 2; transition: stroke .3s; }
.box.busy { stroke: rgb(var(--c-data)); filter: drop-shadow(0 0 14px rgba(var(--c-data), .45)); }
.training .box { stroke: rgba(var(--c-feature), .6); }
.training .box.busy { stroke: rgb(var(--c-feature)); filter: drop-shadow(0 0 14px rgba(var(--c-feature), .5)); }
.box-title { font: 600 17px 'Space Grotesk', system-ui; letter-spacing: .2em; fill: rgb(var(--c-soft)); }
.code { font: 500 19px 'JetBrains Mono', Consolas, monospace; fill: rgb(var(--c-text)); }
.code.dim { fill: rgb(var(--c-dim)); font-size: 14px; }
.small { font: 500 13px 'Inter', system-ui; fill: rgb(var(--c-faint)); }
.rules-card rect { fill: rgba(var(--c-human), .16); stroke: rgb(var(--c-human)); }
.rules-card text { font: 600 15px 'Space Grotesk', system-ui; fill: rgb(var(--c-human)); letter-spacing: .08em; }
.model-card rect { fill: rgba(var(--c-ok), .12); stroke: rgb(var(--c-ok)); stroke-width: 2; }
.mc-t { font: 600 15px 'Space Grotesk', system-ui; letter-spacing: .18em; fill: rgb(var(--c-ok)); }
.mc-c { font: 500 19px 'JetBrains Mono', Consolas, monospace; fill: rgb(var(--c-text)); }
.mc-s { font: 500 15px 'JetBrains Mono', Consolas, monospace; fill: rgb(var(--c-dim)); }
.guide { stroke: rgba(var(--c-data), .25); stroke-width: 2; stroke-dasharray: 5 7; }
.tk { stroke-width: 1.6; }
.tk.neutral { fill: rgba(var(--c-surface), .95); stroke: rgba(var(--c-dim), .6); }
.tk.lab-n { fill: rgba(var(--c-data), .14); stroke: rgb(var(--c-data)); }
.tk.lab-p { fill: rgba(var(--c-feature), .18); stroke: rgb(var(--c-feature)); }
.dot-n { fill: rgb(var(--c-data)); } .dot-p { fill: rgb(var(--c-feature)); } .dot-q { fill: rgb(var(--c-dim)); }
.tk-t { font: 500 16px 'JetBrains Mono', Consolas, monospace; fill: rgb(var(--c-text)); }
.tk-lab { font: 600 14px 'Inter', system-ui; }
.tk-lab.n { fill: rgb(var(--c-data)); } .tk-lab.p { fill: rgb(var(--c-feature)); }
.tk-q { font: 700 18px 'Inter', system-ui; fill: rgb(var(--c-human)); }
.res { font: 600 15px 'Inter', system-ui; }
.res.ok { fill: rgb(var(--c-ok)); } .res.bad { fill: rgb(var(--c-warn)); }
.result { font: 500 17px 'Inter', system-ui; fill: rgb(var(--c-soft)); }
.compact .term { font-size: 26px; }
</style>
