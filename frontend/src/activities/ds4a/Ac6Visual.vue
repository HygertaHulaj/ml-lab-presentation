<script setup lang="ts">
/**
 * AC 6, Interpretability versus Complexity (DS4A p. 400): the three real penguin trees (max depth 1, 5, 7) fitted
 * by the backend, growing side by side; the shared top variable; leaf accuracy; the surprise that depth 7 equals
 * depth 5; the ranking; STAR. Pure function of (scene, p, line).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import type { TreeNode } from '../../presentation/api'
import DecisionTreeView from '../../visualizations/concepts/DecisionTreeView.vue'
import StarCards from '../visuals/StarCards.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
type Sum = { max_depth: number; actual_depth: number; splits: number; leaves: number; correct: number; n: number; training_accuracy: number; features_used: string[] }
const trees = computed(() => (props.solve.trees as { max_depth: number; tree: { nodes: TreeNode[]; classes: string[] } }[]))
const summary = computed(() => props.solve.summary as Sum[])
const maxD = computed(() => Math.max(...summary.value.map((s) => s.actual_depth)))
const reveal = computed(() => (props.scene === 'grow' ? Math.floor(props.p * (maxD.value + 0.99)) : 99))
const COLORS = { Adelie: 'rgb(var(--c-human))', Chinstrap: 'rgb(var(--c-feature))', Gentoo: 'rgb(var(--c-data))' }
const showStats = computed(() => ['accuracy', 'identical', 'rank'].includes(props.scene))
const same = computed(() => (props.solve.identical_pairs as number[][]) ?? [])
const isTwin = (d: number) => same.value.some((pair) => pair.includes(d))
const rank = computed(() => props.solve.answers[2]?.answer as Record<string, unknown>)
const star = computed(() => props.solve.answers[3]?.answer as Record<string, unknown>)
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const label = (f: string) => f.replace(/_/g, ' ')
</script>

<template>
  <div class="a6" data-testid="v-ac6">
    <StarCards v-if="scene === 'star'" :star="star" :shown="line + 1" />
    <template v-else>
      <div class="trees">
        <figure v-for="(t, i) in trees" :key="t.max_depth" :class="{ twin: scene === 'identical' && isTwin(t.max_depth) }" :data-testid="`ac6-tree-${t.max_depth}`">
          <figcaption><strong>max depth {{ t.max_depth }}</strong><span v-if="showStats"> · {{ summary[i].splits }} split{{ summary[i].splits === 1 ? '' : 's' }} · {{ summary[i].leaves }} leaves</span></figcaption>
          <DecisionTreeView :nodes="t.tree.nodes" :classes="t.tree.classes" :reveal="scene === 'intro' ? 0 : reveal" :emphasis="scene === 'top' ? 'root' : null" :colors="COLORS" />
          <div v-if="showStats" class="acc"><span class="track"><i :style="{ width: summary[i].training_accuracy * 100 + '%' }" /></span><b>{{ summary[i].correct }} / {{ summary[i].n }} · {{ pct(summary[i].training_accuracy) }}</b></div>
          <p v-if="scene === 'identical' && t.max_depth > 1" class="note">reaches depth {{ summary[i].actual_depth }}</p>
        </figure>
      </div>
      <p v-if="scene === 'top'" class="call" data-testid="ac6-top">At the top of all three: <b>{{ label(String(solve.answers[0].answer)) }}</b></p>
      <p v-if="scene === 'identical'" class="call">Max depth 7 builds the same tree as max depth 5: every leaf is already pure at depth {{ summary[1].actual_depth }}. Max depth is an upper limit, not a target.</p>
      <div v-if="scene === 'rank'" class="rank" data-testid="ac6-rank">
        <span>most interpretable, least complex: the <b>{{ rank.most_interpretable_least_complex }}</b> tree ({{ rank.because_first }})</span>
        <span>least interpretable, most complex: the <b>{{ rank.least_interpretable_most_complex }}</b> tree ({{ rank.because_third }}; {{ rank.variables }} variables)</span>
        <span>in the middle: the <b>{{ rank.middle }}</b> tree</span>
      </div>
      <p class="leg"><i class="a" /> Adelie <i class="c" /> Chinstrap <i class="g" /> Gentoo · counts in each node are Adelie | Chinstrap | Gentoo</p>
    </template>
  </div>
</template>

<style scoped>
.a6 { width: 100%; max-width: 1600px; margin: 0 auto; }
.trees { display: grid; grid-template-columns: 0.7fr 1.15fr 1.15fr; gap: 16px; align-items: start; }
figure { margin: 0; padding: 10px; border-radius: 14px; background: rgba(var(--c-surface), .55); border: 2px solid transparent; transition: border-color .4s; }
figure.twin { border-color: rgb(var(--c-accent)); }
figcaption { font-size: 14px; color: rgb(var(--c-soft)); margin-bottom: 4px; }
figcaption strong { font: 600 16px 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
figure :deep(.dtree) { max-height: 40vh; }
.acc { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; margin-top: 6px; }
.track { height: 10px; border-radius: 5px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; background: rgb(var(--c-accent)); }
.acc b { font: 600 13px 'Space Grotesk', system-ui; }
.note { margin-top: 4px; font-size: 13px; color: rgb(var(--c-accent)); }
.call { margin-top: 12px; text-align: center; font: 600 clamp(16px, 1.3vw, 21px) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
.call b { color: rgb(var(--c-accent)); }
.rank { display: grid; gap: 6px; margin-top: 12px; font-size: clamp(14px, 1.1vw, 18px); color: rgb(var(--c-text)); text-align: center; }
.rank b { color: rgb(var(--c-accent)); }
.leg { margin-top: 8px; text-align: center; font-size: 13px; color: rgb(var(--c-dim)); }
.leg i { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin: 0 4px 0 12px; vertical-align: middle; }
.leg .a { background: rgb(var(--c-human)); } .leg .c { background: rgb(var(--c-feature)); } .leg .g { background: rgb(var(--c-data)); }
</style>
