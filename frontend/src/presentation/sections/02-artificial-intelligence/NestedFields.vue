<script setup lang="ts">
/**
 * AI ⊃ ML ⊃ DL as nested glowing fields. `level` reveals the fields (1 = AI, 2 = + ML, 3 = + DL);
 * `focus` moves the "camera" (an animated SVG viewBox) onto one field, dims the others and shows its examples.
 * Clicking a field emits `select`.
 */
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { gsap } from 'gsap'
import { FIELDS, type FieldId } from './content'

const props = defineProps<{ level: number; focus: FieldId | null; reduced: boolean }>()
const emit = defineEmits<{ select: [id: FieldId] }>()

const W = 1000, H = 680
const vb = reactive({ x: 0, y: 0, w: W, h: H })
const order: FieldId[] = ['ai', 'ml', 'dl']

function boxFor(id: FieldId | null) {
  if (!id || id === 'ai') return { x: 0, y: 0, w: W, h: H }
  const f = FIELDS[id]
  const w = Math.max(f.rx * 2 * 1.35, f.ry * 2 * 1.35 * (W / H))
  const h = w * (H / W)
  return { x: f.cx - w / 2, y: f.cy - h / 2, w, h }
}
let tw: gsap.core.Tween | null = null
function moveCamera() {
  tw?.kill()
  const b = boxFor(props.focus)
  if (props.reduced) Object.assign(vb, b)
  else tw = gsap.to(vb, { ...b, duration: 1.4, ease: 'power2.inOut' })
}
watch(() => props.focus, moveCamera)
onMounted(() => { Object.assign(vb, boxFor(props.focus)) })
onBeforeUnmount(() => tw?.kill())

const viewBox = computed(() => `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
const visible = (id: FieldId) => order.indexOf(id) < props.level
const dim = (id: FieldId) => props.focus !== null && props.focus !== id && !(props.focus === 'ai' && id === 'ai')
const labelScale = computed(() => vb.w / W)
const COLORS: Record<FieldId, string> = { ai: 'rgb(var(--c-compute))', ml: 'rgb(var(--c-data))', dl: 'rgb(var(--c-feature))' }
const LABEL_Y: Record<FieldId, number> = { ai: 62, ml: 178, dl: 302 }
</script>

<template>
  <svg class="nested" :viewBox="viewBox" role="img" aria-label="Deep learning inside machine learning, inside artificial intelligence" data-testid="nested-fields">
    <defs>
      <radialGradient v-for="id in order" :id="'g-' + id" :key="id" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-opacity="0.22" :style="{ stopColor: COLORS[id] }" />
        <stop offset="100%" stop-opacity="0.04" :style="{ stopColor: COLORS[id] }" />
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <g v-for="id in order" :key="id" class="field" :class="{ shown: visible(id), dim: dim(id), focused: focus === id }" :data-field="id" @click.stop="visible(id) && emit('select', id)">
      <ellipse :cx="FIELDS[id].cx" :cy="FIELDS[id].cy" :rx="FIELDS[id].rx" :ry="FIELDS[id].ry" stroke-width="2.4" filter="url(#glow)" :style="{ fill: `url(#g-${id})`, stroke: COLORS[id] }" />
      <text :x="FIELDS[id].cx" :y="LABEL_Y[id]" text-anchor="middle" class="fname" :style="[{ fontSize: 26 * Math.max(0.55, labelScale) + 'px' }, { fill: COLORS[id] }]">{{ FIELDS[id].name.toUpperCase() }}</text>
    </g>
    <g v-for="id in order" :key="'ex-' + id" class="examples" :class="{ shown: visible(id) && (focus === id || focus === null) }">
      <g v-for="(e, i) in FIELDS[id].examples" :key="e.label" :transform="`translate(${e.x}, ${e.y})`" :style="{ transitionDelay: 0.25 + i * 0.18 + 's' }" class="chip">
        <rect :x="-e.label.length * 5.4 - 16" y="-19" :width="e.label.length * 10.8 + 32" height="38" rx="19" :style="{ stroke: COLORS[id] }" />
        <text text-anchor="middle" y="6">{{ e.label }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.nested { width: 100%; height: 100%; overflow: visible; }
.field { opacity: 0; transition: opacity 0.9s ease; cursor: pointer; }
.field.shown { opacity: 1; }
.field.shown.dim { opacity: 0.28; }
.field.focused ellipse { stroke-width: 3.4; }
.fname { font-family: 'Space Grotesk', system-ui; font-weight: 600; letter-spacing: 0.16em; pointer-events: none; }
.examples .chip { opacity: 0; transition: opacity 0.6s ease; pointer-events: none; }
.examples.shown .chip { opacity: 1; }
.chip rect { fill: rgba(var(--c-surface), 0.82); stroke-width: 1.4; }
.chip text { fill: rgb(var(--c-text)); font: 500 18px 'Inter', system-ui; }
</style>
