<script setup lang="ts">
/**
 * DS4A p. 391 / Fig. 8.25: "the machine transposes the image into an array of numbers corresponding to the shading
 * intensity". A real handwritten digit from the dataset: → shows its 8×8 shading values, then the 64 numbers in a
 * row, which is exactly the network's input layer. The digit is chosen with the buttons (shared with the next step).
 */
import { computed, ref } from 'vue'
import type { DigitReading } from '../../api'

const props = defineProps<{ examples: DigitReading[]; modelValue: number; shadingMax: number }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 2) { stage.value++; return true } return false }
defineExpose({ advance })
const ex = computed(() => props.examples[props.modelValue])
const shade = (v: number) => `rgba(var(--c-strong), ${(v / props.shadingMax).toFixed(3)})`
</script>

<template>
  <div class="dp" data-testid="m-pixels">
    <div class="pick">
      <span>Choose a handwritten digit:</span>
      <button v-for="(e, i) in examples" :key="i" :class="{ on: i === modelValue }" :data-testid="`dp-pick-${e.label}`" @click="emit('update:modelValue', i)">{{ e.label }}</button>
    </div>
    <div class="row">
      <div class="img" role="img" :aria-label="`An 8 by 8 image of a handwritten ${ex.label}`">
        <i v-for="(v, k) in ex.pixels" :key="k" :style="{ background: shade(v) }" />
      </div>
      <div class="arrow">→</div>
      <div class="nums" :class="{ hide: stage < 1 }" data-testid="dp-grid">
        <span v-for="(v, k) in ex.pixels" :key="k" :style="{ color: v > shadingMax / 2 ? 'rgb(var(--c-strong))' : 'rgb(var(--c-dim))' }">{{ v }}</span>
      </div>
    </div>
    <div class="flat" :class="{ hide: stage < 2 }" data-testid="dp-flat">
      <p>…read row by row: {{ ex.pixels.length }} numbers, the input layer of the network (64 green nodes)</p>
      <div class="cells"><span v-for="(v, k) in ex.pixels" :key="k" :style="{ background: `rgba(var(--c-ok), ${(0.08 + 0.92 * v / shadingMax).toFixed(3)})`, color: v > shadingMax / 2 ? 'rgb(var(--c-ink))' : 'rgb(var(--c-text))' }">{{ v }}</span></div>
    </div>
    <p class="src">Real image from scikit-learn's handwritten digits ({{ ex.label }}, image #{{ ex.index }}) · 8×8 pixels, shading 0–{{ shadingMax }} · the book's Fig. 8.25 uses larger 28×28 images; the idea is the same</p>
  </div>
</template>

<style scoped>
.dp { width: 100%; display: grid; gap: 14px; }
.pick { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); }
.pick button { width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(var(--c-dim), .4); font: 600 max(17px, var(--up-17, 17px)) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
.pick button.on { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
.row { display: flex; align-items: center; gap: 3vw; }
.img { display: grid; grid-template-columns: repeat(8, 1fr); width: min(30vh, 300px); aspect-ratio: 1; background: rgb(var(--c-ground2)); border-radius: 10px; overflow: hidden; border: 1px solid rgba(var(--c-dim), .3); }
.img i { display: block; }
.arrow { font-size: 40px; color: rgb(var(--c-accent)); }
.nums { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; width: min(30vh, 300px); aspect-ratio: 1; transition: opacity .5s; }
.nums span { display: flex; align-items: center; justify-content: center; font: 600 clamp(12px, 1.1vw, 18px) 'JetBrains Mono', Consolas, monospace; background: rgba(var(--c-surface), .7); border-radius: 4px; }
.flat { transition: opacity .5s; }
.flat p { font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); margin-bottom: 6px; }
.cells { display: grid; grid-template-columns: repeat(32, minmax(0, 1fr)); gap: 2px; }
.cells span { font: 600 11px 'JetBrains Mono', Consolas, monospace; text-align: center; padding: 3px 0; border-radius: 3px; color: rgb(var(--c-text)); }
.hide { opacity: 0; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
