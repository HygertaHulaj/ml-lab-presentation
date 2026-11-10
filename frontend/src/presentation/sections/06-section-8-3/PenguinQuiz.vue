<script setup lang="ts">
/**
 * DS4A Try It Yourself: Reading a Decision Tree (p. 373, Fig. 8.11). The penguin tree is fitted by the backend on
 * the Palmer penguins data; every quiz answer is read from that tree (prediction, split, threshold, leaf counts).
 */
import { computed, onMounted, ref } from 'vue'
import { presentationApi, PENGUIN_FEATURES, type ConceptTree } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'
import ChoiceQuiz, { type QuizItem } from '../../../visualizations/concepts/ChoiceQuiz.vue'

const tree = ref<ConceptTree | null>(null)
const error = ref<string | null>(null)
const quiz = ref<InstanceType<typeof ChoiceQuiz> | null>(null)
const COLORS = { Adelie: 'rgb(var(--c-data))', Chinstrap: 'rgb(var(--c-human))', Gentoo: 'rgb(var(--c-feature))' }
onMounted(async () => { try { tree.value = await presentationApi.tree({ dataset: 'penguins', target: 'species', features: PENGUIN_FEATURES }) } catch (e) { error.value = errorMessage(e) } })

const items = computed<QuizItem[]>(() => {
  const t = tree.value
  if (!t) return []
  const n = t.tree.nodes
  const root = n[0], left = n.find((x) => x.id === root.left)!, right = n.find((x) => x.id === root.right)!
  const feat = (root.feature ?? '').replace(/_/g, ' ')
  const correct = (leaf: typeof left) => leaf.class_counts![String(leaf.prediction)]
  const total = correct(left) + correct(right)
  return [
    { q: 'Without knowing anything else about a new penguin, we would predict its species to be…', options: ['Adelie', 'Chinstrap', 'Gentoo'], answer: String(root.prediction), why: `The top node: ${root.class_counts!.Adelie} Adelie is the largest group.` },
    { q: 'The tree splits on the variable…', options: ['bill length mm', 'flipper length mm', 'body mass g', 'island'], answer: feat },
    { q: `If ${feat} is below ${Math.ceil(root.threshold!)} mm, we predict… (otherwise the other species)`, options: [`${left.prediction}, else ${right.prediction}`, `${right.prediction}, else ${left.prediction}`, 'Chinstrap, else Gentoo'], answer: `${left.prediction}, else ${right.prediction}`, why: `Threshold found by the tree: ${root.threshold} mm.` },
    { q: 'How many correct predictions do the two leaves make in total?', options: [String(total - 20), String(total), String(total + 14), String(t.n)], answer: String(total), why: `${correct(left)} ${left.prediction} + ${correct(right)} ${right.prediction} = ${total} of ${t.n} penguins.` },
  ]
})
function advance(): boolean { return quiz.value?.advance() ?? false }
defineExpose({ advance })
</script>

<template>
  <div class="pq" data-testid="m-penguins">
    <div class="vis">
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <template v-else-if="tree">
        <DecisionTreeView :nodes="tree.tree.nodes" :classes="tree.tree.classes" :colors="COLORS" />
        <p class="cap">Adelie | Chinstrap | Gentoo counts · {{ tree.n }} penguins (Palmer penguins, DS4A dataset) · fitted by the backend</p>
      </template>
    </div>
    <ChoiceQuiz v-if="items.length" ref="quiz" :items="items" testid="penguin" />
  </div>
</template>

<style scoped>
.pq { display: grid; grid-template-columns: 1fr 1.1fr; gap: 3vw; align-items: center; width: 100%; }
.vis :deep(.dtree) { max-height: 42vh; }
.cap { margin-top: 6px; text-align: center; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-faint)); }
.err { color: rgb(var(--c-human)); }
</style>
