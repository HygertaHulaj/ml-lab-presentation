<script setup lang="ts">
/**
 * Renders any decision tree returned by the backend (`extract_tree`): nodes with their real counts or means,
 * branch conditions, leaf predictions. Reads top to bottom like the book's figures. Optional: highlight a path,
 * emphasise parts (root / split / branches / leaves) for walkthroughs, compact mode for big trees.
 */
import { computed } from 'vue'
import type { TreeNode } from '../../presentation/api'

const props = withDefaults(defineProps<{
  nodes: TreeNode[]; classes?: string[] | null; path?: number[]; emphasis?: 'root' | 'split' | 'branches' | 'leaves' | null
  colors?: Record<string, string>; unit?: string; reveal?: number
}>(), { classes: null, path: () => [], emphasis: null, colors: () => ({}), unit: '', reveal: 99 })

const nLeaves = computed(() => props.nodes.filter((n) => n.is_leaf).length)
const maxDepth = computed(() => Math.max(...props.nodes.map((n) => n.depth)))
const compact = computed(() => nLeaves.value > 8)
const W = computed(() => Math.max(700, nLeaves.value * (compact.value ? 46 : 150)))
const LEVEL = computed(() => (compact.value ? 70 : 128))
const H = computed(() => 70 + maxDepth.value * LEVEL.value + 70)

const pos = computed(() => {
  const byId = new Map(props.nodes.map((n) => [n.id, n]))
  const xy = new Map<number, { x: number; y: number }>()
  let slot = 0
  const walk = (id: number): number => {
    const n = byId.get(id)!
    const y = 50 + n.depth * LEVEL.value
    let x: number
    if (n.is_leaf || n.left === null || n.right === null) x = ((slot++ + 0.5) / nLeaves.value) * W.value
    else x = (walk(n.left) + walk(n.right)) / 2
    xy.set(id, { x, y })
    return x
  }
  if (props.nodes.length) walk(0)
  return xy
})
const label = (f?: string) => (f ?? '').replace(/_/g, ' ')
const cond = (c?: string) => (c ?? '').replace(/_/g, ' ').replace(' is not ', ' ≠ ').replace(' is ', ' = ')
const counts = (n: TreeNode) => (n.class_counts && props.classes ? props.classes.map((c) => n.class_counts![c] ?? 0).join(' | ') : typeof n.prediction === 'number' ? `mean ${n.prediction.toFixed(2)}${props.unit}` : '')
const pred = (n: TreeNode) => (typeof n.prediction === 'number' ? n.prediction.toFixed(2) : n.prediction)
const color = (n: TreeNode) => props.colors[String(n.prediction)] ?? 'rgb(var(--c-data))'
const onPath = (id: number) => props.path.includes(id)
const dim = (n: TreeNode) => {
  if (!props.emphasis) return false
  if (props.emphasis === 'root') return n.id !== 0
  if (props.emphasis === 'split') return n.is_leaf
  if (props.emphasis === 'leaves') return !n.is_leaf
  return false
}
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="dtree" :class="{ compact }" role="img" aria-label="Decision tree" data-testid="dtree">
    <g v-for="n in nodes.filter((m) => !m.is_leaf && m.left !== null && m.right !== null)" :key="'e' + n.id" :opacity="n.depth < reveal ? 1 : 0">
      <template v-for="(child, side) in [n.left!, n.right!]" :key="child">
        <line :x1="pos.get(n.id)!.x" :y1="pos.get(n.id)!.y + 26" :x2="pos.get(child)!.x" :y2="pos.get(child)!.y - 26"
              class="edge" :class="{ hot: onPath(n.id) && onPath(child), emph: emphasis === 'branches' }" />
        <text v-if="!compact" :x="(pos.get(n.id)!.x + pos.get(child)!.x) / 2 + (side === 0 ? -10 : 10)" :y="(pos.get(n.id)!.y + pos.get(child)!.y) / 2 + 4"
              :text-anchor="side === 0 ? 'end' : 'start'" class="cond" :class="{ emph: emphasis === 'branches' }">{{ cond(side === 0 ? n.left_condition : n.right_condition) }}</text>
      </template>
    </g>
    <g v-for="n in nodes" :key="n.id" :transform="`translate(${pos.get(n.id)!.x} ${pos.get(n.id)!.y})`" :opacity="n.depth <= reveal ? (dim(n) ? 0.25 : 1) : 0" class="node" :data-node="n.id">
      <template v-if="compact">
        <circle :r="n.is_leaf ? 9 : 7" :class="n.is_leaf ? 'leaf-dot' : 'split-dot'" :style="{ fill: n.is_leaf ? color(n) : undefined }" />
      </template>
      <template v-else>
        <rect x="-70" y="-26" width="140" height="52" rx="12" :class="[n.is_leaf ? 'leaf' : 'split', { hot: onPath(n.id) }]" :style="{ stroke: n.is_leaf ? color(n) : undefined }" />
        <text y="-5" text-anchor="middle" class="t1" :style="{ fill: n.is_leaf ? color(n) : 'rgb(var(--c-text))' }">{{ n.is_leaf ? pred(n) : label(n.feature).replace(/ (Good|Bad|Medium|Yes|No)$/, '') }}</text>
        <text y="15" text-anchor="middle" class="t2">{{ n.is_leaf ? counts(n) : typeof n.prediction === 'number' ? `${counts(n)} · n ${n.samples}` : `${pred(n)} · ${counts(n)}` }}</text>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.dtree { width: 100%; height: auto; max-height: 100%; }
.edge { stroke: rgba(var(--c-dim), .45); stroke-width: 2; }
.edge.hot { stroke: rgb(var(--c-human)); stroke-width: 4; }
.edge.emph { stroke: rgb(var(--c-data)); stroke-width: 3; }
.cond { fill: rgb(var(--c-dim)); font: 500 13px 'Inter', system-ui; }
.cond.emph { fill: rgb(var(--c-data)); font-weight: 700; }
.split { fill: rgba(var(--c-surface), .96); stroke: rgba(var(--c-text), .5); stroke-width: 1.5; }
.leaf { fill: rgba(var(--c-surface), .96); stroke-width: 2.4; }
.split.hot, .leaf.hot { stroke: rgb(var(--c-human)); stroke-width: 3.5; }
.t1 { font: 600 15px 'Space Grotesk', system-ui; }
.t2 { fill: rgb(var(--c-dim)); font: 500 12px 'JetBrains Mono', Consolas, monospace; }
.node { transition: opacity .5s; }
.split-dot { fill: rgb(var(--c-dim)); }
.compact .edge { stroke-width: 1.2; }
</style>
