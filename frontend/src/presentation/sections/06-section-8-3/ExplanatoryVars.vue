<script setup lang="ts">
/**
 * DS4A pp. 371–372, Figs 8.9 and 8.10: what makes a good explanatory variable? A stacked column chart of sales_cat by
 * shelf location (the share of High differs, so they are associated) and a scatter of sales vs price (negative,
 * linear). All counts, points and the correlation come from GET /concepts/carseats-explore.
 */
import { computed, onMounted, ref } from 'vue'
import { presentationApi, type CarseatsExplore } from '../../api'
import { errorMessage } from '../../../api/client'

const d = ref<CarseatsExplore | null>(null)
const error = ref<string | null>(null)
const view = ref<'cat' | 'num'>('cat')
onMounted(async () => { try { d.value = await presentationApi.carseatsExplore() } catch (e) { error.value = errorMessage(e) } })
const pts = computed(() => (d.value ? d.value.price_sales.price.map((p, i) => ({ x: 60 + ((p - 20) / 180) * 500, y: 300 - (d.value!.price_sales.sales[i] / 17) * 270 })) : []))
function advance(): boolean { if (view.value === 'cat') { view.value = 'num'; return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="ev" data-testid="m-explanatory">
    <div class="text">
      <p class="q">We need a variable that can reliably predict the response.</p>
      <div class="toggle"><button :class="{ on: view === 'cat' }" @click="view = 'cat'">sales_cat vs shelf location</button><button :class="{ on: view === 'num' }" data-testid="view-num" @click="view = 'num'">sales vs price</button></div>
      <p v-if="d && view === 'cat'" class="expl" data-testid="explanatory-text">The share of "High" stores changes with shelf location: {{ d.by_shelf.map((b) => `${b.shelf_location} ${(b.share_high * 100).toFixed(0)} %`).join(', ') }}. The variables are associated, so shelf location may help predict sales_cat.</p>
      <p v-else-if="d" class="expl" data-testid="explanatory-text">Higher prices go with lower sales: correlation r = {{ d.price_sales.r.toFixed(2) }}, a moderate negative linear association. Price is a reasonable variable for predicting sales.</p>
      <p class="src">DS4A Figs 8.9, 8.10 · computed from the 400 stores</p>
    </div>
    <div class="vis">
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <svg v-else-if="d && view === 'cat'" viewBox="0 0 600 340" class="chart" role="img" aria-label="Share of High and Low sales by shelf location">
        <g v-for="(b, i) in d.by_shelf" :key="b.shelf_location" :transform="`translate(${90 + i * 170} 0)`">
          <rect x="0" :y="30" width="110" :height="(1 - b.share_high) * 260" class="low" />
          <rect x="0" :y="30 + (1 - b.share_high) * 260" width="110" :height="b.share_high * 260" class="high" />
          <text x="55" :y="22 + (1 - b.share_high) * 260 + b.share_high * 130 + 14" text-anchor="middle" class="pct">{{ (b.share_high * 100).toFixed(0) }} %</text>
          <text x="55" y="318" text-anchor="middle" class="cl">{{ b.shelf_location }}</text>
          <text x="55" y="336" text-anchor="middle" class="n">{{ b.High + b.Low }} stores</text>
        </g>
        <rect x="500" y="40" width="14" height="14" class="high" /><text x="520" y="52" class="lg">High</text>
        <rect x="500" y="64" width="14" height="14" class="low" /><text x="520" y="76" class="lg">Low</text>
      </svg>
      <svg v-else-if="d" viewBox="0 0 600 340" class="chart" role="img" aria-label="Sales versus price">
        <line x1="60" x2="560" y1="300" y2="300" class="axis" /><line x1="60" x2="60" y1="20" y2="300" class="axis" />
        <circle v-for="(p, i) in pts" :key="i" :cx="p.x" :cy="p.y" r="3.5" class="pt" />
        <text x="310" y="330" text-anchor="middle" class="cl">price</text>
        <text x="24" y="160" text-anchor="middle" class="cl" transform="rotate(-90 24 160)">sales (thousands)</text>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.ev { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3vw; align-items: center; width: 100%; }
.q { font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-text)); }
.toggle { display: inline-flex; padding: 4px; margin-top: 14px; border-radius: 12px; background: rgba(var(--c-text), .06); }
.toggle button { padding: 8px 14px; border-radius: 9px; font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); }
.toggle button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); }
.expl { margin-top: 16px; font-size: max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)); line-height: 1.5; color: rgb(var(--c-soft)); }
.src { margin-top: 12px; font-size: 12px; color: rgb(var(--c-faint)); }
.chart { width: 100%; height: auto; max-height: 52vh; }
.high { fill: rgb(var(--c-ok)); } .low { fill: rgba(var(--c-human), .55); }
.pct { fill: rgb(var(--c-ground2)); font: 700 16px 'Space Grotesk', system-ui; }
.cl { fill: rgb(var(--c-soft)); font: 600 15px 'Space Grotesk', system-ui; }
.n { fill: rgb(var(--c-faint)); font: 500 12px 'Inter', system-ui; }
.lg { fill: rgb(var(--c-soft)); font: 500 13px 'Inter', system-ui; }
.axis { stroke: rgba(var(--c-dim), .5); }
.pt { fill: rgb(var(--c-data)); opacity: .75; }
.err { color: rgb(var(--c-human)); }
</style>
