<script setup lang="ts">
/**
 * DS4A pp. 376–377 and Fig. 8.13: the trade-off between interpretability and complexity. Only the three methods the
 * text names are placed, qualitatively (Fig. 8.13 is adapted from James et al., ISLR). → reveals the methods.
 */
import { ref } from 'vue'
import { DEFS, TRADEOFF } from './content'

const shown = ref(0)
function advance(): boolean { if (shown.value < TRADEOFF.length) { shown.value++; return true } return false }
defineExpose({ advance })
const x = (c: number) => 80 + c * 480
const y = (i: number) => 300 - i * 260
</script>

<template>
  <div class="ic" data-testid="m-interp">
    <div class="text">
      <dl>
        <dt>Interpretability</dt><dd>{{ DEFS.interpretability }}</dd>
        <dt>Complexity</dt><dd>{{ DEFS.complexity }}</dd>
      </dl>
      <p class="key">Usually a trade-off: the more complex a model, the less interpretable it often becomes. Inference needs interpretable models; when only predictive performance matters, a complex model may be fine.</p>
      <p class="src">DS4A pp. 376–377 · Fig. 8.13 after James et al. (ISLR) · positions are qualitative</p>
    </div>
    <svg viewBox="0 0 620 360" class="chart" role="img" aria-label="Interpretability versus complexity of methods">
      <line x1="80" x2="580" y1="300" y2="300" class="axis" /><line x1="80" x2="80" y1="30" y2="300" class="axis" />
      <text x="330" y="336" text-anchor="middle" class="al">complexity (flexibility) →</text>
      <text x="40" y="165" text-anchor="middle" class="al" transform="rotate(-90 40 165)">interpretability →</text>
      <path d="M 110 60 Q 300 120 560 285" class="trend" />
      <g v-for="(m, i) in TRADEOFF" :key="m.name" :opacity="i < shown ? 1 : 0" class="m">
        <circle :cx="x(m.complexity)" :cy="y(m.interp)" r="10" />
        <text :x="m.complexity > 0.7 ? x(m.complexity) - 16 : x(m.complexity) + 16" :y="y(m.interp) + (m.complexity > 0.7 ? -16 : 5)" :text-anchor="m.complexity > 0.7 ? 'end' : 'start'" class="ml">{{ m.name }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.ic { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3vw; align-items: center; width: 100%; }
dl { display: grid; gap: 6px 0; }
dt { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-data)); margin-top: 8px; }
dd { margin: 0; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); line-height: 1.45; color: rgb(var(--c-text)); }
.key { margin-top: 18px; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-human)); line-height: 1.5; }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); }
.chart { width: 100%; height: auto; max-height: 54vh; }
.axis { stroke: rgba(var(--c-dim), .5); }
.al { fill: rgb(var(--c-data-soft)); font: 600 14px 'Space Grotesk', system-ui; }
.trend { fill: none; stroke: rgba(var(--c-human), .35); stroke-width: 2; stroke-dasharray: 6 6; }
.m { transition: opacity .6s; }
.m circle { fill: rgb(var(--c-feature)); }
.ml { fill: rgb(var(--c-text)); font: 600 max(16px, var(--up-16, 16px)) 'Inter', system-ui; }
</style>
