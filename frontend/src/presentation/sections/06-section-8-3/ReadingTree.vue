<script setup lang="ts">
/**
 * DS4A pp. 370–371, Figs 8.6–8.8: reading the real tree that predicts sales_cat from shelf_location, top to bottom.
 * → walks root → split → branches → leaves (all counts from the backend), then a new store is dropped down the tree.
 */
import { computed, onMounted, ref } from 'vue'
import { presentationApi, type ConceptTree, type TreeNode } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'

const tree = ref<ConceptTree | null>(null)
const error = ref<string | null>(null)
const stage = ref(0) // 0 root, 1 split, 2 branches, 3 leaves, 4 new store
const store = ref<'Bad' | 'Medium' | 'Good' | null>(null)
const COLORS = { High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }
onMounted(async () => { try { tree.value = await presentationApi.tree({ features: ['shelf_location'] }) } catch (e) { error.value = errorMessage(e) } })

const nodes = computed(() => tree.value?.tree.nodes ?? [])
const root = computed<TreeNode | undefined>(() => nodes.value[0])
const leaves = computed(() => nodes.value.filter((n) => n.is_leaf))
const cat = computed(() => (root.value?.feature ?? '').split('_').pop()) // the category the split asks about, e.g. "Good"
/** path for a store: sklearn sends "category present" (value 1 > 0.5) to the right */
const path = computed(() => {
  if (stage.value < 4 || !store.value || !root.value) return []
  const right = store.value === cat.value
  return [0, right ? root.value.right! : root.value.left!]
})
const leafFor = computed(() => nodes.value.find((n) => n.id === path.value[1]))
const emphasis = computed(() => (['root', 'split', 'branches', 'leaves', null] as const)[stage.value])
const c = (n: TreeNode | undefined, k: string) => n?.class_counts?.[k] ?? 0
const text = computed(() => {
  const r = root.value
  if (!r) return ''
  const [l, rt] = [nodes.value.find((n) => n.id === r.left), nodes.value.find((n) => n.id === r.right)]
  return [
    `The top node says "${r.prediction}" with ${c(r, 'High')} | ${c(r, 'Low')}: ${c(r, 'High')} stores had High sales and ${c(r, 'Low')} had Low. With no other information we predict "${r.prediction}" and are right for ${Math.max(c(r, 'High'), c(r, 'Low'))} of ${r.samples} stores.`,
    `The split asks one question about one variable: is the shelf location "${cat.value}"?`,
    `Yes → follow one branch, no → follow the other. Every store goes down exactly one branch.`,
    `The leaves give the predictions: "${rt?.prediction}" for ${rt?.samples} stores with a ${cat.value} shelf location (${c(rt, 'High')} of them really High), and "${l?.prediction}" for the other ${l?.samples}.`,
    'A new store arrives. Choose its shelf location and follow the tree.',
  ][stage.value]
})
function advance(): boolean { if (stage.value < 4) { stage.value++; return true } if (!store.value) { store.value = 'Good'; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="rt" data-testid="m-reading">
    <div class="text">
      <div class="steps"><span v-for="(s, i) in ['Top node', 'Split', 'Branches', 'Leaves', 'New store']" :key="s" :class="{ on: i === stage, done: i < stage }" @click="stage = i">{{ s }}</span></div>
      <p class="expl" data-testid="reading-text">{{ text }}</p>
      <div v-if="stage === 4" class="choose">
        <button v-for="s in (['Bad', 'Medium', 'Good'] as const)" :key="s" :class="{ on: store === s }" :data-testid="'store-' + s.toLowerCase()" @click="store = s">{{ s }}</button>
      </div>
      <p v-if="leafFor" class="answer" data-testid="reading-prediction">Prediction for a store with a {{ store }} shelf location: <b :style="{ color: COLORS[leafFor.prediction as 'High' | 'Low'] }">{{ leafFor.prediction }}</b></p>
      <p class="src">DS4A Figs 8.6–8.8 · tree fitted by the backend on the 400 stores (High | Low counts)</p>
    </div>
    <div class="vis">
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <DecisionTreeView v-else-if="tree" :nodes="nodes" :classes="tree.tree.classes" :colors="COLORS" :emphasis="emphasis" :path="path" />
      <p v-if="tree" class="leaves">{{ leaves.length }} leaves · {{ tree.correct }} of {{ tree.n }} stores predicted correctly</p>
    </div>
  </div>
</template>

<style scoped>
.rt { display: grid; grid-template-columns: 1fr 1.3fr; gap: 3vw; align-items: center; width: 100%; }
.steps { display: flex; gap: 6px; flex-wrap: wrap; }
.steps span { padding: 6px 12px; border-radius: 999px; font: 600 max(13px, var(--up-13, 13px)) 'Space Grotesk', system-ui; color: rgb(var(--c-faint)); border: 1px solid rgba(var(--c-dim), .2); cursor: pointer; }
.steps span.done { color: rgb(var(--c-data-soft)); } .steps span.on { background: rgb(var(--c-human)); color: rgb(var(--c-ink)); border-color: rgb(var(--c-human)); }
.expl { margin-top: 16px; font-size: clamp(16px, 1.3vw, 22px); line-height: 1.5; color: rgb(var(--c-text)); min-height: 5em; }
.choose { display: flex; gap: 8px; margin-top: 8px; }
.choose button { padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(var(--c-dim), .35); font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
.choose button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); border-color: rgb(var(--c-data)); }
.answer { margin-top: 14px; font-size: max(18px, var(--up-18, 18px)); color: rgb(var(--c-soft)); }
.answer b { font: 700 22px 'Space Grotesk', system-ui; }
.src { margin-top: 12px; font-size: 12px; color: rgb(var(--c-faint)); }
.vis :deep(.dtree) { max-height: 46vh; }
.leaves { text-align: center; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.err { color: rgb(var(--c-human)); }
</style>
