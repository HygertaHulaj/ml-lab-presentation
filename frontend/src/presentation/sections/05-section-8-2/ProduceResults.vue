<script setup lang="ts">
/**
 * DS4A p. 367, Step 3: producing model-based results. New observations enter the fitted model (from Step 2) and
 * leave as predictions (computed by the backend). Results are then delivered to people (an email, a dashboard,
 * Fig. 8.4) or turned into automated actions (recommendations, ordering supplies, scheduling follow-ups).
 */
import { computed, onMounted, ref } from 'vue'
import { useProgress } from '../../../visualizations/shared/useProgress'
import type { AnalyzeProduce } from '../../api'

const props = defineProps<{ data: AnalyzeProduce; reduced: boolean }>()
const { prog, play, finish } = useProgress(5, () => props.reduced)
const mode = ref<'inform' | 'act'>('inform')
onMounted(() => play(0))
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const pose = (k: number) => {
  const l = clamp((prog.p - 0.08 - k * 0.18) / 0.4)
  const x = l < 0.5 ? 120 + (l / 0.5) * 300 : 580 + ((l - 0.5) / 0.5) * 300
  return { x, out: l >= 0.5, o: l > 0.47 && l < 0.53 ? 0 : 1, done: l >= 1 }
}
const shown = computed(() => props.data.new_data.map((d, k) => ({ ...d, pose: pose(k) })))
function advance(): boolean {
  if (finish()) return true
  if (mode.value === 'inform') { mode.value = 'act'; return true }
  return false
}
defineExpose({ advance })
</script>

<template>
  <div class="pr" data-testid="m-produce">
    <svg viewBox="0 0 1000 300" class="flow" role="img" aria-label="New data enters the fitted model and leaves as predictions">
      <text x="120" y="40" text-anchor="middle" class="lab">NEW DATA</text>
      <text x="880" y="40" text-anchor="middle" class="lab">PREDICTIONS</text>
      <rect x="420" y="70" width="160" height="150" rx="20" class="model" />
      <text x="500" y="112" text-anchor="middle" class="mt">FITTED MODEL</text>
      <text x="500" y="150" text-anchor="middle" class="mf">ŷ = {{ data.final.b.toFixed(2) }}</text>
      <text x="500" y="176" text-anchor="middle" class="mf">+ {{ data.final.w.toFixed(3) }}x</text>
      <line x1="190" x2="410" y1="145" y2="145" class="guide" /><line x1="590" x2="810" y1="145" y2="145" class="guide" />
      <g v-for="(d, k) in shown" :key="d.x" :transform="`translate(${d.pose.x} ${d.pose.done ? 80 + k * 66 : 145})`" :opacity="d.pose.o" class="tok">
        <rect x="-68" y="-20" width="136" height="40" rx="20" :class="d.pose.out ? 'out' : 'in'" />
        <text y="6" text-anchor="middle" :data-testid="d.pose.done ? 'pred-' + k : undefined">{{ d.pose.out ? `ŷ = ${d.prediction}` : `x = ${d.x}` }}</text>
      </g>
    </svg>
    <div class="deliver">
      <div class="toggle"><button :class="{ on: mode === 'inform' }" data-testid="mode-inform" @click="mode = 'inform'">Inform people</button><button :class="{ on: mode === 'act' }" data-testid="mode-act" @click="mode = 'act'">Automate actions</button></div>
      <div v-if="mode === 'inform'" class="cards">
        <div class="card"><strong>Email to an analyst</strong><span>Daily summary with a cluster graph</span></div>
        <div class="card"><strong>Dashboard</strong><span>Results for doctors, insurers and patients (Fig. 8.4)</span></div>
        <div class="card"><strong>RadiologyML → Dr. Salizar</strong><span>The day's results, so she can decide about each patient</span></div>
      </div>
      <div v-else class="cards" data-testid="act-cards">
        <div class="card act"><strong>Recommendations</strong><span>Movie suggestions for every subscriber</span></div>
        <div class="card act"><strong>Order supplies</strong><span>Medical supplies ordered automatically</span></div>
        <div class="card act"><strong>Schedule follow-ups</strong><span>Appointments booked for patients</span></div>
      </div>
      <p class="src">DS4A p. 367 · predictions computed by the backend from the model fitted in Step 2 ({{ data.source }})</p>
    </div>
  </div>
</template>

<style scoped>
.pr { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.flow { width: 100%; height: auto; max-height: 34vh; }
.lab { fill: rgb(var(--c-faint)); font: 600 14px 'Space Grotesk', system-ui; letter-spacing: .2em; }
.model { fill: rgba(var(--c-surface), .9); stroke: rgb(var(--c-ok)); stroke-width: 2; }
.mt { fill: rgb(var(--c-ok)); font: 600 14px 'Space Grotesk', system-ui; letter-spacing: .16em; }
.mf { fill: rgb(var(--c-text)); font: 500 17px 'JetBrains Mono', Consolas, monospace; }
.guide { stroke: rgba(var(--c-data), .3); stroke-width: 2; stroke-dasharray: 5 6; }
.tok rect.in { fill: rgba(var(--c-surface), .95); stroke: rgb(var(--c-dim)); }
.tok rect.out { fill: rgba(var(--c-ok), .16); stroke: rgb(var(--c-ok)); }
.tok text { fill: rgb(var(--c-text)); font: 500 16px 'JetBrains Mono', Consolas, monospace; }
.toggle { display: inline-flex; padding: 4px; border-radius: 12px; background: rgba(var(--c-text), .06); }
.toggle button { padding: 8px 18px; border-radius: 9px; font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); }
.toggle button.on { background: rgb(var(--c-ok)); color: rgb(var(--c-ink)); }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 12px; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border-radius: 14px; background: rgba(var(--c-surface), .75); border-left: 3px solid rgb(var(--c-data)); animation: rise .5s ease both; }
.card.act { border-left-color: rgb(var(--c-human)); }
.card strong { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; }
.card span { color: rgb(var(--c-soft)); font-size: max(15px, var(--up-15, 15px)); }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
@media (prefers-reduced-motion: reduce) { .card { animation: none; } }
</style>
