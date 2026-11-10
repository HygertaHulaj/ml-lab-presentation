<script setup lang="ts">
/**
 * Shared visual for sorting activities (AI or not, the three ML steps, regression or classification): cards wait in
 * a pool, the bins appear, then during the "sort" scene each caption line takes one card: it lights up while the
 * narrator thinks (first part of the line) and lands in its bin (the rest). A pure function of (scene, line, lp).
 */
import { computed } from 'vue'

export interface SortItem { label: string; bin: string; why?: string }
export interface SortBin { k: string; tone: string; sub?: string }
const props = defineProps<{ items: SortItem[]; bins: SortBin[]; scene: string; line: number; lp: number; sortScene?: string; introScenes?: string[] }>()

const sortId = computed(() => props.sortScene ?? 'sort')
const before = computed(() => (props.introScenes ?? ['intro']).includes(props.scene))
/** how many cards are placed, and which one is being decided */
const placed = computed(() => {
  if (before.value || props.scene === 'bins') return 0
  if (props.scene !== sortId.value) return props.items.length
  return props.line + (props.lp >= 0.45 ? 1 : 0)
})
const deciding = computed(() => (props.scene === sortId.value && props.lp < 0.45 ? props.line : -1))
const showBins = computed(() => !before.value)
const inBin = (k: string) => props.items.map((it, i) => ({ ...it, i })).filter((it) => it.bin === k && it.i < placed.value)
const toneOf = (k: string) => props.bins.find((b) => b.k === k)?.tone ?? 'accent'
</script>

<template>
  <div class="sb" data-testid="v-sort">
    <div class="pool">
      <div v-for="(it, i) in items" :key="it.label" class="card" :class="{ gone: i < placed, think: i === deciding }" :data-testid="`sort-card-${i}`">
        <span>{{ it.label }}</span><b v-if="i === deciding">?</b>
      </div>
    </div>
    <div class="bins" :class="{ hide: !showBins }" :style="{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }">
      <div v-for="b in bins" :key="b.k" class="bin" :style="{ borderColor: `rgb(var(--c-${b.tone}))` }" :data-testid="`sort-bin-${b.k.replace(/\W+/g, '').toLowerCase()}`">
        <header><strong :style="{ color: `rgb(var(--c-${b.tone}))` }">{{ b.k }}</strong><small v-if="b.sub">{{ b.sub }}</small><em>{{ inBin(b.k).length }}</em></header>
        <div class="stack">
          <div v-for="it in inBin(b.k)" :key="it.label" class="placed" :class="{ fresh: it.i === placed - 1 && scene === sortId }" :style="{ borderColor: `rgb(var(--c-${toneOf(b.k)}))` }">{{ it.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sb { display: grid; gap: 18px; width: 100%; max-width: 1500px; margin: 0 auto; }
.pool { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; min-height: 52px; }
.card { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; background: rgba(var(--c-surface), .85); border: 1.5px solid rgba(var(--c-dim), .3); font-size: clamp(14px, 1.05vw, 17px); transition: opacity .45s, transform .45s, border-color .3s; }
.card.gone { opacity: 0; transform: translateY(30px) scale(.9); pointer-events: none; position: absolute; visibility: hidden; }
.card.think { border-color: rgb(var(--c-accent)); transform: scale(1.06); box-shadow: 0 0 0 4px rgba(var(--c-accent), .15); }
.card b { color: rgb(var(--c-accent)); }
.bins { display: grid; gap: 14px; transition: opacity .5s; }
.bins.hide { opacity: 0; }
.bin { min-height: 180px; padding: 12px 14px; border-radius: 16px; background: rgba(var(--c-surface), .55); border: 2px dashed; }
.bin header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.bin strong { font: 600 clamp(16px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.bin small { font-size: 13px; color: rgb(var(--c-dim)); }
.bin em { margin-left: auto; font: 700 22px 'Space Grotesk', system-ui; font-style: normal; color: rgb(var(--c-strong)); }
.stack { display: flex; flex-wrap: wrap; gap: 6px; }
.placed { padding: 6px 12px; border-radius: 10px; background: rgba(var(--c-surface), .95); border-left: 3px solid; font-size: 14px; }
.placed.fresh { animation: land .5s ease both; }
@keyframes land { from { opacity: 0; transform: translateY(-24px) scale(1.1); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .card, .placed.fresh { transition: none; animation: none; } }
</style>
