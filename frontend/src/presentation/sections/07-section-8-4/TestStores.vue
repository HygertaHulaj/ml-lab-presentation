<script setup lang="ts">
/**
 * The 81 test stores of the official car seat split, with the real predictions of the depth-5 tree (backend).
 * mode "accuracy" (p. 381): each store's prediction is revealed in turn, correct or not, and accuracy is counted.
 * mode "matrix" (p. 382, Table 8.3): the same stores fly into the four cells of the confusion matrix.
 * Everything drawn is a pure function of progress p.
 */
import { computed } from 'vue'
import { useProgress } from '../../../visualizations/shared/useProgress'
import type { Evaluation } from '../../api'
import { DEFS } from './content'

const props = defineProps<{ data: Evaluation['classification']; book: Evaluation['book_table_8_3']; mode: 'accuracy' | 'matrix'; reduced: boolean }>()
const { prog, play, finish, playing } = useProgress(props.mode === 'accuracy' ? 4 : 2.8, () => props.reduced)
const pos = props.data.positive

type Cell = 'tp' | 'fp' | 'fn' | 'tn'
const CELLS: { k: Cell; row: number; col: number; tone: string; name: string }[] = [
  { k: 'tp', row: 0, col: 0, tone: 'ok', name: 'True positives' }, { k: 'fp', row: 0, col: 1, tone: 'human', name: 'False positives' },
  { k: 'fn', row: 1, col: 0, tone: 'warn', name: 'False negatives' }, { k: 'tn', row: 1, col: 1, tone: 'data', name: 'True negatives' },
]
const cellOf = (a: string, p: string): Cell => (p === pos ? (a === pos ? 'tp' : 'fp') : (a === pos ? 'fn' : 'tn'))
const toneOf = Object.fromEntries(CELLS.map((c) => [c.k, c.tone])) as Record<Cell, string>
const stores = computed(() => {
  const seen: Record<Cell, number> = { tp: 0, fp: 0, fn: 0, tn: 0 }
  return props.data.stores.map((s, i) => {
    const cell = cellOf(s.actual, s.predicted)
    const k = seen[cell]++
    const c = CELLS.find((x) => x.k === cell)!
    return {
      ...s, cell, correct: s.actual === s.predicted,
      gx: 50 + (i % 9) * 36, gy: 60 + Math.floor(i / 9) * 36,
      mx: 530 + c.col * 215 + (k % 8) * 23, my: 102 + c.row * 160 + Math.floor(k / 8) * 22,
    }
  })
})
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const revealed = computed(() => (props.mode === 'accuracy' ? Math.round(Math.min(1, prog.p / 0.9) * stores.value.length) : stores.value.length))
const correctSoFar = computed(() => stores.value.slice(0, revealed.value).filter((s) => s.correct).length)
const drawn = computed(() => stores.value.map((s, i) => {
  if (props.mode === 'accuracy') {
    const on = i < revealed.value
    return { x: s.gx, y: s.gy, r: 13, fill: on ? (s.correct ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))') : 'rgba(var(--c-dim), .35)', mark: on ? (s.correct ? '✓' : '✗') : '' }
  }
  const t = ease(Math.min(1, Math.max(0, (prog.p - (i / stores.value.length) * 0.35) / 0.6)))
  return { x: s.gx + (s.mx - s.gx) * t, y: s.gy + (s.my - s.gy) * t, r: 13 - 4 * t, fill: t > 0.5 ? `rgb(var(--c-${toneOf[s.cell]}))` : (s.correct ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))'), mark: '' }
}))
const m = computed(() => props.data.metrics)
const matches = computed(() => (['tp', 'fp', 'fn', 'tn'] as const).every((k) => m.value[k] === props.book[k]))
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
function advance(): boolean { if (prog.p === 0 && !playing.value) { play(); return true } return finish() }
defineExpose({ advance })
</script>

