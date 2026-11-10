<script setup lang="ts">
/**
 * DS4A p. 366: RadiologyML as a tool produced by machine learning. The radiologists' judgments are compared with
 * the system's, and patterns many radiologists confirm are learned. Shown together with the responsible version
 * used in the film: corrections are reviewed and validated before a new model version is used.
 * → reveals the loop one stage at a time; click a stage to read it.
 */
import { computed, ref } from 'vue'

const STAGES = [
  { t: 'Model flags a scan', d: 'RadiologyML (fictional) marks a pattern that resembles past findings.' },
  { t: 'Radiologist judges', d: 'Dr. Salizar confirms or corrects it. Her judgment is the label: the response variable.' },
  { t: 'Compared', d: 'Human and model judgments are compared across hundreds of radiologists.' },
  { t: 'Reviewed dataset', d: 'Confirmed patterns and corrections are collected and checked.' },
  { t: 'Retrain offline', d: 'A new model version is trained on the reviewed examples.' },
  { t: 'Validate, then use', d: 'Only a version that tests better on unseen scans replaces the old one.' },
]
const shown = ref(1)
const active = ref(0)
const pos = computed(() => STAGES.map((_, i) => { const a = -Math.PI / 2 + (i / STAGES.length) * Math.PI * 2; return { x: 300 + Math.cos(a) * 220, y: 230 + Math.sin(a) * 170 } }))
function advance(): boolean { if (shown.value < STAGES.length) { shown.value++; active.value = shown.value - 1; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="rl" data-testid="m-radiology">
    <div class="text">
      <blockquote>"…if many human radiologists identify a brain pattern indicating a potential tumor, RadiologyML will learn that pattern for future assessments."<cite>DS4A p. 366</cite></blockquote>
      <p class="key">That is <b>supervised learning</b>: the radiologists' judgments are the reference outputs the model learns from.</p>
      <div class="detail" data-testid="radiology-detail"><strong>{{ STAGES[active].t }}</strong><span>{{ STAGES[active].d }}</span></div>
      <p class="note">In a real hospital the learning step is controlled: corrections are reviewed, the model is retrained offline and validated before use. The deployed model does not change itself.</p>
    </div>
    <svg viewBox="0 0 600 460" class="loop" role="img" aria-label="Learning loop from radiologist feedback">
      <g v-for="i in STAGES.length" :key="'e' + i" :opacity="i < shown ? 1 : 0.12">
        <line :x1="pos[i - 1].x" :y1="pos[i - 1].y" :x2="pos[i % STAGES.length].x" :y2="pos[i % STAGES.length].y" class="edge" />
      </g>
      <g v-for="(s, i) in STAGES" :key="s.t" :transform="`translate(${pos[i].x} ${pos[i].y})`" :opacity="i < shown ? 1 : 0.18" class="node" :class="{ on: i === active }" :data-testid="'loop-' + i" @click="i < shown && (active = i)">
        <circle r="40" />
        <text y="6" text-anchor="middle" class="n">{{ i + 1 }}</text>
        <text :y="62" text-anchor="middle" class="t">{{ s.t }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.rl { display: grid; grid-template-columns: 1fr 1.1fr; gap: 3vw; align-items: center; width: 100%; }
blockquote { font: 400 clamp(17px, 1.45vw, 24px) / 1.5 'Inter', system-ui; font-style: italic; color: rgb(var(--c-text)); border-left: 3px solid rgb(var(--c-human)); padding-left: 18px; }
cite { display: block; margin-top: 8px; font-style: normal; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-faint)); }
.key { margin-top: 18px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-soft)); }
.key b { color: rgb(var(--c-data)); }
.detail { margin-top: 18px; padding: 14px 16px; border-radius: 14px; background: rgba(var(--c-surface), .75); border: 1px solid rgba(var(--c-data), .2); display: flex; flex-direction: column; gap: 4px; }
.detail strong { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-human)); }
.detail span { color: rgb(var(--c-text)); font-size: max(15px, var(--up-15, 15px)); }
.note { margin-top: 14px; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-faint)); line-height: 1.5; }
.loop { width: 100%; height: auto; max-height: 56vh; }
.edge { stroke: rgb(var(--c-data)); stroke-width: 2; stroke-dasharray: 6 6; }
.node { cursor: pointer; transition: opacity .5s; }
.node circle { fill: rgba(var(--c-surface), .95); stroke: rgb(var(--c-data)); stroke-width: 2; }
.node.on circle { stroke: rgb(var(--c-human)); stroke-width: 3; }
.n { fill: rgb(var(--c-data)); font: 600 22px 'Space Grotesk', system-ui; }
.t { fill: rgb(var(--c-text)); font: 600 15px 'Inter', system-ui; }
</style>
