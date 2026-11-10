<script setup lang="ts">
/**
 * DS4A pp. 381–382: the two kinds of mistakes RadiologyML (the chapter's fictional tool) can make, and the four
 * outcomes TP / FP / TN / FN. Schematic scans only, no real medical images. → reveals one outcome at a time, then the
 * point the book makes: doctors worry more about false negatives, and a person still reviews every result.
 */
import { ref } from 'vue'
import { OUTCOMES } from './content'

const shown = ref(1)
function advance(): boolean { if (shown.value < OUTCOMES.length + 1) { shown.value++; return true } return false }
defineExpose({ advance })
const injured = (t: string) => t === 'there is one'
const flagged = (m: string) => m === 'flags an injury'
</script>

<template>
  <div class="mt" data-testid="m-mistakes">
    <div class="grid">
      <div v-for="(o, i) in OUTCOMES" :key="o.k" class="card" :class="{ on: i < shown }" :style="{ borderColor: `rgb(var(--c-${o.tone}))` }" :data-testid="`mt-${o.k}`">
        <svg viewBox="0 0 120 120" class="scan" aria-hidden="true">
          <rect x="10" y="10" width="100" height="100" rx="16" style="fill: rgba(var(--c-dim), .12); stroke: rgba(var(--c-dim), .5)" />
          <path d="M60 22 C52 40 68 60 58 98" style="fill: none; stroke: rgb(var(--c-soft)); stroke-width: 9; stroke-linecap: round" />
          <path v-if="injured(o.truth)" d="M50 58 L70 54 L56 66" style="fill: none; stroke: rgb(var(--c-warn)); stroke-width: 3" />
          <rect v-if="flagged(o.model)" x="38" y="40" width="44" height="38" rx="6" style="fill: none; stroke: rgb(var(--c-human)); stroke-width: 3; stroke-dasharray: 5 4" />
        </svg>
        <div class="txt">
          <strong :style="{ color: `rgb(var(--c-${o.tone}))` }">{{ o.k }} · {{ o.name }}</strong>
          <span>RadiologyML <b>{{ o.model }}</b>, and {{ o.truth }}.</span>
          <em>{{ o.ok ? 'correct' : 'a mistake' }}</em>
        </div>
      </div>
    </div>
    <div class="side">
      <p class="lead">RadiologyML can make two kinds of mistakes:</p>
      <ol>
        <li><b style="color: rgb(var(--c-human))">False positive</b>: it predicts an injury when there is none.</li>
        <li><b style="color: rgb(var(--c-warn))">False negative</b>: it predicts no injury when there is one.</li>
      </ol>
      <p :class="{ hide: shown <= OUTCOMES.length }" class="point" data-testid="mt-point">Most methods weigh both mistakes equally when they train. Doctors may not: missing an injury (FN) is usually worse than a false alarm (FP), which a radiologist like Dr. Salizar reviews and dismisses.</p>
      <p class="src">RadiologyML is the fictional tool of the chapter story · schematic, not a medical image · DS4A pp. 381–382</p>
    </div>
  </div>
</template>

<style scoped>
.mt { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.card { display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 16px; background: rgba(var(--c-surface), .78); border: 1.5px solid; opacity: .12; transform: translateY(8px); transition: opacity .5s, transform .5s; }
.card.on { opacity: 1; transform: none; }
.scan { width: clamp(70px, 6vw, 104px); flex: none; }
.txt { display: flex; flex-direction: column; gap: 4px; }
.txt strong { font: 600 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.txt span { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-text)); line-height: 1.4; }
.txt em { font-style: normal; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); }
.lead { font: 500 clamp(16px, 1.3vw, 22px) 'Inter', system-ui; color: rgb(var(--c-text)); }
ol { margin: 12px 0 16px 20px; display: grid; gap: 8px; color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); }
.point { padding: 14px 16px; border-radius: 12px; background: rgba(var(--c-warn), .08); border-left: 3px solid rgb(var(--c-warn)); color: rgb(var(--c-text)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.5; transition: opacity .5s; }
.point.hide { opacity: 0; }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style>
