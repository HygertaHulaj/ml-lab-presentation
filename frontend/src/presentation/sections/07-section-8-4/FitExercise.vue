<script setup lang="ts">
/**
 * DS4A Try It Yourself, p. 388: three models' training and test confusion matrices (the book's own numbers). The
 * student names the cells and judges each model's fit; checking the answers reveals the accuracy column, computed by
 * the backend as (TP + TN) / total.
 */
import { computed, ref } from 'vue'
import type { Evaluation } from '../../api'
import ChoiceQuiz from '../../../visualizations/concepts/ChoiceQuiz.vue'
import { CELL_ITEMS, CELL_OPTIONS } from './content'

const props = defineProps<{ models: Evaluation['fit_exercise'] }>()
const quiz = ref<{ advance: () => boolean } | null>(null)
const checked = ref(false)
const VERDICTS = ['overfitted', 'well-fitted', 'underfitted']
const items = computed(() => [
  ...CELL_ITEMS.map((c) => ({ q: c.q, options: CELL_OPTIONS, answer: c.answer })),
  ...props.models.map((m) => ({
    q: `Model ${m.model} was…`, options: VERDICTS, answer: m.verdict,
    why: `training ${m.train_accuracy.toFixed(2)}, test ${m.test_accuracy.toFixed(2)}: it ${m.fit_training ? 'fit' : 'did not fit'} the training data and ${m.predicted_test ? 'predicted' : 'did not predict'} the test data well.`,
  })),
])
function advance(): boolean { return quiz.value?.advance() ?? false }
defineExpose({ advance })
</script>

<template>
  <div class="fx" data-testid="m-fitex">
    <div class="mats">
      <div v-for="m in models" :key="m.model" class="model">
        <template v-for="k in (['training', 'testing'] as const)" :key="k">
          <div class="mat">
            <p class="t">Model {{ m.model }} · {{ k }}</p>
            <table>
              <thead><tr><th /><th>Pred = 0</th><th>Pred = 1</th></tr></thead>
              <tbody><tr v-for="(row, a) in m[k]" :key="a"><th>Actual = {{ a }}</th><td v-for="(v, p) in row" :key="p">{{ v }}</td></tr></tbody>
            </table>
            <p class="acc" :class="{ on: checked }" :data-testid="`fx-acc-${m.model}-${k}`">accuracy {{ (k === 'training' ? m.train_accuracy : m.test_accuracy).toFixed(2) }}</p>
          </div>
        </template>
      </div>
      <p class="src">Matrices as printed in DS4A, p. 388 · accuracy = (TP + TN) / total, computed by the backend</p>
    </div>
    <ChoiceQuiz ref="quiz" :items="items" testid="fitex" :columns="4" class="q" @checked="checked = true" />
  </div>
</template>

<style scoped>
.fx { display: grid; gap: 14px; width: 100%; }
.mats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mats .src { grid-column: 1 / -1; }
.model { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mat { padding: 8px 12px; border-radius: 12px; background: rgba(var(--c-surface), .78); }
.t { font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: max(13px, var(--up-13, 13px)); }
th { font-weight: 500; color: rgb(var(--c-dim)); text-align: left; padding: 2px 4px; }
td { font: 600 max(14px, var(--up-14, 14px)) 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-text)); text-align: center; padding: 2px 4px; border: 1px solid rgba(var(--c-dim), .25); }
.acc { margin-top: 4px; font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); opacity: 0; transition: opacity .5s; }
.acc.on { opacity: 1; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
.q :deep(.item) { padding: 8px 12px; }
.q :deep(.q) { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); }
.q :deep(.opts button) { padding: 4px 10px; font-size: max(13px, var(--up-13, 13px)); }
/* shorter screens (e.g. 1880×960): tighter spacing, same text sizes */
@media (max-height: 1000px) { .fx { gap: 8px; } .mat { padding: 4px 10px; } td, th { padding: 1px 4px; } .q :deep(.item) { padding: 6px 10px; } .q :deep(.opts) { margin-top: 4px; gap: 4px; } .q :deep(.opts button) { padding: 2px 10px; } .q :deep(.bar) { margin-top: 6px; } }
</style>
