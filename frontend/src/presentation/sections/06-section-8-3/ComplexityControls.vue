<script setup lang="ts">
/**
 * DS4A p. 377: max depth and min n control a decision tree's complexity. Sliders refit the car seat tree on the
 * backend (all ten explanatory variables, sales excluded); the tree, its size and accuracies update. The official
 * DS4A train/test split (319 / 81 stores) shows that a more complex tree is not automatically better on new stores.
 */
import { onMounted, ref, watch } from 'vue'
import { presentationApi, CARSEAT_FEATURES, type ConceptTree } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'
import { DEFS } from './content'

const depth = ref(2)
const minN = ref(2)
const tree = ref<ConceptTree | null>(null)
const error = ref<string | null>(null)
let timer = 0
async function load() {
  try { tree.value = await presentationApi.tree({ features: CARSEAT_FEATURES, max_depth: depth.value, min_n: minN.value }) } catch (e) { error.value = errorMessage(e) }
}
watch([depth, minN], () => { window.clearTimeout(timer); timer = window.setTimeout(load, 150) })
onMounted(load)
const pct = (v?: number) => (v === undefined ? '—' : `${(v * 100).toFixed(1)} %`)
function advance(): boolean { if (depth.value < 5) { depth.value++; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="cc" data-testid="m-complexity">
    <div class="ctrl">
      <label><span>max depth <b data-testid="cc-depth">{{ depth }}</b></span><input v-model.number="depth" type="range" min="1" max="8" step="1" data-testid="cc-depth-input" /><small>{{ DEFS.maxDepth }}</small></label>
      <label><span>min n <b>{{ minN }}</b></span><input v-model.number="minN" type="range" min="2" max="120" step="1" data-testid="cc-minn-input" /><small>{{ DEFS.minN }}</small></label>
      <div v-if="tree" class="stats" data-testid="cc-stats">
        <div><span>splits</span><b>{{ tree.tree.n_splits }}</b></div>
        <div><span>leaves</span><b data-testid="cc-leaves">{{ tree.tree.n_leaves }}</b></div>
        <div><span>correct on all 400</span><b>{{ tree.correct }}</b></div>
        <div><span>train accuracy (319)</span><b>{{ pct(tree.official_split?.train_accuracy) }}</b></div>
        <div><span>test accuracy (81 unseen)</span><b data-testid="cc-test">{{ pct(tree.official_split?.test_accuracy) }}</b></div>
      </div>
      <p class="src">Official DS4A car seat train/test files · computed by the backend</p>
    </div>
    <div class="vis">
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <DecisionTreeView v-else-if="tree" :nodes="tree.tree.nodes" :classes="tree.tree.classes" :colors="{ High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }" />
      <p class="note">More depth means more questions: better fit to the training stores, harder to explain.</p>
    </div>
  </div>
</template>

<style scoped>
.cc { display: grid; grid-template-columns: minmax(280px, 0.8fr) 1.6fr; gap: 3vw; align-items: center; width: 100%; }
label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
label span { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
label b { color: rgb(var(--c-human)); font-size: 22px; margin-left: 6px; }
label input { accent-color: rgb(var(--c-data)); }
label small { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); line-height: 1.4; }
.stats { display: grid; gap: 6px; }
.stats div { display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 10px; background: rgba(var(--c-surface), .72); font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.stats b { font: 600 max(17px, var(--up-17, 17px)) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
.vis { min-width: 0; }
.vis :deep(.dtree) { max-height: 52vh; }
.note { text-align: center; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.err { color: rgb(var(--c-human)); }
</style>
