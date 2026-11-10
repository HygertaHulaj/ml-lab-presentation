<script setup lang="ts">
/**
 * DS4A p. 365: "A model is like a recipe." Ingredients (data) → recipe (model) → mix & bake (analysis) → cookies
 * (outcome). The second half of the animation relabels every station with its machine-learning meaning.
 * "Try another recipe" changes the model, and so the outcome. Labelled as an analogy (no data is computed here).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Pause, Play, RotateCcw } from 'lucide-vue-next'
import { useProgress } from '../../../visualizations/shared/useProgress'
import { RECIPE } from './content'

const props = defineProps<{ reduced: boolean }>()
const { prog, playing, play, toggle, seek, finish } = useProgress(9, () => props.reduced)
const recipe = ref<'A' | 'B'>('A')
onMounted(() => play(0))
watch(recipe, () => play(0))

const ST = [140, 380, 620, 860]
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
/** token k travels station 0 → 3 during p ∈ [0.05, 0.6] */
function tok(k: number) {
  const l = clamp((prog.p - 0.05 - k * 0.04) / 0.45)
  const seg = Math.min(2.999, l * 3), i = Math.floor(seg), f = ease(seg - i)
  return { x: ST[i] + (ST[i + 1] - ST[i]) * f + (k - 2) * 10, y: 250 - Math.sin(f * Math.PI) * 40 + (k % 2) * 8, o: l > 0 && l < 1 ? 1 : 0 }
}
const baked = computed(() => clamp((prog.p - 0.55) / 0.1))
const mlLabels = computed(() => clamp((prog.p - 0.68) / 0.12))
const cookie = computed(() => (recipe.value === 'A' ? { fill: '#c98a4b', chips: '#4a2c17', label: 'soft and chewy' } : { fill: '#e2b56f', chips: '#7a4b22', label: 'thin and crisp' }))
function advance(): boolean { return finish() }
defineExpose({ advance })
</script>

<template>
  <div class="ra" data-testid="m-recipe">
    <svg viewBox="0 0 1000 420" class="scene" role="img" aria-label="Cookie factory analogy: ingredients, recipe, baking, cookies">
      <line x1="80" x2="920" y1="300" y2="300" class="belt" />
      <!-- stations -->
      <g v-for="(s, i) in RECIPE.pairs" :key="s.cookie" :transform="`translate(${ST[i]} 0)`">
        <rect x="-86" y="150" width="172" height="150" rx="18" class="station" :class="{ ml: mlLabels > 0.5 }" />
        <!-- icons -->
        <g v-if="i === 0"><ellipse cx="0" cy="250" rx="52" ry="18" class="bowl" /><circle cx="-18" cy="236" r="9" style="fill: #f2e6c9" /><circle cx="6" cy="232" r="8" style="fill: #f6c14a" /><rect x="16" y="222" width="18" height="18" rx="3" style="fill: rgb(var(--c-text))" /></g>
        <g v-else-if="i === 1"><rect x="-38" y="190" width="76" height="90" rx="6" class="card" /><line v-for="k in 5" :key="k" x1="-26" x2="26" :y1="204 + k * 13" :y2="204 + k * 13" class="ln" /><text x="0" y="203" text-anchor="middle" class="recipe-t">recipe {{ recipe }}</text></g>
        <g v-else-if="i === 2"><rect x="-48" y="196" width="96" height="80" rx="10" class="oven" /><rect x="-36" y="212" width="72" height="44" rx="6" :class="['ovenwin', { hot: prog.p > 0.35 && prog.p < 0.7 }]" /></g>
        <g v-else :opacity="baked"><circle v-for="k in 3" :key="k" :cx="-44 + k * 30" cy="246" r="20" :style="{ fill: cookie.fill }" /><circle v-for="k in 3" :key="'c' + k" :cx="-46 + k * 30" cy="242" r="3" :style="{ fill: cookie.chips }" /></g>
        <text x="0" y="132" text-anchor="middle" class="lab-c" :opacity="1 - mlLabels">{{ s.cookie }}</text>
        <text x="0" y="132" text-anchor="middle" class="lab-m" :opacity="mlLabels">{{ s.ml }}</text>
      </g>
      <g v-for="i in 3" :key="'a' + i"><path :d="`M ${ST[i - 1] + 96} 225 L ${ST[i] - 96} 225`" class="arrow" /></g>
      <circle v-for="k in 5" :key="'t' + k" :cx="tok(k - 1).x" :cy="tok(k - 1).y" r="7" :opacity="tok(k - 1).o" class="tokn" />
      <text x="860" y="350" text-anchor="middle" class="out" :opacity="baked">{{ cookie.label }}</text>
      <text x="500" y="400" text-anchor="middle" class="note" :opacity="mlLabels">Data → model → analysis → prediction. A different model (recipe) gives a different outcome from the same data.</text>
    </svg>
    <div class="bar">
      <button class="ctl" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
      <button class="ctl" aria-label="Replay" @click="play(0)"><RotateCcw class="ic" /></button>
      <input type="range" min="0" max="1" step="0.001" :value="prog.p" aria-label="Animation position" class="scrub" data-testid="recipe-scrub" @input="seek(+($event.target as HTMLInputElement).value)" />
      <button class="btn" data-testid="swap-recipe" @click="recipe = recipe === 'A' ? 'B' : 'A'">Try recipe {{ recipe === 'A' ? 'B' : 'A' }}</button>
      <span class="src">Analogy, DS4A p. 365 · illustrative, not computed</span>
    </div>
  </div>
</template>

<style scoped>
.ra { width: 100%; }
.scene { width: 100%; height: auto; max-height: 52vh; }
.belt { stroke: rgba(var(--c-dim), .35); stroke-width: 6; stroke-linecap: round; }
.station { fill: rgba(var(--c-surface), .85); stroke: rgba(var(--c-human), .5); stroke-width: 2; transition: stroke .5s; }
.station.ml { stroke: rgb(var(--c-data)); }
.bowl { fill: rgba(var(--c-text), .15); stroke: rgb(var(--c-soft)); stroke-width: 2; }
.card { fill: #f4ead6; }
.ln { stroke: rgba(80,60,40,.45); stroke-width: 2; }
.recipe-t { font: 700 12px 'Space Grotesk', system-ui; fill: #5a3c22; }
.oven { fill: #2a3346; stroke: rgb(var(--c-dim)); stroke-width: 2; }
.ovenwin { fill: #1a2030; transition: fill .4s; }
.ovenwin.hot { fill: #f2853a; }
.lab-c { font: 600 22px 'Space Grotesk', system-ui; fill: rgb(var(--c-human)); }
.lab-m { font: 600 22px 'Space Grotesk', system-ui; fill: rgb(var(--c-data)); }
.arrow { stroke: rgba(var(--c-dim), .5); stroke-width: 2; stroke-dasharray: 6 6; }
.tokn { fill: #f6c14a; }
.out { font: 600 18px 'Inter', system-ui; fill: rgb(var(--c-text)); }
.note { font: 500 17px 'Inter', system-ui; fill: rgb(var(--c-data-soft)); }
.bar { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ctl { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: rgba(var(--c-text), .06); color: rgb(var(--c-text)); }
.ic { width: 18px; height: 18px; }
.scrub { width: min(300px, 26vw); accent-color: rgb(var(--c-data)); }
.btn { padding: 9px 16px; border-radius: 999px; background: rgb(var(--c-human)); color: rgb(var(--c-ink)); font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; }
.src { margin-left: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
