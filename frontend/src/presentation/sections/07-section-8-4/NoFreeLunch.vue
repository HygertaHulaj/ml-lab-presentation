<script setup lang="ts">
/**
 * DS4A p. 384, the "No Free Lunch" theorem, made concrete: the same three methods on three problems, each scored
 * on its test data by the backend. → reveals one problem at a time; the winner changes.
 */
import { computed, ref } from 'vue'
import type { Evaluation } from '../../api'
import { DEFS } from './content'

const props = defineProps<{ problems: Evaluation['no_free_lunch'] }>()
const shown = ref(1)
function advance(): boolean { if (shown.value < props.problems.length) { shown.value++; return true } return false }
defineExpose({ advance })
const panels = computed(() => props.problems.map((p) => {
  const vals = p.results.map((r) => r.value)
  const max = Math.max(...vals)
  const acc = p.results[0].metric === 'accuracy'
  return { ...p, acc, rows: p.results.map((r) => ({ ...r, w: acc ? r.value * 100 : (r.value / max) * 100, best: r.method === p.best })) }
}))
const fmt = (acc: boolean, v: number) => (acc ? `${(v * 100).toFixed(1)} %` : v.toFixed(2))
</script>

<template>
  <div class="nfl" data-testid="m-nfl">
    <p class="def">{{ DEFS.nfl }}</p>
    <div class="panels">
      <div v-for="(p, i) in panels" :key="p.problem" class="panel" :class="{ on: i < shown }" :data-testid="`nfl-${i}`">
        <h3>{{ p.problem }}</h3>
        <p class="m">{{ p.acc ? 'test accuracy: higher is better' : 'test MSE: lower is better' }} · {{ p.n_train }} train / {{ p.n_test }} test</p>
        <div v-for="r in p.rows" :key="r.method" class="row" :class="{ best: r.best }">
          <span class="name">{{ r.method }}</span>
          <span class="bar"><i :style="{ width: r.w + '%' }" /></span>
          <b>{{ fmt(p.acc, r.value) }}</b>
        </div>
        <p class="win" :data-testid="`nfl-best-${i}`">best here: <b>{{ p.best }}</b></p>
      </div>
    </div>
    <p class="note">The performance of a model depends on the problem and the data, so we try several methods. Here they are compared on the book's test split to show the idea; in practice we choose with validation data or cross-validation and keep the test set for one final check. Linear regression wins on car seat sales, and is the worst on the curved data. Chapter 9 studies these methods further.</p>
    <p class="src">Car seats: official DS4A split · curved data: seeded synthetic data, the same as the next steps · computed by the backend (scikit-learn)</p>
  </div>
</template>

<style scoped>
.nfl { width: 100%; }
.def { font: 500 clamp(16px, 1.3vw, 22px) 'Inter', system-ui; color: rgb(var(--c-text)); }
.panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
.panel { padding: 16px 18px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); opacity: .1; transform: translateY(10px); transition: opacity .5s, transform .5s; }
.panel.on { opacity: 1; transform: none; }
h3 { font: 600 max(clamp(16px, 1.25vw, 21px), var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.m { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); margin: 4px 0 12px; }
.row { display: grid; grid-template-columns: minmax(0, 1.1fr) 1fr auto; gap: 10px; align-items: center; margin: 8px 0; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.bar { height: 12px; border-radius: 6px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 6px; background: rgba(var(--c-dim), .6); }
.row.best .bar i { background: rgb(var(--c-accent)); }
.row.best .name, .row.best b { color: rgb(var(--c-strong)); }
.row b { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; min-width: 58px; text-align: right; }
.win { margin-top: 10px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.win b { color: rgb(var(--c-accent)); }
.note { margin-top: 16px; max-width: 110ch; font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.src { margin-top: 6px; font-size: 12px; color: rgb(var(--c-faint)); }
@media (max-width: 1000px) { .panels { grid-template-columns: 1fr; } }
</style>
