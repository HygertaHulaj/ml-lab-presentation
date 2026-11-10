<script setup lang="ts">
/**
 * DS4A p. 365: supervised vs unsupervised learning. The same 150 real Iris flowers:
 * supervised = the response variable (species) is known and shown; unsupervised = no labels, groups are discovered
 * by the real K-Means trace from the backend (POST /simulations/kmeans). Then: sort six problems into the two kinds.
 */
import { CLUSTER_TOKENS, SPECIES_TOKEN } from '../../theme'
import { computed, onMounted, ref } from 'vue'
import { lessonsApi, type IrisDataset } from '../../../api/lessons'
import { errorMessage } from '../../../api/client'
import { DEFS, PROBLEMS } from './content'

const iris = ref<IrisDataset | null>(null)
const clusters = ref<number[] | null>(null)
const mode = ref<'supervised' | 'unsupervised'>('supervised')
const grouped = ref(false)
const error = ref<string | null>(null)
const answers = ref<Record<number, boolean | undefined>>({})
const checked = ref(false)

onMounted(async () => {
  try {
    const [d, sim] = await Promise.all([lessonsApi.iris(), lessonsApi.kmeans({ features: ['petal_length_cm', 'petal_width_cm'], k: 3, init: 'k-means++', seed: 7 })])
    iris.value = d
    clusters.value = sim.trace.final_labels
  } catch (e) { error.value = errorMessage(e) }
})

const PL = 2, PW = 3
const sx = (v: number) => 50 + ((v - 1) / 6) * 520
const sy = (v: number) => 330 - (v / 2.6) * 290
const SPECIES: Record<string, string> = Object.fromEntries(Object.entries(SPECIES_TOKEN).map(([k, t]) => [k, `rgb(var(--c-${t}))`]))
const CLUSTER = CLUSTER_TOKENS.map((t) => `rgb(var(--c-${t}))`) // never a species hue: a cluster is not a species
const points = computed(() => (iris.value ? iris.value.observations.map((o, i) => ({ x: sx(o[PL]), y: sy(o[PW]), species: iris.value!.comparison_labels[i], c: clusters.value?.[i] ?? 0 })) : []))
const fill = (p: { species: string; c: number }) => (mode.value === 'supervised' ? SPECIES[p.species] : grouped.value ? CLUSTER[p.c] : 'rgb(var(--c-faint))')

function setMode(m: 'supervised' | 'unsupervised') { mode.value = m; grouped.value = false }
function answer(i: number, v: boolean) { if (!checked.value) answers.value = { ...answers.value, [i]: v } }
const score = computed(() => PROBLEMS.filter((p, i) => answers.value[i] === p.supervised).length)

/** → : reveal groups, then go to the exercise check */
function advance(): boolean {
  if (mode.value === 'supervised') { setMode('unsupervised'); return true }
  if (!grouped.value) { grouped.value = true; return true }
  if (!checked.value && Object.keys(answers.value).length > 0) { checked.value = true; return true }
  return false
}
defineExpose({ advance })
</script>

