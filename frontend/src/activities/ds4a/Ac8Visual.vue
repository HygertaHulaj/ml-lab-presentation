<script setup lang="ts">
/**
 * AC 8, Overfitted, Underfitted and Well-Fitted Models (DS4A pp. 400–401): the book's three models' confusion
 * matrices (training and testing, as printed), the four cell types, the accuracy column computed by the backend
 * solver, training vs test bars, and the verdicts. Pure function of (scene, line).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type Mats = Record<string, { training: number[][]; testing: number[][] }>
const mats = computed(() => (props.solve.parameters.matrices as Mats))
const models = computed(() => Object.keys(mats.value))
const table = computed(() => props.solve.accuracy_table as { model: string; dataset: string; accuracy: number; calculation: string }[])
const concl = computed(() => props.solve.conclusions as Record<string, { label: string; training_fit: string; test: string; reason: string; train_accuracy: number; test_accuracy: number }>)
const cells = computed(() => props.solve.answers[0]?.answer as Record<string, string>)
const acc = (m: string, d: string) => table.value.find((r) => r.model === m && r.dataset === d)
const rowsShown = computed(() => (props.scene === 'accuracy' ? props.line + 1 : ['bars', 'verdict'].includes(props.scene) ? 99 : 0))
const tone = (l: string) => (l === 'overfitted' ? 'warn' : l === 'underfitted' ? 'human' : 'ok')
const name = (m: string) => m.replace('model_', 'Model ')
</script>

<template>
  <div class="a8" data-testid="v-ac8">
    <div v-if="scene === 'cells'" class="cellsdef">
      <div v-for="(v, k) in cells" :key="k" class="cd"><strong>{{ String(k).split('_')[1] }}</strong><span>{{ v }}</span></div>
      <p>Positive = 1. "True / False": was the prediction right? "Positive / Negative": what was predicted.</p>
    </div>
    <div v-else class="body">
      <div class="mats">
        <div v-for="m in models" :key="m" class="model" :class="scene === 'verdict' ? `v-${tone(concl[m].label)}` : ''" :data-testid="`ac8-${m}`">
          <h3>{{ name(m) }} <span v-if="scene === 'verdict'" class="tag" :style="{ color: `rgb(var(--c-${tone(concl[m].label)}))` }">{{ concl[m].label }}</span></h3>
          <div class="pair">
            <div v-for="d in (['training', 'testing'] as const)" :key="d" class="mt">
              <small>{{ d }}</small>
              <table><thead><tr><th /><th>P=0</th><th>P=1</th></tr></thead><tbody><tr v-for="(row, a) in mats[m][d]" :key="a"><th>A={{ a }}</th><td v-for="(v, j) in row" :key="j">{{ v }}</td></tr></tbody></table>
              <p v-if="rowsShown > models.indexOf(m) * 2 + (d === 'testing' ? 1 : 0)" class="acc" :data-testid="`ac8-acc-${m}-${d}`">{{ acc(m, d)?.calculation }} = <b>{{ acc(m, d)?.accuracy.toFixed(2) }}</b></p>
            </div>
          </div>
          <div v-if="scene === 'bars' || scene === 'verdict'" class="bars">
            <span>train</span><span class="track"><i :style="{ width: concl[m].train_accuracy * 100 + '%', background: 'rgb(var(--c-compute))' }" /></span>
            <span>test</span><span class="track"><i :style="{ width: concl[m].test_accuracy * 100 + '%', background: 'rgb(var(--c-warn))' }" /></span>
          </div>
          <p v-if="scene === 'verdict'" class="why">It {{ concl[m].training_fit }} the training data and {{ concl[m].test }} the test data well: {{ concl[m].reason }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.a8 { width: 100%; max-width: 1500px; margin: 0 auto; }
.cellsdef { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.cd { display: flex; flex-direction: column; gap: 8px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .85); border-top: 3px solid rgb(var(--c-accent)); }
.cd strong { font: 700 clamp(26px, 2.4vw, 40px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.cd span { font: 500 15px 'JetBrains Mono', monospace; color: rgb(var(--c-text)); }
.cellsdef p { grid-column: 1 / -1; text-align: center; color: rgb(var(--c-soft)); }
.mats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.model { padding: 12px 14px; border-radius: 16px; background: rgba(var(--c-surface), .8); border-top: 3px solid rgba(var(--c-dim), .4); transition: border-color .4s; }
.model.v-warn { border-color: rgb(var(--c-warn)); } .model.v-ok { border-color: rgb(var(--c-ok)); } .model.v-human { border-color: rgb(var(--c-human)); }
h3 { font: 600 17px 'Space Grotesk', system-ui; display: flex; justify-content: space-between; }
.tag { font-size: 15px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
.mt small { font-size: 12px; color: rgb(var(--c-dim)); }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 2px; }
th { color: rgb(var(--c-dim)); font-weight: 500; padding: 2px; }
td { text-align: center; font: 600 13px 'JetBrains Mono', monospace; border: 1px solid rgba(var(--c-dim), .25); padding: 2px; }
.acc { margin-top: 4px; font: 12px 'JetBrains Mono', monospace; color: rgb(var(--c-soft)); animation: in .4s ease both; }
.acc b { font-size: 15px; color: rgb(var(--c-accent)); }
@keyframes in { from { opacity: 0; transform: translateY(6px); } }
.bars { display: grid; grid-template-columns: 40px 1fr; gap: 4px 8px; align-items: center; margin-top: 10px; font-size: 12px; color: rgb(var(--c-soft)); }
.track { height: 10px; border-radius: 5px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; }
.why { margin-top: 8px; font-size: 13px; color: rgb(var(--c-text)); line-height: 1.45; }
@media (prefers-reduced-motion: reduce) { .acc { animation: none; } }
</style>
