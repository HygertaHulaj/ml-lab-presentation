<script setup lang="ts">
/**
 * DS4A pp. 374–375, Fig. 8.12: the same method, a decision tree, for classification (predict sales_cat) and for
 * regression (predict sales). Both trees are fitted by the backend on the same split variable and read the same
 * way; only the leaf differs: a category on the left, a mean (thousands of units) on the right.
 */
import { onMounted, ref } from 'vue'
import { presentationApi, type ConceptTree } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'

const cls = ref<ConceptTree | null>(null)
const reg = ref<ConceptTree | null>(null)
const error = ref<string | null>(null)
onMounted(async () => {
  try { [cls.value, reg.value] = await Promise.all([presentationApi.tree({ features: ['shelf_location'] }), presentationApi.tree({ target: 'sales', features: ['shelf_location'] })]) } catch (e) { error.value = errorMessage(e) }
})
const good = () => reg.value?.tree.nodes.find((n) => n.is_leaf && n.id === reg.value!.tree.nodes[0].right)
</script>

<template>
  <div class="bt" data-testid="m-both">
    <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
    <template v-else-if="cls && reg">
      <figure>
        <figcaption><b class="c">Classification</b> · response <code>sales_cat</code> (High / Low)</figcaption>
        <DecisionTreeView :nodes="cls.tree.nodes" :classes="cls.tree.classes" :colors="{ High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }" />
        <p>Leaf = a category. {{ cls.correct }} of {{ cls.n }} stores correct.</p>
      </figure>
      <figure>
        <figcaption><b class="r">Regression</b> · response <code>sales</code> (thousands of units)</figcaption>
        <DecisionTreeView :nodes="reg.tree.nodes" unit="k" :colors="{}" />
        <p data-testid="both-regression">Leaf = a number: stores with a Good shelf location average <b>{{ good()?.prediction !== undefined ? Number(good()!.prediction).toFixed(2) : '…' }}</b> thousand units ({{ good()?.samples }} stores). R² = {{ reg.r2?.toFixed(2) }}.</p>
      </figure>
      <p class="tip">Quick Tip, p. 375: some methods, like decision trees, work for both regression and classification, and the general approach is the same. See Table 8.2 in the book for more methods.</p>
    </template>
  </div>
</template>

<style scoped>
.bt { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; width: 100%; }
figure { display: flex; flex-direction: column; gap: 8px; }
figcaption { font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-soft)); }
figcaption b { font-family: 'Space Grotesk', system-ui; }
b.c { color: rgb(var(--c-ok)); } b.r { color: rgb(var(--c-feature)); }
code { font-family: 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-data-soft)); }
figure :deep(.dtree) { max-height: 34vh; }
figure p { font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); }
figure p b { color: rgb(var(--c-strong)); }
.tip { grid-column: 1 / -1; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-human)); }
.err { color: rgb(var(--c-human)); }
</style>
