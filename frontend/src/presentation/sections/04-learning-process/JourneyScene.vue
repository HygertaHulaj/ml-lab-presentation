<script setup lang="ts">
/**
 * One continuous scene for the whole machine-learning process. The same 150 real flowers travel from records (collect,
 * prepare) to a feature space (features), split into training and test sets, shape the decision-tree regions (train),
 * return as unseen flowers to be predicted, and finally land in the confusion matrix (evaluate).
 * Everything is drawn from `poseAt(stage, p)`; click a flower to inspect it.
 */
import { computed } from 'vue'
import type { LearningJourney } from '../../api'
import { buildCtx, CM, leafReveal, PLOT, poseAt, SCENE, SPECIES_COLOR, splitReveal, VAULT } from './journey'

const props = defineProps<{ data: LearningJourney; stage: number; p: number; selected: number | null }>()
const emit = defineEmits<{ select: [id: number] }>()

const ctx = computed(() => buildCtx(props.data))
const poses = computed(() => props.data.records.map((r) => ({ r, pose: poseAt(ctx.value, r, props.stage, props.p) })))
const [fx, fy] = props.data.features
const sx = (v: number) => ctx.value.scale.x(v)
const sy = (v: number) => ctx.value.scale.y(v)
const label = (f: string) => f.replace('_cm', ' (cm)').replace('_', ' ')
const xticks = computed(() => { const [a, b] = props.data.model.bounds[fx]; return Array.from({ length: Math.round(b - a) + 1 }, (_, k) => a + k) })
const yticks = computed(() => { const [a, b] = props.data.model.bounds[fy]; return Array.from({ length: Math.round((b - a) / 0.5) + 1 }, (_, k) => a + k * 0.5) })

const showAxes = computed(() => (props.stage === 3 ? Math.min(1, Math.max(0, (props.p - 0.55) / 0.3)) : props.stage >= 4 ? 1 : 0))
const nSplits = computed(() => props.data.model.splits.length)
const splitAmt = (order: number) => (props.stage === 5 ? splitReveal(props.p, order, nSplits.value) : props.stage > 5 ? 1 : 0)
const leafAmt = (depth: number) => (props.stage === 5 ? leafReveal(props.p, depth, nSplits.value) : props.stage > 5 ? 1 : 0)
const regionFade = computed(() => (props.stage === 7 ? 0.45 : 1))

function splitLine(s: LearningJourney['model']['splits'][number], amt: number) {
  const b = s.box
  if (s.feature === fx) { const x = sx(s.threshold), y0 = sy(b[fy][0]), y1 = sy(b[fy][1] + 0.25); return { x1: x, x2: x, y1: y0, y2: y0 + (y1 - y0) * amt } }
  const y = sy(s.threshold), x0 = sx(b[fx][0]), x1 = sx(b[fx][1])
  return { x1: x0, x2: x0 + (x1 - x0) * amt, y1: y, y2: y }
}
function leafRect(l: LearningJourney['model']['leaves'][number]) {
  const b = l.box
  return { x: sx(b[fx][0]), y: sy(b[fy][1] + (b[fy][1] >= props.data.model.bounds[fy][1] ? 0.25 : 0)), w: sx(b[fx][1]) - sx(b[fx][0]), h: sy(b[fy][0]) - sy(b[fy][1] + (b[fy][1] >= props.data.model.bounds[fy][1] ? 0.25 : 0)) }
}
const dupText = computed(() => props.data.prepare.duplicates.map((d) => `#${d.removed} = #${d.same_as}`).join(', '))
const dupAnchor = computed(() => {
  const d = props.data.prepare.duplicates[0]
  if (!d) return null
  const a = poses.value.find((q) => q.r.id === d.same_as)?.pose
  return a ? { x: a.x, y: a.y } : null
})
const cmCount = (row: number, col: number) => props.data.evaluation.confusion[row][col]
const cmShown = computed(() => props.stage === 7 && props.p > 0.72)
const mapStages = [
  { t: 'Collect', s: '150 flowers' }, { t: 'Prepare', s: 'clean & check' }, { t: 'Features', s: 'what to measure' },
  { t: 'Split', s: 'train / test' }, { t: 'Train', s: 'learn a model' }, { t: 'Predict', s: 'unseen data' }, { t: 'Evaluate', s: 'how good is it?' },
]
</script>

