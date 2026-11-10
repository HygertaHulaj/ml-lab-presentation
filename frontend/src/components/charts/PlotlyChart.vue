<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** Thin wrapper around Plotly (bundled locally, works offline). Data always comes from the API. */
const props = defineProps<{ data: any[]; layout?: Record<string, any>; height?: number }>()
const el = ref<HTMLDivElement | null>(null)
let Plotly: any = null

const baseLayout = () => ({
  margin: { l: 55, r: 20, t: 30, b: 50 },
  font: { family: 'Inter, Segoe UI, sans-serif', size: 12, color: '#334155' },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#ffffff',
  xaxis: { gridcolor: '#e2e8f0', zerolinecolor: '#cbd5e1' },
  yaxis: { gridcolor: '#e2e8f0', zerolinecolor: '#cbd5e1' },
  legend: { orientation: 'h', y: -0.2 },
  height: props.height ?? 360,
})

async function draw() {
  if (!el.value) return
  if (!Plotly) Plotly = (await import('plotly.js-dist-min')).default
  const layout = { ...baseLayout(), ...(props.layout ?? {}) }
  layout.xaxis = { ...baseLayout().xaxis, ...(props.layout?.xaxis ?? {}) }
  layout.yaxis = { ...baseLayout().yaxis, ...(props.layout?.yaxis ?? {}) }
  await Plotly.react(el.value, props.data, layout, { responsive: true, displaylogo: false })
}

onMounted(draw)
watch(() => [props.data, props.layout], draw, { deep: true })
onBeforeUnmount(() => {
  if (Plotly && el.value) Plotly.purge(el.value)
})
</script>

<template>
  <div ref="el" class="w-full" />
</template>
