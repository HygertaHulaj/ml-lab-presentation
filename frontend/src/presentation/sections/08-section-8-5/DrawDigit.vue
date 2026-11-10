<script setup lang="ts">
/**
 * Try it (an extension beyond the book): draw a digit. On release it is encoded like the dataset (encode.ts) and
 * sent to the backend, whose trained network returns its layers and probabilities. The model only knows 8×8
 * digits written like the training data, so odd drawings can fool it, which is part of the lesson.
 */
import { onMounted, ref } from 'vue'
import { presentationApi, type DigitReading } from '../../api'
import { errorMessage } from '../../../api/client'
import { cssRGB } from '../../theme'
import { encodeDrawing } from './encode'
import NetReading from './NetReading.vue'

defineProps<{ architecture: number[] }>()
const cv = ref<HTMLCanvasElement | null>(null)
const reading = ref<DigitReading | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)
const SIZE = 280
let drawing = false
let last: [number, number] | null = null

function ctx() { return cv.value!.getContext('2d', { willReadFrequently: true })! }
function clear() {
  const g = ctx()
  g.clearRect(0, 0, SIZE, SIZE)
  reading.value = null
}
function pos(e: PointerEvent): [number, number] {
  const r = cv.value!.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE]
}
function down(e: PointerEvent) { drawing = true; last = pos(e); cv.value!.setPointerCapture(e.pointerId); stroke(e) }
function stroke(e: PointerEvent) {
  if (!drawing || !last) return
  const g = ctx()
  const [r, gg, b] = cssRGB(cv.value!, 'strong')
  g.strokeStyle = `rgb(${r},${gg},${b})`; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round'
  const p = pos(e)
  g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke()
  last = p
}
async function up() {
  if (!drawing) return
  drawing = false; last = null
  await read()
}
/** draw a stroke programmatically (used by the presenter's "show me" button and by tests) */
function demo() {
  clear()
  const g = ctx()
  const [r, gg, b] = cssRGB(cv.value!, 'strong')
  g.strokeStyle = `rgb(${r},${gg},${b})`; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(80, 60); g.lineTo(200, 60); g.lineTo(120, 230); g.stroke() // a 7
  return read()
}
async function read() {
  const data = ctx().getImageData(0, 0, SIZE, SIZE).data
  const pixels = encodeDrawing((x, y) => data[(y * SIZE + x) * 4 + 3] > 60, SIZE, SIZE)
  if (pixels.every((v) => v === 0)) { reading.value = null; return }
  busy.value = true
  try { reading.value = await presentationApi.predictDigit(pixels); error.value = null } catch (e) { error.value = errorMessage(e) } finally { busy.value = false }
}
onMounted(clear)
defineExpose({ advance: () => false })
</script>

<template>
  <div class="dd" data-testid="m-draw">
    <div class="pad">
      <canvas ref="cv" :width="SIZE" :height="SIZE" class="cv" data-testid="dd-canvas" aria-label="Drawing area: draw one digit"
              @pointerdown="down" @pointermove="stroke" @pointerup="up" @pointerleave="up" />
      <div class="btns">
        <button class="btn ghost" data-testid="dd-clear" @click="clear">Clear</button>
        <button class="btn ghost" data-testid="dd-demo" @click="demo">Show me a 7</button>
      </div>
      <p class="hint">Draw one digit, large and centred, then let go.</p>
    </div>
    <div class="res">
      <div v-if="error" class="err">Backend not reachable ({{ error }}).</div>
      <template v-else-if="reading">
        <NetReading :reading="reading" :architecture="architecture" />
        <p class="verdict" data-testid="dd-verdict">The network reads <b>{{ reading.prediction }}</b> ({{ (reading.probabilities[reading.prediction] * 100).toFixed(1) }} %)</p>
      </template>
      <p v-else class="wait">{{ busy ? 'Reading…' : 'Your digit will appear here as 64 numbers, pass through the network and come out as a prediction.' }}</p>
      <p class="src">Extension beyond the book · your drawing is encoded like the dataset (32×32, counted in 4×4 blocks → 8×8, 0–16) and read by the backend's trained network</p>
    </div>
  </div>
</template>

<style scoped>
.dd { display: grid; grid-template-columns: auto 1fr; gap: 3vw; width: 100%; align-items: center; }
.cv { width: min(38vh, 300px); aspect-ratio: 1; border-radius: 16px; background: rgb(var(--c-ground2)); border: 2px dashed rgba(var(--c-accent), .6); touch-action: none; cursor: crosshair; display: block; }
.btns { display: flex; gap: 8px; margin-top: 10px; }
.btn { padding: 8px 16px; border-radius: 999px; font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; }
.btn.ghost { border: 1px solid rgba(var(--c-text), .3); color: rgb(var(--c-text)); }
.hint { margin-top: 8px; font-size: 13px; color: rgb(var(--c-dim)); }
.verdict { font: 500 clamp(16px, 1.3vw, 22px) 'Inter', system-ui; color: rgb(var(--c-text)); }
.verdict b { font: 700 1.3em 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.wait { font-size: max(16px, var(--up-16, 16px)); color: rgb(var(--c-dim)); max-width: 50ch; }
.err { color: rgb(var(--c-warn)); }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
</style>