<template>
  <svg :viewBox="`0 0 ${SCENE.w} ${SCENE.h}`" class="scene" role="img" aria-label="The machine-learning process on 150 Iris flowers" data-testid="journey-scene">
    <!-- overview: the seven stages -->
    <g v-if="stage === 0" data-testid="stage-map">
      <line x1="120" x2="1080" y1="330" y2="330" class="map-line" />
      <circle v-for="k in 12" :key="'f' + k" :cx="120 + (((k * 80 + p * 960) % 960))" cy="330" r="4" class="map-dot" />
      <g v-for="(st, k) in mapStages" :key="st.t" :transform="`translate(${120 + k * 160} 330)`">
        <circle r="34" class="map-node" />
        <text y="7" text-anchor="middle" class="map-n">{{ k + 1 }}</text>
        <text y="70" text-anchor="middle" class="map-t">{{ st.t }}</text>
        <text y="94" text-anchor="middle" class="map-s">{{ st.s }}</text>
      </g>
    </g>
    <!-- feature space -->
    <g :opacity="showAxes">
      <rect :x="PLOT.x0" :y="PLOT.y1 - 10" :width="PLOT.x1 - PLOT.x0" :height="PLOT.y0 - PLOT.y1 + 10" class="plot-bg" />
      <g v-for="t in xticks" :key="'x' + t"><line :x1="sx(t)" :x2="sx(t)" :y1="PLOT.y0" :y2="PLOT.y0 + 6" class="axis" /><text :x="sx(t)" :y="PLOT.y0 + 24" text-anchor="middle" class="tick">{{ t }}</text></g>
      <g v-for="t in yticks" :key="'y' + t"><line :x1="PLOT.x0 - 6" :x2="PLOT.x0" :y1="sy(t)" :y2="sy(t)" class="axis" /><text :x="PLOT.x0 - 12" :y="sy(t) + 5" text-anchor="end" class="tick">{{ t.toFixed(1) }}</text></g>
      <text :x="(PLOT.x0 + PLOT.x1) / 2" :y="PLOT.y0 + 52" text-anchor="middle" class="axis-label">{{ label(fx) }}</text>
      <text :x="PLOT.x0 - 64" :y="(PLOT.y0 + PLOT.y1) / 2" text-anchor="middle" class="axis-label" :transform="`rotate(-90 ${PLOT.x0 - 64} ${(PLOT.y0 + PLOT.y1) / 2})`">{{ label(fy) }}</text>
    </g>

    <!-- the model: leaf regions and split lines -->
    <g :opacity="regionFade">
      <rect v-for="l in data.model.leaves" :key="'leaf' + l.node" v-bind="leafRect(l)" :opacity="0.13 * leafAmt(l.depth)" :style="{ fill: SPECIES_COLOR[l.class] }" />
      <text v-for="l in data.model.leaves" :key="'lt' + l.node" :x="leafRect(l).x + 12" :y="leafRect(l).y + 26" class="leaf-label" :opacity="leafAmt(l.depth)" :style="{ fill: SPECIES_COLOR[l.class] }">→ {{ l.class }}</text>
      <g v-for="s in data.model.splits" :key="'s' + s.node" :opacity="splitAmt(s.order) > 0 ? 1 : 0" :data-testid="'split-' + s.order">
        <line v-bind="splitLine(s, splitAmt(s.order))" class="split" />
        <text v-if="splitAmt(s.order) >= 1" :x="s.feature === fx ? splitLine(s, 1).x1 + 8 : splitLine(s, 1).x2 - 8" :y="s.feature === fx ? splitLine(s, 1).y1 - 12 : splitLine(s, 1).y1 - 10" :text-anchor="s.feature === fx ? 'start' : 'end'" class="split-t">{{ s.feature.replace('_cm', '').replace('_', ' ') }} ≤ {{ s.threshold }}</text>
      </g>
    </g>

    <!-- test set vault -->
    <g v-if="stage >= 4 && stage <= 6" :opacity="stage === 6 ? Math.max(0.25, 1 - p * 1.4) : 1">
      <rect :x="VAULT.x0" :y="VAULT.y0" :width="VAULT.w" :height="VAULT.h" rx="16" class="vault" />
      <text :x="VAULT.x0 + 16" :y="VAULT.y0 - 14" class="vault-t">TEST SET · {{ data.split.test_ids.length }} flowers kept aside</text>
      <text :x="VAULT.x0 + 16" :y="VAULT.y0 + VAULT.h + 26" class="vault-s">never used for training</text>
    </g>

    <!-- confusion matrix -->
    <g v-if="stage === 7" data-testid="confusion-matrix">
      <text :x="CM.x0" :y="CM.y0 - 40" class="vault-t">CONFUSION MATRIX · test set</text>
      <text :x="CM.x0 + 150" :y="CM.y0 - 14" text-anchor="middle" class="cm-axis">predicted →</text>
      <g v-for="(cls, row) in data.classes" :key="'r' + cls">
        <text :x="CM.x0 - 10" :y="CM.y0 + row * CM.cell + 56" text-anchor="end" class="cm-lab" :style="{ fill: SPECIES_COLOR[cls] }">{{ cls }}</text>
        <g v-for="(c2, col) in data.classes" :key="'c' + c2">
          <rect :x="CM.x0 + col * CM.cell" :y="CM.y0 + row * CM.cell" :width="CM.cell - 4" :height="CM.cell - 4" rx="8" :class="['cm-cell', row === col ? 'diag' : 'off', cmShown && cmCount(row, col) > 0 && row !== col ? 'err' : '']" />
          <text v-if="cmShown" :x="CM.x0 + col * CM.cell + CM.cell - 14" :y="CM.y0 + row * CM.cell + CM.cell - 14" text-anchor="end" class="cm-n" :data-testid="`cm-${row}-${col}`">{{ cmCount(row, col) }}</text>
        </g>
      </g>
      <text :x="CM.x0 + 150" :y="CM.y0 + 3 * CM.cell + 22" text-anchor="middle" class="cm-axis">rows: true species</text>
    </g>

    <!-- duplicate callout -->
    <g v-if="stage === 2 && p > 0.4 && dupAnchor" :opacity="Math.min(1, (p - 0.4) / 0.1)">
      <line :x1="dupAnchor.x" :y1="dupAnchor.y - 12" :x2="dupAnchor.x + 40" :y2="dupAnchor.y - 60" class="callout" />
      <text :x="dupAnchor.x + 46" :y="dupAnchor.y - 64" class="callout-t">exact duplicate: {{ dupText }}{{ p > 0.8 ? ' · removed' : '' }}</text>
    </g>

    <!-- the flowers -->
    <g class="points">
      <g v-for="{ r, pose } in poses" :key="r.id" :data-id="r.id" :transform="`translate(${pose.x} ${pose.y})`" :opacity="pose.opacity" class="pt" :class="{ sel: selected === r.id }" @click="emit('select', r.id)">
        <circle :r="pose.r + (selected === r.id ? 3 : 0)" :stroke-width="selected === r.id ? 3 : 2" :style="{ fill: pose.fill, stroke: selected === r.id ? 'rgb(var(--c-strong))' : pose.stroke }" />
        <text v-if="pose.mark === 'bad'" x="8" y="-8" class="mark bad">✗</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.scene { width: 100%; height: 100%; overflow: visible; }
