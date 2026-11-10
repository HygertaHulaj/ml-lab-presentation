<script setup lang="ts">
/**
 * DS4A pp. 369–370: the car seat data (400 stores) and the Quick Tip "do not include surrogates of the response".
 * Toggle `sales` as an explanatory variable: the backend fits both trees. With `sales`, the tree is "perfect",
 * because sales_cat is just sales cut at 8 (thousand units), so the model has learned nothing useful.
 */
import { onMounted, ref, watch } from 'vue'
import { presentationApi, type ConceptTree } from '../../api'
import { errorMessage } from '../../../api/client'
import DecisionTreeView from '../../../visualizations/concepts/DecisionTreeView.vue'
import { CARSEAT_VARS } from './content'

const includeSales = ref(false)
const tree = ref<ConceptTree | null>(null)
const error = ref<string | null>(null)
const COLORS = { High: 'rgb(var(--c-ok))', Low: 'rgb(var(--c-human))' }
async function load() {
  try { tree.value = await presentationApi.tree({ features: includeSales.value ? ['shelf_location', 'price', 'sales'] : ['shelf_location', 'price'], max_depth: 1 }) } catch (e) { error.value = errorMessage(e) }
}
watch(includeSales, load)
onMounted(load)
function advance(): boolean { if (!includeSales.value) { includeSales.value = true; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="sd" data-testid="m-surrogate">
    <div class="vars">
      <h3>The car seat data · 400 stores</h3>
      <div v-for="v in CARSEAT_VARS" :key="v.v" class="var" :class="v.role">
        <code>{{ v.v }}</code><span>{{ v.d }}</span>
        <em v-if="v.role === 'response'">response</em><em v-else-if="v.role === 'surrogate'">surrogate!</em>
      </div>
      <p class="src">Variables as in DS4A Table 8.1, p. 369 · official DS4A dataset</p>
    </div>
    <div class="demo">
      <label class="tog"><input v-model="includeSales" type="checkbox" data-testid="include-sales" /> Use <code>sales</code> to predict <code>sales_cat</code></label>
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <template v-else-if="tree">
        <DecisionTreeView :nodes="tree.tree.nodes" :classes="tree.tree.classes" :colors="COLORS" />
        <p class="acc" :class="{ leak: tree.leakage.length }" data-testid="surrogate-result">
          <b>{{ ((tree.accuracy ?? 0) * 100).toFixed(1) }} %</b> of stores predicted correctly.
          <template v-if="tree.leakage.length"> Too good to be true: knowing <code>sales</code> means already knowing <code>sales_cat</code>. A surrogate of the response must be excluded.</template>
          <template v-else> Using only genuine explanatory variables.</template>
        </p>
      </template>
      <p class="tip">Quick Tip, p. 370: explore the data before modeling, and do not include surrogates of the response variable as explanatory variables.</p>
    </div>
  </div>
</template>

<style scoped>
.sd { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3vw; width: 100%; align-items: start; }
h3 { font: 600 max(17px, var(--up-17, 17px)) 'Space Grotesk', system-ui; margin-bottom: 8px; }
.var { display: grid; grid-template-columns: minmax(150px, 10.5em) 1fr auto; gap: 10px; align-items: baseline; padding: 4px 0; font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-soft)); border-bottom: 1px solid rgba(var(--c-dim), .08); }
.var code { color: rgb(var(--c-data-soft)); font-family: 'JetBrains Mono', Consolas, monospace; }
.var.response code { color: rgb(var(--c-ok)); } .var.surrogate code { color: rgb(var(--c-warn)); }
.var em { font-style: normal; font-size: max(12px, var(--up-12, 12px)); font-weight: 700; color: rgb(var(--c-ok)); } .var.surrogate em { color: rgb(var(--c-warn)); }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
.tog { display: inline-flex; gap: 10px; align-items: center; padding: 10px 14px; border-radius: 12px; background: rgba(var(--c-warn), .1); border: 1px solid rgba(var(--c-warn), .4); font-size: max(16px, var(--up-16, 16px)); cursor: pointer; }
.tog input { accent-color: rgb(var(--c-warn)); width: 18px; height: 18px; }
.tog code, .acc code { font-family: 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-data-soft)); }
.demo { display: flex; flex-direction: column; gap: 10px; }
.demo :deep(.dtree) { max-height: 34vh; }
.acc { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.acc b { font: 600 22px 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
.acc.leak b { color: rgb(var(--c-warn)); }
.tip { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-human)); }
.err { color: rgb(var(--c-human)); }
</style>
