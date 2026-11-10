<script setup lang="ts">
/**
 * DS4A p. 383: accuracy (Quick Tip: the diagonal over the total), precision, recall and specificity read from the
 * confusion matrix. Choosing a metric highlights the cells in its numerator (filled) and denominator (outlined) and
 * substitutes the real counts. All values come from the backend; nothing is computed here except the display.
 */
import { computed, ref } from 'vue'
import type { BinaryMetrics } from '../../api'
import { DEFS } from './content'

const props = defineProps<{ m: BinaryMetrics }>()
type C = 'tp' | 'fp' | 'fn' | 'tn'
const METRICS: { k: keyof BinaryMetrics; name: string; num: C[]; den: C[]; def: string }[] = [
  { k: 'accuracy', name: 'Accuracy', num: ['tp', 'tn'], den: ['tp', 'fp', 'fn', 'tn'], def: DEFS.accuracy },
  { k: 'precision', name: 'Precision', num: ['tp'], den: ['tp', 'fp'], def: DEFS.precision },
  { k: 'recall', name: 'Recall', num: ['tp'], den: ['tp', 'fn'], def: DEFS.recall },
  { k: 'specificity', name: 'Specificity', num: ['tn'], den: ['tn', 'fp'], def: DEFS.specificity },
]
const CELLS: { k: C; label: string; row: number; col: number; tone: string }[] = [
  { k: 'tp', label: 'TP', row: 0, col: 0, tone: 'ok' }, { k: 'fp', label: 'FP', row: 0, col: 1, tone: 'human' },
  { k: 'fn', label: 'FN', row: 1, col: 0, tone: 'warn' }, { k: 'tn', label: 'TN', row: 1, col: 1, tone: 'data' },
]
const sel = ref(0)
const cur = computed(() => METRICS[sel.value])
const up = (cs: C[]) => cs.map((c) => c.toUpperCase()).join(' + ')
const sum = (cs: C[]) => cs.map((c) => props.m[c]).join(' + ')
const tot = (cs: C[]) => cs.reduce((a, c) => a + props.m[c], 0)
const val = computed(() => Number(props.m[cur.value.k]))
function advance(): boolean { if (sel.value < METRICS.length - 1) { sel.value++; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="me" data-testid="m-metrics">
    <div class="mat">
      <div class="hdr" /><div class="hdr">Actual High</div><div class="hdr">Actual Low</div>
      <template v-for="r in [0, 1]" :key="r">
        <div class="hdr side">Predicted {{ r === 0 ? 'High' : 'Low' }}</div>
        <div v-for="c in CELLS.filter((x) => x.row === r)" :key="c.k" class="cell"
             :class="{ num: cur.num.includes(c.k), den: cur.den.includes(c.k) && !cur.num.includes(c.k) }"
             :style="{ '--t': `var(--c-${c.tone})` }" :data-testid="`me-${c.k}`">
          <b>{{ m[c.k] }}</b><span>{{ c.label }}</span>
        </div>
      </template>
    </div>
    <div class="right">
      <div class="tabs">
        <button v-for="(x, i) in METRICS" :key="x.k" :class="{ on: i === sel }" :data-testid="`me-tab-${x.k}`" @click="sel = i">{{ x.name }}</button>
      </div>
      <p class="def">{{ cur.def }}</p>
      <div class="formula" data-testid="me-formula">
        <span class="f">{{ cur.name }} = <span class="fr"><i>{{ up(cur.num) }}</i><i>{{ up(cur.den) }}</i></span></span>
        <span class="f">= <span class="fr"><i>{{ sum(cur.num) }}</i><i>{{ sum(cur.den) }}</i></span> = <span class="fr"><i>{{ tot(cur.num) }}</i><i>{{ tot(cur.den) }}</i></span></span>
        <span class="v" data-testid="me-value">= {{ val.toFixed(2) }}</span>
      </div>
      <p v-if="cur.k === 'accuracy'" class="tip">Quick Tip, p. 383: add the diagonal (top left to bottom right) and divide by the table total.</p>
      <p v-if="cur.k === 'specificity'" class="tip">The book prints TN / (TN + FN). The standard definition, used here, is TN / (TN + FP). With these counts FP = FN = {{ m.fp }}, so both give {{ val.toFixed(2) }}.</p>
      <p class="src keep">Filled cells: numerator · outlined: the rest of the denominator</p>
    </div>
  </div>
</template>

<style scoped>
.me { display: grid; grid-template-columns: minmax(320px, 1fr) 1.2fr; gap: 4vw; width: 100%; align-items: center; }
.mat { display: grid; grid-template-columns: auto 1fr 1fr; gap: 10px; }
.hdr { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); text-align: center; align-self: end; }
.hdr.side { align-self: center; text-align: right; }
.cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: clamp(90px, 15vh, 150px); border-radius: 14px; border: 2px solid rgba(var(--t), .25); background: rgba(var(--t), .05); transition: background .35s, border-color .35s, transform .35s; }
.cell b { font: 700 clamp(30px, 3vw, 52px) 'Space Grotesk', system-ui; color: rgb(var(--t)); }
.cell span { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); }
.cell.num { background: rgba(var(--t), .24); border-color: rgb(var(--t)); transform: scale(1.03); }
.cell.den { border-color: rgb(var(--t)); border-style: dashed; }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tabs button { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(var(--c-dim), .4); font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
.tabs button.on { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
.def { margin-top: 14px; font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.45; }
.formula { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; font: 500 clamp(18px, 1.5vw, 26px) 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-text)); }
.f { display: inline-flex; align-items: center; gap: 10px; }
.fr { display: inline-flex; flex-direction: column; align-items: center; }
.fr i { font-style: normal; padding: 0 6px; }
.fr i:first-child { border-bottom: 2px solid rgb(var(--c-dim)); }
.v { font-weight: 700; color: rgb(var(--c-accent)); }
.tip { margin-top: 14px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-human)); line-height: 1.45; }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