.plot-bg { fill: rgba(var(--c-surface), .45); stroke: rgba(var(--c-dim), .18); }
.axis { stroke: rgba(var(--c-dim), .5); }
.tick { fill: rgb(var(--c-faint)); font: 500 14px 'Inter', system-ui; }
.axis-label { fill: rgb(var(--c-data-soft)); font: 600 16px 'Space Grotesk', system-ui; letter-spacing: .06em; }
.split { stroke: rgb(var(--c-text)); stroke-width: 3; stroke-dasharray: 10 6; }
.split-t { fill: rgb(var(--c-text)); font: 500 max(16px, var(--up-16, 16px)) 'JetBrains Mono', Consolas, monospace; }
.leaf-label { font: 600 17px 'Space Grotesk', system-ui; }
.vault { fill: rgba(var(--c-surface), .7); stroke: rgba(var(--c-human), .5); stroke-dasharray: 6 5; }
.vault-t { fill: rgb(var(--c-human)); font: 600 14px 'Space Grotesk', system-ui; letter-spacing: .14em; }
.vault-s { fill: rgb(var(--c-faint)); font: 500 13px 'Inter', system-ui; }
.cm-cell { fill: rgba(var(--c-surface), .7); stroke: rgba(var(--c-dim), .3); }
.cm-cell.diag { stroke: rgba(var(--c-ok), .55); }
.cm-cell.err { stroke: rgb(var(--c-warn)); fill: rgba(var(--c-warn), .1); }
.cm-n { fill: rgb(var(--c-strong)); font: 600 26px 'Space Grotesk', system-ui; }
.cm-lab { font: 600 15px 'Inter', system-ui; }
.cm-axis { fill: rgb(var(--c-faint)); font: 500 13px 'Inter', system-ui; }
.callout { stroke: rgb(var(--c-human)); stroke-width: 1.5; }
.callout-t { fill: rgb(var(--c-human)); font: 600 15px 'Inter', system-ui; }
.pt { cursor: pointer; }
.map-line { stroke: rgba(var(--c-data), .3); stroke-width: 2; }
.map-dot { fill: rgb(var(--c-data-soft)); }
.map-node { fill: rgba(var(--c-surface), .95); stroke: rgb(var(--c-data)); stroke-width: 2; }
.map-n { fill: rgb(var(--c-data)); font: 600 24px 'Space Grotesk', system-ui; }
.map-t { fill: rgb(var(--c-text)); font: 600 20px 'Space Grotesk', system-ui; }
.map-s { fill: rgb(var(--c-faint)); font: 500 14px 'Inter', system-ui; }
.mark { font: 700 16px 'Inter', system-ui; pointer-events: none; }
.mark.bad { fill: rgb(var(--c-warn)); }
</style>
