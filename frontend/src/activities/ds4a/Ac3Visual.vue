<script setup lang="ts">
/**
 * AC 3, Reading a Decision Tree (DS4A p. 399): the real tree fitted on the college data (backend). The root appears,
 * then its split, then the 777 colleges pour from the root into the two leaves (one dot each, coloured by whether the
 * college really is private; counts from the tree's leaves), then the leaf counts and STAR. Pure function of (scene, p).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import type { TreeNode } from '../../presentation/api'
import DecisionTreeView from '../../visualizations/concepts/DecisionTreeView.vue'
import StarCards from '../visuals/StarCards.vue'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
const tree = computed(() => props.solve.tree as { nodes: TreeNode[]; classes: string[] })
const leaves = computed(() => tree.value.nodes.filter((n) => n.is_leaf))
const reveal = computed(() => (props.scene === 'intro' || props.scene === 'root' ? 0 : 1))
const emphasis = computed(() => (props.scene === 'root' ? 'root' : props.scene === 'split' ? 'split' : props.scene === 'leaves' ? 'leaves' : null))
const COLORS = { Yes: 'rgb(var(--c-ok))', No: 'rgb(var(--c-human))' }
const showFlow = computed(() => ['flow', 'leaves'].includes(props.scene))
const flowP = computed(() => (props.scene === 'flow' ? props.p : 1))
// dots: per leaf, its real class counts (private Yes / No); a dot k of N arrives when flowP passes k/N
const dots = computed(() => leaves.value.map((leaf, li) => {
  const counts = leaf.class_counts ?? {}
  const arr: { cls: string }[] = []
  for (const c of tree.value.classes) for (let k = 0; k < (counts[c] ?? 0); k++) arr.push({ cls: c })
  return { leaf, li, arr }
}))
const COLS = 48
const arrived = (k: number, n: number) => flowP.value >= 0.05 + (k / Math.max(1, n)) * 0.85
const a4 = computed(() => props.solve.answers[3]?.answer as Record<string, number>)
const star = computed(() => props.solve.answers[4]?.answer as Record<string, unknown>)
const ds = computed(() => props.solve.dataset as { rows: number; features: string[] })
</script>

<template>
  <div class="a3" data-testid="v-ac3">
    <div v-if="scene === 'intro'" class="intro">
      <div class="big"><b>{{ ds.rows }}</b><span>US colleges</span></div>
      <div class="big"><b>{{ ds.features.length }}</b><span>numeric variables</span></div>
      <div class="big"><b>private?</b><span>the response: Yes or No</span></div>
    </div>
    <StarCards v-else-if="scene === 'star'" :star="star" :shown="line + 1" />
    <div v-else class="tree">
      <DecisionTreeView :nodes="tree.nodes" :classes="tree.classes" :reveal="reveal" :emphasis="emphasis" :colors="COLORS" />
      <div v-if="showFlow" class="flow">
        <div v-for="d in dots" :key="d.li" class="bin" :data-testid="`ac3-leaf-${d.li}`">
          <p class="h">{{ d.leaf.prediction === 'Yes' ? 'predicted private' : 'predicted public' }} · <b>{{ d.leaf.samples }}</b> colleges</p>
          <div class="dots" :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }">
            <i v-for="(x, k) in d.arr" :key="k" :style="{ background: COLORS[x.cls as 'Yes' | 'No'], opacity: arrived(k, d.arr.length) ? 1 : 0 }" />
          </div>
          <p class="c">{{ d.leaf.class_counts?.[String(d.leaf.prediction)] }} of {{ d.leaf.samples }} correct</p>
        </div>
      </div>
      <p v-if="scene === 'leaves'" class="tot" data-testid="ac3-total">{{ a4.total_correct }} of {{ a4.out_of }} colleges correctly predicted · {{ a4.private_predictions }} private and {{ a4.public_predictions }} public predictions</p>
      <p class="leg"><i class="y" /> really private <i class="n" /> really public · counts in each node: public (No) | private (Yes)</p>
    </div>
  </div>
</template>

<style scoped>
.a3 { width: 100%; max-width: 1400px; margin: 0 auto; }
.intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.big { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 30px; border-radius: 18px; background: rgba(var(--c-surface), .85); }
.big b { font: 700 clamp(34px, 3.6vw, 60px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.big span { color: rgb(var(--c-soft)); }
.tree :deep(.dtree) { max-height: 30vh; }
.flow { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 8px; }
.bin { padding: 10px 14px; border-radius: 14px; background: rgba(var(--c-surface), .7); }
.h { font-size: 14px; color: rgb(var(--c-soft)); margin-bottom: 6px; }
.h b { color: rgb(var(--c-strong)); }
.dots { display: grid; gap: 2px; }
.dots i { display: block; aspect-ratio: 1; border-radius: 50%; transition: opacity .25s; }
.c { margin-top: 6px; font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.tot { margin-top: 10px; text-align: center; font: 600 clamp(16px, 1.3vw, 21px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.leg { margin-top: 6px; text-align: center; font-size: 13px; color: rgb(var(--c-dim)); }
.leg i { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin: 0 4px 0 12px; vertical-align: middle; }
.leg .y { background: rgb(var(--c-ok)); } .leg .n { background: rgb(var(--c-human)); }
@media (prefers-reduced-motion: reduce) { .dots i { transition: none; } }
</style>
