<script setup lang="ts">
/**
 * DS4A p. 366, Step 1: ingesting data. Items arrive; the audience decides structured or unstructured; checking moves
 * every item into its true bin. Structured data fits tables; unstructured data (emails, images, video, posts) is raw.
 */
import { computed, ref } from 'vue'
import { INGEST_ITEMS } from './content'

const choice = ref<Record<number, boolean | undefined>>({})
const checked = ref(false)
const pick = (i: number, v: boolean) => { if (!checked.value) choice.value = { ...choice.value, [i]: v } }
const items = computed(() => INGEST_ITEMS.map((it, i) => ({ ...it, i, chosen: choice.value[i] })))
const bin = (structured: boolean) => items.value.filter((it) => (checked.value ? it.structured === structured : false))
const queue = computed(() => (checked.value ? [] : items.value))
const score = computed(() => INGEST_ITEMS.filter((it, i) => choice.value[i] === it.structured).length)
function advance(): boolean { if (!checked.value) { checked.value = true; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="ing" data-testid="m-ingest">
    <div class="intake">
      <h3>Incoming data. Structured (S) or unstructured (U)?</h3>
      <TransitionGroup name="card" tag="div" class="queue">
        <div v-for="it in queue" :key="it.i" class="item" :style="{ animationDelay: it.i * 0.12 + 's' }">
          <span>{{ it.label }}</span>
          <span class="btns">
            <button :class="{ on: it.chosen === true }" :data-testid="'ing-' + it.i + '-s'" @click="pick(it.i, true)">S</button>
            <button :class="{ on: it.chosen === false }" :data-testid="'ing-' + it.i + '-u'" @click="pick(it.i, false)">U</button>
          </span>
        </div>
      </TransitionGroup>
      <button v-if="!checked" class="btn" data-testid="ing-check" @click="checked = true">Feed into the system</button>
      <p v-else class="score" data-testid="ing-score">{{ score }} / {{ INGEST_ITEMS.length }} sorted correctly</p>
    </div>
    <div class="bins">
      <div class="bin s">
        <h4>Structured · fits rows and columns</h4>
        <TransitionGroup name="card" tag="div" class="list"><div v-for="it in bin(true)" :key="it.i" class="chip" :class="{ wrong: it.chosen !== true }">{{ it.label }}</div></TransitionGroup>
      </div>
      <div class="bin u">
        <h4>Unstructured · raw format, harder to process</h4>
        <TransitionGroup name="card" tag="div" class="list"><div v-for="it in bin(false)" :key="it.i" class="chip" :class="{ wrong: it.chosen !== false }">{{ it.label }}</div></TransitionGroup>
      </div>
      <p class="note">Some methods (for example deep learning) can consume unstructured data directly, but most machine-learning methods rely on structured data. DS4A p. 366</p>
    </div>
  </div>
</template>

<style scoped>
.ing { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; width: 100%; align-items: start; }
h3 { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; margin-bottom: 10px; }
.queue { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; min-height: 40px; }
.item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 12px; background: rgba(var(--c-surface), .75); border: 1px solid rgba(var(--c-dim), .2); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); animation: slide .5s ease both; }
@keyframes slide { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: none; } }
.btns { display: flex; gap: 6px; }
.btns button { width: 34px; height: 30px; border-radius: 8px; font: 700 max(14px, var(--up-14, 14px)) 'Space Grotesk'; color: rgb(var(--c-dim)); border: 1px solid rgba(var(--c-dim), .3); }
.btns button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); border-color: rgb(var(--c-data)); }
.btn { margin-top: 12px; padding: 10px 18px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.score { margin-top: 8px; font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
.bins { display: flex; flex-direction: column; gap: 14px; }
.bin { padding: 14px 16px; border-radius: 16px; min-height: 120px; background: rgba(var(--c-surface), .6); border: 2px dashed; }
.bin.s { border-color: rgba(var(--c-data), .5); } .bin.u { border-color: rgba(var(--c-feature), .5); }
h4 { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); margin-bottom: 8px; }
.list { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 999px; font-size: max(14px, var(--up-14, 14px)); background: rgba(var(--c-data), .12); border: 1px solid rgba(var(--c-data), .4); }
.bin.u .chip { background: rgba(var(--c-feature), .14); border-color: rgba(var(--c-feature), .5); }
.chip.wrong { box-shadow: 0 0 0 2px rgb(var(--c-warn)); }
.note { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-faint)); }
.card-move, .card-enter-active, .card-leave-active { transition: all .6s ease; }
.card-enter-from, .card-leave-to { opacity: 0; transform: translateY(10px); }
.card-leave-active { position: absolute; }
@media (prefers-reduced-motion: reduce) { .item { animation: none; } .card-move, .card-enter-active, .card-leave-active { transition: none; } }
</style>
