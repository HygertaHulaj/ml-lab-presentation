<script setup lang="ts">
/**
 * Diversity, measured on the real penguin data: which species live on which island, then two models trained on the
 * same number of penguins: one from a single island, one from all three. → reveals the island table's consequence
 * and then each species' recall. All counts and recalls from the backend.
 */
import { ref } from 'vue'
import type { DataQuality } from '../../api'

defineProps<{ data: DataQuality['diversity'] }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 2) { stage.value++; return true } return false }
defineExpose({ advance })
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'] as const
const pct = (v: number) => `${Math.round(v * 100)} %`
</script>

<template>
  <div class="dv" data-testid="m-diversity">
    <table class="isl">
      <thead><tr><th>island</th><th v-for="s in SPECIES" :key="s">{{ s }}</th></tr></thead>
      <tbody>
        <tr v-for="r in data.by_island" :key="r.island" :class="{ one: r.island === data.island }">
          <th>{{ r.island }}</th><td v-for="s in SPECIES" :key="s" :class="{ zero: r[s] === 0 }">{{ r[s] }}</td>
        </tr>
      </tbody>
    </table>
    <p class="obs" :class="{ hide: stage < 1 }">No Chinstrap penguin lives on {{ data.island }}. A model trained only there has never seen one.</p>
    <div class="models" :class="{ hide: stage < 2 }">
      <div v-for="(m, i) in data.models" :key="m.name" class="model" :class="i === 0 ? 'bad' : 'good'" :data-testid="`dv-model-${i}`">
        <strong>{{ m.name }} · {{ m.n_train }} penguins</strong>
        <div v-for="s in SPECIES" :key="s" class="rec">
          <span>{{ s }} ({{ m.n_test[s] }})</span>
          <span class="track"><i :style="{ width: m.recall[s] * 100 + '%' }" /></span>
          <b :data-testid="`dv-${i}-${s}`">{{ pct(m.recall[s]) }}</b>
        </div>
        <small>overall {{ pct(m.accuracy) }} on {{ data.n_test }} test penguins from all islands</small>
      </div>
    </div>
    <p class="src">Real penguin data (DS4A's penguins.csv) · logistic regression on bill, flipper and mass · computed by the backend · bars: share of each species recognised</p>
  </div>
</template>

<style scoped>
.dv { display: grid; gap: 12px; }
.isl { border-collapse: collapse; font-size: max(14px, var(--up-14, 14px)); }
.isl th, .isl td { padding: 5px 14px; text-align: center; border-bottom: 1px solid rgba(var(--c-dim), .2); }
.isl th { color: rgb(var(--c-soft)); font-weight: 600; }
.isl td { font: 600 max(15px, var(--up-15, 15px)) 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-text)); }
.isl tr.one { background: rgba(var(--c-accent), .12); }
.isl td.zero { color: rgb(var(--c-warn)); }
.obs { font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-text)); transition: opacity .5s; }
.models { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; transition: opacity .5s; }
.model { padding: 12px 14px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-top: 3px solid; display: grid; gap: 6px; }
.model.bad { border-color: rgb(var(--c-warn)); } .model.good { border-color: rgb(var(--c-ok)); }
.model strong { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.rec { display: grid; grid-template-columns: 110px 1fr 44px; gap: 8px; align-items: center; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.track { height: 10px; border-radius: 5px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; background: rgb(var(--c-accent)); }
.rec b { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; text-align: right; color: rgb(var(--c-strong)); }
.model small { font-size: max(12px, var(--up-12, 12px)); color: rgb(var(--c-dim)); }
.hide { opacity: 0; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
