<script setup lang="ts">
/**
 * The mechanism behind biased facial recognition, measured without face data: Chinstrap penguins are made rarer in
 * the training data (the slider); the test set stays fixed. The rare group's error rate rises while the majority's
 * stays at zero, and overall accuracy hides it. Every value is from the backend (mean over 20 random draws).
 */
import { computed, ref } from 'vue'
import type { Ethics } from '../../api'

const props = defineProps<{ data: Ethics }>()
const idx = ref(Math.max(0, props.data.sweep.findIndex((s) => s.n_minority === props.data.mitigation.n_minority)))
const cur = computed(() => props.data.sweep[idx.value])
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
defineExpose({ advance: () => false })

const W = 560, H = 280, L = 50, B = 44, T = 14, R = 16
const n = computed(() => props.data.sweep.length)
const x = (i: number) => L + (i / (n.value - 1)) * (W - L - R)
const y = (v: number) => H - B - v * (H - B - T)
const line = (k: 'minority_error' | 'majority_error') => props.data.sweep.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join('')
const total = computed(() => Object.values(props.data.train_counts).reduce((a, b) => a + b, 0) - props.data.train_counts[props.data.minority])
</script>

<template>
  <div class="rd" data-testid="m-representation">
    <div class="ctrl">
      <label>
        <span>{{ data.minority }} penguins in the training data: <b data-testid="rd-k">{{ cur.n_minority }}</b> <small>({{ pct(cur.share) }} of {{ total + cur.n_minority }})</small></span>
        <input v-model.number="idx" type="range" min="0" :max="data.sweep.length - 1" step="1" data-testid="rd-slider" aria-label="Number of under-represented examples in the training data" />
      </label>
      <div class="stats">
        <div class="s min"><span>error for the under-represented group ({{ data.minority }})</span><b data-testid="rd-min">{{ pct(cur.minority_error) }}</b></div>
        <div class="s maj"><span>error for everyone else (Adelie, Gentoo)</span><b data-testid="rd-maj">{{ pct(cur.majority_error) }}</b></div>
        <div class="s all"><span>overall accuracy, the number usually reported</span><b data-testid="rd-acc">{{ pct(cur.overall_accuracy) }}</b></div>
      </div>
      <p class="key">A model can look excellent overall while failing one group badly.</p>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Error rate for each group against how many examples of the rare group are in the training data">
      <g v-for="t in [0, 0.25, 0.5, 0.75, 1]" :key="t">
        <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" class="grid" /><text :x="L - 6" :y="y(t) + 4" text-anchor="end" class="tick">{{ t * 100 }} %</text>
      </g>
      <text v-for="(s, i) in data.sweep" :key="s.n_minority" :x="x(i)" :y="H - B + 16" text-anchor="middle" class="tick">{{ s.n_minority }}</text>
      <text :x="(L + W) / 2" :y="H - 6" text-anchor="middle" class="ax">{{ data.minority }} examples in the training data</text>
      <line :x1="x(idx)" :x2="x(idx)" :y1="T" :y2="H - B" class="cur" />
      <path :d="line('minority_error')" class="ln" style="stroke: rgb(var(--c-warn))" />
      <path :d="line('majority_error')" class="ln" style="stroke: rgb(var(--c-ok))" />
      <circle :cx="x(idx)" :cy="y(cur.minority_error)" r="6" style="fill: rgb(var(--c-warn))" />
      <circle :cx="x(idx)" :cy="y(cur.majority_error)" r="6" style="fill: rgb(var(--c-ok))" />
      <text :x="x(1) + 6" :y="y(data.sweep[1].minority_error) - 8" class="lg" style="fill: rgb(var(--c-warn))">under-represented group</text>
      <text :x="x(1) + 6" :y="y(0) - 10" class="lg" style="fill: rgb(var(--c-ok))">everyone else</text>
    </svg>
    <p class="src">An analogy, not face data: real penguin measurements (DS4A's penguins.csv), logistic regression, fixed test set ({{ Object.values(data.test_counts).reduce((a, b) => a + b, 0) }} penguins) · mean of {{ data.draws }} random draws · computed by the backend</p>
  </div>
</template>

<style scoped>
.rd { display: grid; grid-template-columns: minmax(300px, 1fr) 1.25fr; gap: 3vw; width: 100%; align-items: center; }
label { display: flex; flex-direction: column; gap: 8px; }
label span { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
label b { font-size: 24px; color: rgb(var(--c-accent)); }
label small { font: max(13px, var(--up-13, 13px)) 'Inter', system-ui; color: rgb(var(--c-dim)); }
input { accent-color: rgb(var(--c-accent)); }
.stats { display: grid; gap: 8px; margin-top: 16px; }
.s { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-left: 3px solid; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.s b { font: 700 24px 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.s.min { border-color: rgb(var(--c-warn)); } .s.maj { border-color: rgb(var(--c-ok)); } .s.all { border-color: rgb(var(--c-dim)); }
.key { margin-top: 14px; font: 600 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
svg { width: 100%; max-height: 46vh; display: block; }
.grid { stroke: rgba(var(--c-dim), .14); }
.tick { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.ax { font: 600 13px 'Space Grotesk', system-ui; fill: rgb(var(--c-soft)); }
.cur { stroke: rgb(var(--c-accent)); stroke-dasharray: 4 4; }
.ln { fill: none; stroke-width: 3; }
.lg { font: 600 13px 'Space Grotesk', system-ui; }
.src { grid-column: 1 / -1; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
