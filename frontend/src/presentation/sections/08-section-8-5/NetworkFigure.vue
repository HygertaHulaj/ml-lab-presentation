<script setup lang="ts">
/**
 * DS4A Fig. 8.23 (p. 390): a simple ANN (left) and a small but deep neural network (right). Green nodes are the
 * explanatory variables, red nodes the response, as in the book. → passes the data through one layer at a time.
 * A schematic figure (the shapes follow the book), so no backend data is needed.
 */
import { computed, ref } from 'vue'
import { DEFS } from './content'

const NETS = [
  { name: 'Simple ANN', sizes: [4, 5, 1], note: 'one hidden layer' },
  { name: 'Deep neural network', sizes: [5, 6, 6, 6, 4], note: 'three hidden layers' },
]
const lit = ref(1) // how many layers of the deep network the data has reached
const maxLit = NETS[1].sizes.length
function advance(): boolean { if (lit.value < maxLit) { lit.value++; return true } return false }
defineExpose({ advance })

const W = 440, H = 300
const layout = (sizes: number[]) => sizes.map((n, l) => Array.from({ length: n }, (_, i) => ({
  x: 40 + (l / (sizes.length - 1)) * (W - 80),
  y: H / 2 + (i - (n - 1) / 2) * Math.min(44, (H - 40) / Math.max(...sizes)),
})))
const nets = computed(() => NETS.map((net, k) => {
  const nodes = layout(net.sizes)
  const reach = k === 1 ? lit.value : Math.min(net.sizes.length, Math.round((lit.value / maxLit) * net.sizes.length))
  const edges = nodes.slice(0, -1).flatMap((layer, l) => layer.flatMap((a) => nodes[l + 1].map((b) => ({ a, b, on: l + 1 < reach }))))
  return { ...net, nodes, edges, reach }
}))
const tone = (l: number, n: number) => (l === 0 ? 'ok' : l === n - 1 ? 'warn' : 'compute')
const label = (l: number, n: number) => (l === 0 ? 'input' : l === n - 1 ? 'output' : `hidden ${l}`)
</script>

<template>
  <div class="nf" data-testid="m-network">
    <div class="figs">
      <figure v-for="net in nets" :key="net.name">
        <figcaption><strong>{{ net.name }}</strong> · {{ net.note }}</figcaption>
        <svg :viewBox="`0 0 ${W} ${H + 30}`" role="img" :aria-label="`${net.name}: layers of ${net.sizes.join(', ')} nodes`">
          <line v-for="(e, i) in net.edges" :key="i" :x1="e.a.x" :y1="e.a.y" :x2="e.b.x" :y2="e.b.y" class="edge" :class="{ on: e.on }" />
          <g v-for="(layer, l) in net.nodes" :key="l">
            <circle v-for="(p, i) in layer" :key="i" :cx="p.x" :cy="p.y" r="11" class="node"
                    :style="{ fill: l < net.reach ? `rgb(var(--c-${tone(l, net.sizes.length)}))` : `rgba(var(--c-${tone(l, net.sizes.length)}), .18)`, stroke: `rgb(var(--c-${tone(l, net.sizes.length)}))` }" />
            <text :x="layer[0].x" :y="H + 22" text-anchor="middle" class="ll">{{ label(l, net.sizes.length) }}</text>
          </g>
        </svg>
      </figure>
    </div>
    <div class="defs">
      <div class="card a"><span>{{ DEFS.ann }}</span></div>
      <div class="card d"><span>{{ DEFS.deep }}</span></div>
      <p class="note">Each layer calculates, categorises and modifies the data, moving towards a useful representation for the output (p. 390). <span class="leg"><i class="g" /> explanatory variables <i class="r" /> response</span></p>
    </div>
  </div>
</template>

<style scoped>
.nf { width: 100%; display: grid; gap: 14px; }
.figs { display: grid; grid-template-columns: 1fr 1.25fr; gap: 3vw; }
figure { margin: 0; }
figcaption { font-size: 15px; color: rgb(var(--c-soft)); margin-bottom: 4px; }
figcaption strong { font: 600 17px 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
svg { width: 100%; max-height: 40vh; display: block; }
.edge { stroke: rgba(var(--c-dim), .18); stroke-width: 1; transition: stroke .4s; }
.edge.on { stroke: rgba(var(--c-compute), .55); }
.node { stroke-width: 2; transition: fill .4s; }
.ll { font: 12px 'Inter', system-ui; fill: rgb(var(--c-dim)); }
.defs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.card { padding: 12px 16px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-left: 3px solid; font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; color: rgb(var(--c-text)); }
.card.a { border-color: rgb(var(--c-compute)); } .card.d { border-color: rgb(var(--c-accent)); }
.note { grid-column: 1 / -1; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.leg { margin-left: 10px; }
.leg i { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin: 0 4px 0 10px; vertical-align: middle; }
.leg .g { background: rgb(var(--c-ok)); } .leg .r { background: rgb(var(--c-warn)); }
</style>
