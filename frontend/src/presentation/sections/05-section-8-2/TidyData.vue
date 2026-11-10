<script setup lang="ts">
/**
 * DS4A Quick Tip, p. 366: tidy data. Every cell of five real Iris rows is absolutely positioned; switching between a
 * messy (transposed, one column per flower) and a tidy layout (one row per observation, one column per variable)
 * moves each cell to its new place, so the audience sees the same values re-organise.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { iris } from '../../../experiences/cinematic/story'

const props = defineProps<{ reduced: boolean }>()
const tidy = ref(false)
onMounted(() => { if (!props.reduced) window.setTimeout(() => (tidy.value = true), 1400) })
watch(() => props.reduced, (r) => { if (r) tidy.value = true })

const N = 5
const VARS = ['sepal length', 'sepal width', 'petal length', 'petal width', 'species']
const rows = Array.from({ length: N }, (_, i) => [...iris.observations[i * 30], iris.classes[iris.labels[i * 30]]])
const CW = 128, CH = 44
interface Cell { key: string; text: string; head: boolean; x: number; y: number }
const cells = computed<Cell[]>(() => {
  const out: Cell[] = []
  // headers
  VARS.forEach((v, c) => out.push({ key: 'h' + c, text: v, head: true, x: tidy.value ? (c + 1) * CW : 0, y: tidy.value ? 0 : (c + 1) * CH }))
  rows.forEach((_, r) => out.push({ key: 'f' + r, text: `flower ${r * 30 + 1}`, head: true, x: tidy.value ? 0 : (r + 1) * CW, y: tidy.value ? (r + 1) * CH : 0 }))
  rows.forEach((row, r) => row.forEach((v, c) => out.push({ key: `${r}-${c}`, text: String(v), head: false, x: (tidy.value ? c + 1 : r + 1) * CW, y: (tidy.value ? r + 1 : c + 1) * CH })))
  return out
})
const size = computed(() => (tidy.value ? { w: (VARS.length + 1) * CW, h: (N + 1) * CH } : { w: (N + 1) * CW, h: (VARS.length + 1) * CH }))
function advance(): boolean { if (!tidy.value) { tidy.value = true; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="td" data-testid="m-tidy">
    <div class="side">
      <div class="toggle"><button :class="{ on: !tidy }" @click="tidy = false">Messy</button><button :class="{ on: tidy }" data-testid="make-tidy" @click="tidy = true">Tidy</button></div>
      <ul class="rules">
        <li :class="{ ok: tidy }">each <b>row</b> is an observation (one flower)</li>
        <li :class="{ ok: tidy }">each <b>column</b> is a variable</li>
        <li :class="{ ok: tidy }">each <b>cell</b> is one value</li>
      </ul>
      <p class="note" data-testid="tidy-state">{{ tidy ? 'Tidy: ready for a machine-learning method.' : 'Messy: one column per flower, so the variables are scattered across rows.' }}</p>
      <p class="src">DS4A Quick Tip, p. 366 · real Iris rows 1, 31, 61, 91, 121</p>
    </div>
    <div class="table" :style="{ width: size.w + 'px', height: size.h + 'px' }">
      <div v-for="c in cells" :key="c.key" class="cell" :class="{ head: c.head, sp: c.text === 'setosa' || c.text === 'versicolor' || c.text === 'virginica' }" :style="{ transform: `translate(${c.x}px, ${c.y}px)` }">{{ c.text }}</div>
    </div>
  </div>
</template>

<style scoped>
.td { display: grid; grid-template-columns: minmax(260px, 0.7fr) 1.5fr; gap: 3vw; align-items: center; width: 100%; }
.toggle { display: inline-flex; padding: 4px; border-radius: 12px; background: rgba(var(--c-text), .06); }
.toggle button { padding: 8px 18px; border-radius: 9px; font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); }
.toggle button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); }
.rules { margin-top: 18px; display: grid; gap: 10px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-dim)); list-style: none; padding: 0; }
.rules li::before { content: '○'; margin-right: 10px; color: rgb(var(--c-faint)); }
.rules li.ok { color: rgb(var(--c-text)); } .rules li.ok::before { content: '✓'; color: rgb(var(--c-ok)); }
.rules b { color: rgb(var(--c-data)); }
.note { margin-top: 16px; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
.table { position: relative; transition: width .8s, height .8s; justify-self: center; }
.cell { position: absolute; left: 0; top: 0; width: 124px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(var(--c-surface), .85); border: 1px solid rgba(var(--c-dim), .2); font: 500 max(15px, var(--up-15, 15px)) 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-text)); transition: transform .9s cubic-bezier(.65,0,.35,1); }
.cell.head { background: rgba(var(--c-data), .12); border-color: rgba(var(--c-data), .4); font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-data-soft)); }
.cell.sp { color: rgb(var(--c-feature)); }
@media (prefers-reduced-motion: reduce) { .cell, .table { transition: none; } }
</style>