<template>
  <div class="ts" :data-testid="`m-${mode}`">
    <svg viewBox="0 0 960 440" role="img" :aria-label="mode === 'accuracy' ? 'The 81 test stores, each prediction correct or incorrect' : 'The 81 test stores sorted into a confusion matrix'">
      <text x="50" y="26" class="lbl">{{ data.n_test }} test stores · tree trained on {{ data.n_train }} · positive = "{{ pos }}"</text>
      <g v-for="(d, i) in drawn" :key="i">
        <circle :cx="d.x" :cy="d.y" :r="d.r" :style="{ fill: d.fill }" />
        <text v-if="d.mark" :x="d.x" :y="d.y + 5" text-anchor="middle" class="mk">{{ d.mark }}</text>
      </g>
      <g v-if="mode === 'accuracy'" class="count">
        <text x="520" y="150" class="big" data-testid="ts-correct">{{ correctSoFar }} <tspan class="of">of {{ revealed }} correct</tspan></text>
        <g :style="{ opacity: prog.p >= 0.9 ? 1 : 0, transition: 'opacity .5s' }">
          <text x="520" y="215" class="res">accuracy = {{ m.tp + m.tn }} / {{ m.n }} = <tspan style="fill: rgb(var(--c-ok))" data-testid="ts-accuracy">{{ pct(m.accuracy) }}</tspan></text>
          <text x="520" y="255" class="res">misclassification = {{ m.fp + m.fn }} / {{ m.n }} = <tspan style="fill: rgb(var(--c-warn))">{{ pct(m.misclassification) }}</tspan></text>
          <text x="520" y="300" class="small">On the {{ data.n_train }} training stores the same tree scores {{ pct(data.train_accuracy) }}: training accuracy flatters.</text>
        </g>
      </g>
      <g v-else :style="{ opacity: Math.min(1, prog.p * 3) }">
        <text x="625" y="68" text-anchor="middle" class="hd">Actual High</text>
        <text x="840" y="68" text-anchor="middle" class="hd">Actual Low</text>
        <text x="505" y="160" text-anchor="end" class="hd">Predicted High</text>
        <text x="505" y="320" text-anchor="end" class="hd">Predicted Low</text>
        <rect v-for="c in CELLS" :key="c.k" :x="518 + c.col * 215" :y="86 + c.row * 160" width="205" height="150" rx="12"
              :style="{ fill: `rgba(var(--c-${c.tone}), .08)`, stroke: `rgb(var(--c-${c.tone}))` }" class="cell" />
        <g :style="{ opacity: prog.p >= 0.95 ? 1 : 0, transition: 'opacity .5s' }">
          <text v-for="c in CELLS" :key="c.k + 'n'" :x="710 + c.col * 215" :y="228 + c.row * 160" text-anchor="end" class="cnt" :data-testid="`ts-${c.k}`"
                :style="{ fill: `rgb(var(--c-${c.tone}))` }">{{ m[c.k] }}</text>
          <text v-for="c in CELLS" :key="c.k + 'l'" :x="530 + c.col * 215" :y="229 + c.row * 160" class="cn">{{ c.name }}</text>
        </g>
      </g>
    </svg>
    <div class="foot">
      <p class="def">{{ mode === 'accuracy' ? DEFS.accuracy : DEFS.confusion }}</p>
      <p v-if="mode === 'matrix'" class="match" :class="{ on: prog.p >= 0.95 }" data-testid="ts-match">{{ matches ? '✓ Recomputed from the book\'s data: identical to Table 8.3 (p. 382)' : '≠ differs from Table 8.3' }}</p>
      <p class="src">Official DS4A carseats_train / carseats_test · decision tree, max depth {{ data.max_depth }}, min n {{ data.min_n }} · computed by the backend</p>
    </div>
  </div>
</template>

<style scoped>
.ts { width: 100%; }
svg { width: 100%; max-height: 52vh; display: block; }
.lbl { font: 600 14px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.mk { font: 700 13px 'Inter', system-ui; fill: rgb(var(--c-ink)); pointer-events: none; }
.big { font: 600 64px 'Space Grotesk', system-ui; fill: rgb(var(--c-strong)); }
.of { font-size: 22px; fill: rgb(var(--c-dim)); }
.res { font: 500 24px 'Space Grotesk', system-ui; fill: rgb(var(--c-text)); }
.small { font: 14px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.hd { font: 600 15px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.cell { stroke-width: 1.5; }
.cnt { font: 700 40px 'Space Grotesk', system-ui; }
.cn { font: 500 13px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.foot { display: flex; flex-wrap: wrap; gap: 6px 24px; align-items: baseline; margin-top: 6px; }
.def { flex-basis: 100%; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); }
.match { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); opacity: 0; transition: opacity .5s; }
.match.on { opacity: 1; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
