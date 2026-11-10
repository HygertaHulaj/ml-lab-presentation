<script setup lang="ts">
import { computed } from 'vue'
import type { Tree, TreeNode } from '../../types'
import { fmt } from '../../utils/format'

/** Draws the REAL fitted tree returned by the API (nodes, thresholds, counts). */
const props = defineProps<{ tree: Tree; highlight?: number[] }>()
const emit = defineEmits<{ select: [node: TreeNode] }>()

const W = 168, H = 74, GX = 14, GY = 46
const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7', '#84cc16', '#ec4899']

const layout = computed(() => {
  const nodes = props.tree.nodes
  const pos: Record<number, { x: number; y: number }> = {}
  let leafIdx = 0
  const place = (id: number): number => {
    const n = nodes[id]
    let x: number
    if (n.is_leaf || n.left === null || n.right === null) x = leafIdx++ * (W + GX)
    else x = (place(n.left) + place(n.right)) / 2
    pos[id] = { x, y: n.depth * (H + GY) }
    return x
  }
  place(0)
  return { pos, width: Math.max(1, leafIdx) * (W + GX), height: (props.tree.depth + 1) * (H + GY) }
})

const hl = computed(() => new Set(props.highlight ?? []))
const color = (n: TreeNode) => {
  if (props.tree.classes) return PALETTE[props.tree.classes.indexOf(String(n.prediction)) % PALETTE.length]
  return '#6366f1'
}
const counts = (n: TreeNode) => (n.class_counts ? props.tree.classes!.map((c) => n.class_counts![c]).join(' / ') : `n = ${n.samples}`)
</script>

<template>
  <div class="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3" role="img" :aria-label="`Decision tree with ${tree.n_leaves} leaves`">
    <svg :width="layout.width" :height="layout.height" class="mx-auto block">
      <g v-for="n in tree.nodes" :key="'e' + n.id">
        <template v-if="!n.is_leaf && n.left !== null && n.right !== null">
          <path
            v-for="(c, k) in [n.left, n.right]"
            :key="k"
            :d="`M${layout.pos[n.id].x + W / 2},${layout.pos[n.id].y + H} C${layout.pos[n.id].x + W / 2},${layout.pos[n.id].y + H + GY / 2} ${layout.pos[c].x + W / 2},${layout.pos[c].y - GY / 2} ${layout.pos[c].x + W / 2},${layout.pos[c].y}`"
            fill="none"
            :stroke="hl.has(n.id) && hl.has(c) ? '#4f46e5' : '#94a3b8'"
            :stroke-width="hl.has(n.id) && hl.has(c) ? 3 : 1.4"
          />
          <text :x="(layout.pos[n.id].x + layout.pos[n.left].x) / 2 + W / 2 - 6" :y="layout.pos[n.id].y + H + GY / 2 + 4" class="fill-slate-500 text-[10px]" text-anchor="end">yes</text>
          <text :x="(layout.pos[n.id].x + layout.pos[n.right].x) / 2 + W / 2 + 6" :y="layout.pos[n.id].y + H + GY / 2 + 4" class="fill-slate-500 text-[10px]">no</text>
        </template>
      </g>
      <g v-for="n in tree.nodes" :key="n.id" class="cursor-pointer" @click="emit('select', n)">
        <rect
          :x="layout.pos[n.id].x" :y="layout.pos[n.id].y" :width="W" :height="H" rx="10"
          fill="white" :stroke="hl.has(n.id) ? '#4f46e5' : '#cbd5e1'" :stroke-width="hl.has(n.id) ? 3 : 1"
        />
        <rect :x="layout.pos[n.id].x" :y="layout.pos[n.id].y" width="6" :height="H" rx="3" :fill="color(n)" />
        <text :x="layout.pos[n.id].x + 14" :y="layout.pos[n.id].y + 18" class="fill-slate-900 text-[12px] font-semibold">
          {{ typeof n.prediction === 'number' ? fmt(n.prediction, 3) : n.prediction }}
        </text>
        <text :x="layout.pos[n.id].x + 14" :y="layout.pos[n.id].y + 34" class="fill-slate-600 text-[11px]">{{ counts(n) }}</text>
        <text v-if="!n.is_leaf" :x="layout.pos[n.id].x + 14" :y="layout.pos[n.id].y + 52" class="fill-brand-700 text-[10.5px] font-medium">
          {{ (n.left_condition ?? '').length > 26 ? n.left_condition!.slice(0, 25) + '…' : n.left_condition }}
        </text>
        <text v-else :x="layout.pos[n.id].x + 14" :y="layout.pos[n.id].y + 52" class="fill-slate-400 text-[10.5px]">leaf · n = {{ n.samples }}</text>
        <title>{{ n.question ?? 'Leaf' }} — samples {{ n.samples }}, impurity {{ fmt(n.impurity) }}</title>
      </g>
    </svg>
  </div>
  <p v-if="tree.classes" class="mt-2 text-xs text-slate-500">
    Counts in each node are in the order: <b>{{ tree.classes.join(' / ') }}</b>. Left branch = condition true ("yes"). Click a node for details.
  </p>
</template>
