<script setup lang="ts">
/**
 * DS4A Try It Yourself: Interpretability versus Complexity (pp. 377–379, Figs 8.14–8.16). Three car seat trees of
 * growing depth (1, 2, 3), fitted by the backend; they are nested (same first split). Quiz answers are computed.
 */
import { computed, onMounted, ref } from 'vue'
import { presentationApi, CARSEAT_FEATURES, type ConceptTree } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'
import ChoiceQuiz, { type QuizItem } from '../../../visualizations/concepts/ChoiceQuiz.vue'

const trees = ref<ConceptTree[]>([])
const error = ref<string | null>(null)
const quiz = ref<InstanceType<typeof ChoiceQuiz> | null>(null)
onMounted(async () => {
  try { trees.value = await Promise.all([1, 2, 3].map((d) => presentationApi.tree({ features: CARSEAT_FEATURES, max_depth: d }))) } catch (e) { error.value = errorMessage(e) }
})
const NAMES = ['first', 'second', 'third']
const items = computed<QuizItem[]>(() => {
  if (trees.value.length < 3) return []
  const top = (trees.value[0].tree.nodes[0].feature ?? '').replace(/_(Good|Bad|Medium)$/, '').replace(/_/g, ' ')
  const best = trees.value.reduce((b, t, i) => ((t.correct ?? 0) > (trees.value[b].correct ?? 0) ? i : b), 0)
  return [
    { q: 'The variable at the top of all three trees is…', options: ['price', 'shelf location', 'income', 'advertising'], answer: top, why: 'The trees are nested: the first split is the same in all of them.' },
    { q: 'Which tree makes the most correct predictions?', options: NAMES, answer: NAMES[best], why: trees.value.map((t, i) => `${NAMES[i]}: ${t.correct}`).join(' · ') + ' of 400 stores' },
    { q: 'Which tree is the most interpretable and least complex?', options: NAMES, answer: 'first', why: 'A single split: one question about shelf location.' },
    { q: 'Which tree is the least interpretable and most complex?', options: NAMES, answer: 'third', why: 'The most splits: more variables, more questions per prediction.' },
  ]
})
function advance(): boolean { return quiz.value?.advance() ?? false }
defineExpose({ advance })
</script>

<template>
  <div class="nt" data-testid="m-nested">
    <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
    <div v-else class="trees">
      <figure v-for="(t, i) in trees" :key="i">
        <figcaption>{{ NAMES[i] }} tree · {{ t.tree.n_splits }} split{{ t.tree.n_splits > 1 ? 's' : '' }} · <b>{{ t.correct }}</b> / {{ t.n }} correct</figcaption>
        <DecisionTreeView :nodes="t.tree.nodes" :classes="t.tree.classes" :colors="{ High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }" />
      </figure>
    </div>
    <ChoiceQuiz v-if="items.length" ref="quiz" :items="items" testid="nested" :columns="2" />
  </div>
</template>

<style scoped>
.nt { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.trees { display: grid; grid-template-columns: 0.6fr 1fr 1.6fr; gap: 16px; align-items: end; }
figure { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
figcaption { font: 500 14px 'Inter', system-ui; color: rgb(var(--c-soft)); text-transform: capitalize; }
figcaption b { color: rgb(var(--c-ok)); }
figure :deep(.dtree) { max-height: 26vh; }
.err { color: rgb(var(--c-human)); }
</style>
