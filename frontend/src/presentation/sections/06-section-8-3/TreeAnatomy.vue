<script setup lang="ts">
/** DS4A Fig. 8.5, a generic decision tree. → reveals the parts one at a time: node, split, branches, leaves. */
import { ref } from 'vue'
import { DEFS } from './content'

const PARTS = [
  { k: 'node', t: 'Node', d: 'Holds a group of observations.' },
  { k: 'split', t: 'Split', d: 'A question about one variable.' },
  { k: 'branch', t: 'Branches', d: 'The possible answers to the question.' },
  { k: 'leaf', t: 'Leaves', d: 'The predicted value of the response variable.' },
]
const shown = ref(1)
function advance(): boolean { if (shown.value < PARTS.length) { shown.value++; return true } return false }
defineExpose({ advance })
const on = (k: string) => PARTS.slice(0, shown.value).some((p) => p.k === k)
const cur = (k: string) => PARTS[shown.value - 1].k === k
</script>

<template>
  <div class="ta" data-testid="m-anatomy">
    <div class="text">
      <p class="def">{{ DEFS.tree }}</p>
      <ol class="parts">
        <li v-for="(p, i) in PARTS" :key="p.k" :class="{ on: i < shown, cur: i === shown - 1 }"><strong>{{ p.t }}</strong> {{ p.d }}</li>
      </ol>
      <p class="src">DS4A p. 368, Fig. 8.5 (generic example)</p>
    </div>
    <svg viewBox="0 0 640 420" class="art" role="img" aria-label="Parts of a decision tree">
      <g :class="['grp', { on: on('branch'), cur: cur('branch') }]">
        <path d="M320 92 L170 210" class="br" /><path d="M320 92 L470 210" class="br" />
        <path d="M470 252 L390 350" class="br" /><path d="M470 252 L560 350" class="br" />
        <text x="222" y="146" class="bl">yes</text><text x="402" y="146" class="bl">no</text><text x="408" y="306" class="bl">yes</text><text x="526" y="306" class="bl">no</text>
      </g>
      <g :class="['grp', { on: on('node'), cur: cur('node') }]">
        <rect x="230" y="40" width="180" height="54" rx="14" class="nd" /><text x="320" y="73" text-anchor="middle" class="nt">all observations</text>
      </g>
      <g :class="['grp', { on: on('split'), cur: cur('split') }]">
        <text x="430" y="70" class="q">Is x₁ ≤ a?</text>
        <rect x="380" y="210" width="180" height="44" rx="12" class="nd" /><text x="470" y="238" text-anchor="middle" class="nt">Is x₂ = B?</text>
      </g>
      <g :class="['grp', { on: on('leaf'), cur: cur('leaf') }]">
        <rect x="100" y="210" width="140" height="48" rx="12" class="lf" /><text x="170" y="240" text-anchor="middle" class="lt">predict A</text>
        <rect x="320" y="350" width="140" height="48" rx="12" class="lf" /><text x="390" y="380" text-anchor="middle" class="lt">predict B</text>
        <rect x="490" y="350" width="140" height="48" rx="12" class="lf" /><text x="560" y="380" text-anchor="middle" class="lt">predict C</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.ta { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3vw; align-items: center; width: 100%; }
.def { font-size: clamp(16px, 1.3vw, 22px); line-height: 1.5; color: rgb(var(--c-text)); }
.parts { margin-top: 18px; display: grid; gap: 10px; list-style: none; padding: 0; }
.parts li { padding: 10px 14px; border-radius: 12px; background: rgba(var(--c-surface), .6); color: rgb(var(--c-faint)); font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); transition: color .4s, border-color .4s; border-left: 3px solid transparent; }
.parts li.on { color: rgb(var(--c-soft)); } .parts li.cur { border-left-color: rgb(var(--c-human)); color: rgb(var(--c-text)); }
.parts strong { color: inherit; margin-right: 6px; font-family: 'Space Grotesk', system-ui; }
.src { margin-top: 12px; font-size: 12px; color: rgb(var(--c-faint)); }
.art { width: 100%; height: auto; max-height: 56vh; }
.grp { opacity: .08; transition: opacity .6s; } .grp.on { opacity: 1; }
.br { stroke: rgb(var(--c-dim)); stroke-width: 2.5; fill: none; } .grp.cur .br { stroke: rgb(var(--c-human)); stroke-width: 4; }
.bl { fill: rgb(var(--c-dim)); font: 600 14px 'Inter', system-ui; }
.nd { fill: rgba(var(--c-surface), .96); stroke: rgb(var(--c-text)); stroke-width: 1.6; } .grp.cur .nd { stroke: rgb(var(--c-human)); stroke-width: 3; }
.nt { fill: rgb(var(--c-text)); font: 600 16px 'Space Grotesk', system-ui; }
.q { fill: rgb(var(--c-human)); font: 600 17px 'JetBrains Mono', Consolas, monospace; }
.lf { fill: rgba(var(--c-ok), .12); stroke: rgb(var(--c-ok)); stroke-width: 2; } .grp.cur .lf { stroke-width: 3.5; }
.lt { fill: rgb(var(--c-ok)); font: 600 16px 'Space Grotesk', system-ui; }
</style>
