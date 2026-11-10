<script setup lang="ts">
/**
 * AC 7, Calculate Accuracy, Precision, Recall and Specificity (DS4A p. 400): the real depth-1 car seat tree trained on
 * the 319 training stores; the 81 test stores (their real actual / predicted labels from the backend) pour into the
 * confusion matrix; then each metric with its substituted counts; then STAR. Pure function of (scene, p, line).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import type { TreeNode } from '../../presentation/api'
import DecisionTreeView from '../../visualizations/concepts/DecisionTreeView.vue'
import StarCards from '../visuals/StarCards.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type M = { counts: { tp: number; fp: number; fn: number; tn: number; total: number }; accuracy: number; precision: number; recall: number; specificity: number; calculations: Record<string, string> }
const m = computed(() => props.solve.metrics as M)
const tree = computed(() => props.solve.tree as { nodes: TreeNode[]; classes: string[] })
const preds = computed(() => props.solve.test_predictions as { actual: string; predicted: string }[])
const pos = computed(() => String(props.solve.parameters.positive_label ?? 'High'))
type C = 'tp' | 'fp' | 'fn' | 'tn'
const CELLS: { k: C; row: number; col: number; tone: string; name: string }[] = [
  { k: 'tp', row: 0, col: 0, tone: 'ok', name: 'true positives' }, { k: 'fp', row: 0, col: 1, tone: 'human', name: 'false positives' },
  { k: 'fn', row: 1, col: 0, tone: 'warn', name: 'false negatives' }, { k: 'tn', row: 1, col: 1, tone: 'data', name: 'true negatives' },
]
const cellOf = (a: string, p: string): C => (p === pos.value ? (a === pos.value ? 'tp' : 'fp') : (a === pos.value ? 'fn' : 'tn'))
const flowP = computed(() => (props.scene === 'flow' ? props.p : props.scene === 'tree' || props.scene === 'intro' ? 0 : 1))
const inCell = computed(() => {
  const out: Record<C, number> = { tp: 0, fp: 0, fn: 0, tn: 0 }
  preds.value.forEach((s, i) => { if (flowP.value >= 0.05 + (i / preds.value.length) * 0.85) out[cellOf(s.actual, s.predicted)]++ })
  return out
})
const METRICS = [
  { k: 'accuracy', name: 'Accuracy', cells: ['tp', 'tn'] }, { k: 'precision', name: 'Precision', cells: ['tp'] },
  { k: 'recall', name: 'Recall', cells: ['tp'] }, { k: 'specificity', name: 'Specificity', cells: ['tn'] },
] as const
const metricShown = computed(() => (props.scene === 'metrics' ? props.line : props.scene === 'star' ? 4 : -1))
const lit = (c: C) => props.scene === 'metrics' && (METRICS[Math.min(3, props.line)]?.cells as readonly string[]).includes(c)
const star = computed(() => props.solve.answers[4]?.answer as Record<string, unknown>)
</script>

<template>
  <div class="a7" data-testid="v-ac7">
    <StarCards v-if="scene === 'star'" :star="star" :shown="line + 1" />
    <div v-else class="grid">
      <div class="left">
        <div v-if="scene === 'intro'" class="intro"><div><b>319</b><span>training stores</span></div><div><b>81</b><span>test stores, unseen</span></div><div><b>1</b><span>question: max depth 1</span></div></div>
        <DecisionTreeView v-else :nodes="tree.nodes" :classes="tree.classes" :emphasis="scene === 'tree' ? 'split' : null" :colors="{ High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }" />
      </div>
      <div class="right" :class="{ hide: scene === 'intro' || scene === 'tree' }">
        <div class="mat">
          <span /><span class="hd">Actual {{ pos }}</span><span class="hd">Actual Low</span>
          <template v-for="r in [0, 1]" :key="r">
            <span class="hd side">Predicted {{ r === 0 ? pos : 'Low' }}</span>
            <div v-for="c in CELLS.filter((x) => x.row === r)" :key="c.k" class="cell" :class="{ lit: lit(c.k) }" :style="{ '--t': `var(--c-${c.tone})` }" :data-testid="`ac7-${c.k}`">
              <div class="dots"><i v-for="k in inCell[c.k]" :key="k" /></div>
              <b>{{ inCell[c.k] }}</b><small>{{ c.name }}</small>
            </div>
          </template>
        </div>
        <div class="metrics">
          <div v-for="(x, i) in METRICS" :key="x.k" class="met" :class="{ hide: i > metricShown }" :data-testid="`ac7-m-${x.k}`">
            <strong>{{ x.name }}</strong><code>{{ m.calculations[x.k] }}</code><b>{{ m[x.k].toFixed(2) }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.a7 { width: 100%; max-width: 1500px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3vw; align-items: center; }
.left :deep(.dtree) { max-height: 40vh; }
.intro { display: grid; gap: 12px; }
.intro div { display: flex; align-items: baseline; gap: 14px; padding: 16px 20px; border-radius: 14px; background: rgba(var(--c-surface), .85); }
.intro b { font: 700 clamp(30px, 3vw, 48px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.intro span { color: rgb(var(--c-soft)); }
.right { transition: opacity .5s; }
.hide { opacity: 0; }
.mat { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.hd { font: 600 13px 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); text-align: center; align-self: end; }
.hd.side { align-self: center; text-align: right; }
.cell { position: relative; min-height: clamp(110px, 17vh, 170px); padding: 8px 10px; border-radius: 14px; border: 2px solid rgba(var(--t), .5); background: rgba(var(--t), .06); transition: background .35s, transform .35s; }
.cell.lit { background: rgba(var(--t), .24); border-color: rgb(var(--t)); transform: scale(1.03); }
.dots { display: flex; flex-wrap: wrap; gap: 3px; max-width: 75%; }
.dots i { width: 9px; height: 9px; border-radius: 50%; background: rgb(var(--t)); animation: in .3s ease both; }
@keyframes in { from { opacity: 0; transform: scale(2); } }
.cell b { position: absolute; right: 12px; bottom: 22px; font: 700 clamp(26px, 2.4vw, 40px) 'Space Grotesk', system-ui; color: rgb(var(--t)); }
.cell small { position: absolute; right: 12px; bottom: 6px; font-size: 12px; color: rgb(var(--c-dim)); }
.metrics { display: grid; gap: 6px; margin-top: 12px; }
.met { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 10px; background: rgba(var(--c-surface), .85); transition: opacity .4s; }
.met strong { font: 600 14px 'Space Grotesk', system-ui; }
.met code { font: 12px 'JetBrains Mono', monospace; color: rgb(var(--c-soft)); }
.met b { font: 700 20px 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
@media (prefers-reduced-motion: reduce) { .dots i { animation: none; } }
</style>