<template>
  <div class="su" data-testid="m-supervised">
    <div class="left">
      <div class="toggle" role="tablist">
        <button role="tab" :aria-selected="mode === 'supervised'" :class="{ on: mode === 'supervised' }" data-testid="mode-supervised" @click="setMode('supervised')">Supervised</button>
        <button role="tab" :aria-selected="mode === 'unsupervised'" :class="{ on: mode === 'unsupervised' }" data-testid="mode-unsupervised" @click="setMode('unsupervised')">Unsupervised</button>
      </div>
      <p class="def" data-testid="su-definition">{{ mode === 'supervised' ? DEFS.supervised : DEFS.unsupervised }}</p>
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <svg v-else viewBox="0 0 600 370" class="plot" role="img" aria-label="Iris flowers by petal length and width">
        <line x1="50" x2="570" y1="330" y2="330" class="axis" /><line x1="50" x2="50" y1="30" y2="330" class="axis" />
        <text x="310" y="362" text-anchor="middle" class="al">petal length (cm)</text>
        <text x="16" y="180" text-anchor="middle" class="al" transform="rotate(-90 16 180)">petal width (cm)</text>
        <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="5.5" class="pt" :style="{ fill: fill(p) }" />
        <g v-if="mode === 'supervised'" class="leg"><circle cx="70" cy="40" r="6" style="fill: rgb(var(--c-data))" /><text x="82" y="45">setosa</text><circle cx="160" cy="40" r="6" style="fill: rgb(var(--c-ok))" /><text x="172" y="45">versicolor</text><circle cx="262" cy="40" r="6" style="fill: rgb(var(--c-feature))" /><text x="274" y="45">virginica</text></g>
      </svg>
      <p class="cap" data-testid="su-caption">
        <template v-if="mode === 'supervised'">The response variable, <b>species</b>, is known for every flower. A model learns to predict it for new flowers.</template>
        <template v-else-if="!grouped">No response variable. Same flowers, no labels. <button class="link" data-testid="find-groups" @click="grouped = true">Find groups →</button></template>
        <template v-else>K-Means (computed by the backend) found 3 groups using only the measurements. Groups are patterns, <b>not</b> species names.</template>
      </p>
    </div>
    <div class="right">
      <h3>Which kind of problem is it?</h3>
      <div v-for="(p, i) in PROBLEMS" :key="i" class="prob" :class="{ right: checked && answers[i] === p.supervised, wrong: checked && answers[i] !== p.supervised }">
        <span class="pt-text">{{ p.text }}</span>
        <span class="btns">
          <button :class="{ on: answers[i] === true }" :data-testid="'prob-' + i + '-s'" @click="answer(i, true)">S</button>
          <button :class="{ on: answers[i] === false }" :data-testid="'prob-' + i + '-u'" @click="answer(i, false)">U</button>
        </span>
        <small v-if="checked">{{ p.supervised ? 'Supervised' : 'Unsupervised' }}: {{ p.why }}</small>
      </div>
      <div class="bar">
        <button v-if="!checked" class="btn" data-testid="prob-check" @click="checked = true">Check</button>
        <span v-else class="score" data-testid="prob-score">{{ score }} / {{ PROBLEMS.length }} correct</span>
        <button v-if="checked" class="btn ghost" @click="checked = false; answers = {}">Try again</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.su { display: grid; grid-template-columns: 1.15fr 1fr; gap: 3vw; width: 100%; align-items: start; }
.toggle { display: inline-flex; padding: 4px; border-radius: 12px; background: rgba(var(--c-text), .06); }
.toggle button { padding: 8px 18px; border-radius: 9px; font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); }
.toggle button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); }
.def { margin: 12px 0 6px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.45; min-height: 3em; }
.plot { width: 100%; height: auto; max-height: 46vh; }
.axis { stroke: rgba(var(--c-dim), .5); }
.al { fill: rgb(var(--c-data-soft)); font: 600 14px 'Space Grotesk', system-ui; }
.pt { transition: fill .8s ease; }
.leg text { fill: rgb(var(--c-soft)); font: 500 13px 'Inter', system-ui; }
.cap { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.cap b { color: rgb(var(--c-human)); }
.link { color: rgb(var(--c-data)); text-decoration: underline; font-weight: 600; }
h3 { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; margin-bottom: 10px; }
.prob { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; padding: 10px 14px; margin-bottom: 8px; border-radius: 12px; background: rgba(var(--c-surface), .72); border: 1.5px solid rgba(var(--c-dim), .18); }
.prob.right { border-color: rgb(var(--c-ok)); } .prob.wrong { border-color: rgb(var(--c-warn)); }
.pt-text { font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-text)); }
.btns { display: flex; gap: 6px; }
.btns button { width: 34px; height: 30px; border-radius: 8px; font: 700 max(14px, var(--up-14, 14px)) 'Space Grotesk'; color: rgb(var(--c-dim)); border: 1px solid rgba(var(--c-dim), .3); }
.btns button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); border-color: rgb(var(--c-data)); }
.prob small { grid-column: 1 / -1; color: rgb(var(--c-dim)); font-size: max(13px, var(--up-13, 13px)); }
.bar { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
.btn { padding: 9px 18px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.score { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
.err { color: rgb(var(--c-human)); }
</style>
