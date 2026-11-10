<script setup lang="ts">
/**
 * DS4A p. 394: many data scientists work to mitigate bias by examining the training data and installing quality
 * checks. Measured: the same 5-Chinstrap training set, (1) audited per group, then (2) reweighted so the rare group
 * counts as much as the others. → reveals the fix. Values from the backend (mean over 20 draws).
 */
import { computed, ref } from 'vue'
import type { Ethics } from '../../api'
import { MITIGATIONS } from './content'

const props = defineProps<{ data: Ethics }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 1) { stage.value++; return true } return false }
defineExpose({ advance })
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const rows = computed(() => {
  const m = props.data.mitigation
  return [
    { k: 'Before: trained as is', d: m.before, show: 0 },
    { k: 'After: reweighted (each group counts equally)', d: m.after_reweighting, show: 1 },
  ]
})
</script>

<template>
  <div class="md" data-testid="m-mitigation">
    <div class="left">
      <p class="h">What the book asks of data scientists</p>
      <ol><li v-for="m in MITIGATIONS" :key="m">{{ m }}</li></ol>
      <p class="audit"><b>Audit:</b> report the error for each group, not only overall accuracy.</p>
    </div>
    <div class="right">
      <p class="h">Measured: training data with only {{ data.mitigation.n_minority }} {{ data.minority }} penguins</p>
      <div v-for="(r, i) in rows" :key="r.k" class="row" :class="{ hide: stage < r.show }" :data-testid="`md-row-${i}`">
        <strong>{{ r.k }}</strong>
        <div class="bars">
          <span>{{ data.minority }} error</span><span class="track"><i :style="{ width: r.d.minority_error * 100 + '%', background: 'rgb(var(--c-warn))' }" /></span><b>{{ pct(r.d.minority_error) }}</b>
          <span>others' error</span><span class="track"><i :style="{ width: Math.max(0.5, r.d.majority_error * 100) + '%', background: 'rgb(var(--c-ok))' }" /></span><b>{{ pct(r.d.majority_error) }}</b>
          <span>overall accuracy</span><span class="track"><i :style="{ width: r.d.overall_accuracy * 100 + '%', background: 'rgba(var(--c-dim), .7)' }" /></span><b>{{ pct(r.d.overall_accuracy) }}</b>
        </div>
      </div>
      <p class="note" :class="{ hide: stage < 1 }">Reweighting helps, but it is no substitute for collecting representative data: with no examples of a group at all, no weighting can help.</p>
      <p class="src">Penguin analogy (not face data) · logistic regression with and without class_weight="balanced" · computed by the backend</p>
    </div>
  </div>
</template>

<style scoped>
.md { display: grid; grid-template-columns: 1fr 1.3fr; gap: 3vw; width: 100%; align-items: center; }
.h { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); margin-bottom: 10px; }
ol { margin-left: 20px; display: grid; gap: 10px; font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.45; }
.audit { margin-top: 16px; padding: 12px 16px; border-radius: 12px; background: rgba(var(--c-accent), .1); border-left: 3px solid rgb(var(--c-accent)); font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); }
.audit b { color: rgb(var(--c-accent)); }
.row { padding: 12px 16px; border-radius: 12px; background: rgba(var(--c-surface), .78); margin-bottom: 10px; transition: opacity .5s; }
.row strong { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.bars { display: grid; grid-template-columns: 130px 1fr 60px; gap: 6px 10px; align-items: center; margin-top: 8px; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.track { height: 12px; border-radius: 6px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 6px; transition: width .6s; }
.bars b { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; text-align: right; color: rgb(var(--c-strong)); }
.note { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-human)); transition: opacity .5s; }
.hide { opacity: 0; }
.src { margin-top: 6px; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
