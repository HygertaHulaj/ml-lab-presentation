<script setup lang="ts">
/**
 * DS4A p. 366, Step 2: "the machine learning system analyzes the provided data by fitting a model to relate one
 * variable to the others … without a person guiding every step." Real gradient descent on Shah Table 8.2: every
 * frame (w, b, loss) comes from GET /concepts/analyze-and-produce; the line and the loss curve are drawn from them.
 */
import { computed, onMounted } from 'vue'
import { Pause, Play, RotateCcw } from 'lucide-vue-next'
import { useProgress } from '../../../visualizations/shared/useProgress'
import type { AnalyzeProduce } from '../../api'

const props = defineProps<{ data: AnalyzeProduce; reduced: boolean }>()
const { prog, playing, play, toggle, seek, finish } = useProgress(9, () => props.reduced)
onMounted(() => play(0))

const X0 = 0, X1 = 21, Y0 = -15, Y1 = 80
const sx = (v: number) => 60 + ((v - X0) / (X1 - X0)) * 600
const sy = (v: number) => 400 - ((v - Y0) / (Y1 - Y0)) * 360
const frame = computed(() => props.data.frames[Math.min(props.data.frames.length - 1, Math.floor(prog.p * (props.data.frames.length - 1) + 1e-9))])
const lineY = (x: number) => frame.value.w * x + frame.value.b
const done = computed(() => prog.p >= 1)
// loss curve (log scale)
const L0 = Math.log10(Math.max(1, Math.min(...props.data.frames.map((f) => f.loss))) * 0.8)
const L1 = Math.log10(Math.max(...props.data.frames.map((f) => f.loss)) * 1.2)
const lx = (k: number) => 720 + (k / (props.data.frames.length - 1)) * 250
const ly = (loss: number) => 380 - ((Math.log10(loss) - L0) / (L1 - L0)) * 260
const curve = computed(() => props.data.frames.map((f, k) => `${k ? 'L' : 'M'}${lx(k).toFixed(1)} ${ly(f.loss).toFixed(1)}`).join(' '))
const cursorK = computed(() => props.data.frames.indexOf(frame.value))
function advance(): boolean { return finish() }
defineExpose({ advance })
</script>

<template>
  <div class="an" data-testid="m-analyze">
    <svg viewBox="0 0 1000 450" class="plot" role="img" aria-label="Gradient descent fitting a straight line">
      <line x1="60" x2="660" :y1="sy(0)" :y2="sy(0)" class="axis" /><line x1="60" x2="60" y1="40" y2="400" class="axis" />
      <text x="360" y="438" text-anchor="middle" class="al">x</text><text x="30" y="220" class="al">y</text>
      <line v-for="(x, i) in data.x" :key="'r' + i" :x1="sx(x)" :x2="sx(x)" :y1="sy(data.y[i])" :y2="sy(lineY(x))" class="resid" />
      <line v-if="done" :x1="sx(0)" :x2="sx(21)" :y1="sy(data.ols.b)" :y2="sy(data.ols.w * 21 + data.ols.b)" class="ols" />
      <line :x1="sx(0)" :x2="sx(21)" :y1="sy(lineY(0))" :y2="sy(lineY(21))" class="fit" data-testid="fit-line" />
      <circle v-for="(x, i) in data.x" :key="'p' + i" :cx="sx(x)" :cy="sy(data.y[i])" r="6" class="pt" />
      <!-- loss curve -->
      <text x="720" y="100" class="ct">LOSS (mean squared error)</text>
      <path :d="curve" class="curve" />
      <circle :cx="lx(cursorK)" :cy="ly(frame.loss)" r="6" class="cur" />
      <text x="720" y="410" class="ct">iterations →</text>
    </svg>
    <aside class="side">
      <div class="stat"><span>iteration</span><b data-testid="gd-iteration">{{ frame.iteration.toLocaleString('en') }}</b><small>of {{ data.iterations_run.toLocaleString('en') }}, run automatically</small></div>
      <div class="stat"><span>current model</span><b class="mono" data-testid="gd-model">ŷ = {{ frame.b.toFixed(2) }} + {{ frame.w.toFixed(3) }}x</b></div>
      <div class="stat"><span>loss</span><b class="mono">{{ frame.loss.toFixed(1) }}</b></div>
      <div class="stat"><span>steps guided by a person</span><b class="zero">0</b></div>
      <p v-if="done" class="fin" data-testid="gd-done">Converged: ŷ = {{ data.final.b }} + {{ data.final.w }}x, the same as least squares (dashed), ŷ = {{ data.ols.b }} + {{ data.ols.w }}x.</p>
      <div class="bar">
        <button class="ctl" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
        <button class="ctl" aria-label="Replay" @click="play(0)"><RotateCcw class="ic" /></button>
        <input type="range" min="0" max="1" step="0.001" :value="prog.p" aria-label="Fitting progress" class="scrub" data-testid="gd-scrub" @input="seek(+($event.target as HTMLInputElement).value)" />
      </div>
      <p class="src">{{ data.source }} · gradient descent, learning rate {{ data.learning_rate }} · computed by the backend</p>
    </aside>
  </div>
</template>

<style scoped>
.an { display: grid; grid-template-columns: 1.7fr 1fr; gap: 2.5vw; width: 100%; align-items: center; }
.plot { width: 100%; height: auto; max-height: 56vh; }
.axis { stroke: rgba(var(--c-dim), .5); }
.al { fill: rgb(var(--c-data-soft)); font: 600 15px 'Space Grotesk', system-ui; }
.pt { fill: rgb(var(--c-data)); }
.resid { stroke: rgba(var(--c-warn), .6); stroke-width: 1.5; }
.fit { stroke: rgb(var(--c-human)); stroke-width: 3.5; }
.ols { stroke: rgb(var(--c-ok)); stroke-width: 2; stroke-dasharray: 8 6; }
.ct { fill: rgb(var(--c-faint)); font: 600 12px 'Space Grotesk', system-ui; letter-spacing: .12em; }
.curve { fill: none; stroke: rgb(var(--c-feature)); stroke-width: 2.5; }
.cur { fill: rgb(var(--c-human)); }
.side { display: flex; flex-direction: column; gap: 10px; }
.stat { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 2px 10px; padding: 10px 14px; border-radius: 12px; background: rgba(var(--c-surface), .72); }
.stat span { color: rgb(var(--c-faint)); font-size: max(13px, var(--up-13, 13px)); text-transform: uppercase; letter-spacing: .1em; }
.stat b { font: 600 max(20px, var(--up-20, 20px)) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); text-align: right; }
.stat small { grid-column: 1 / -1; color: rgb(var(--c-faint)); font-size: max(12px, var(--up-12, 12px)); }
.mono { font-family: 'JetBrains Mono', Consolas, monospace !important; font-size: max(17px, var(--up-17, 17px)) !important; }
.zero { color: rgb(var(--c-ok)) !important; }
.fin { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-ok)); line-height: 1.45; }
.bar { display: flex; align-items: center; gap: 8px; }
.ctl { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: rgba(var(--c-text), .06); color: rgb(var(--c-text)); }
.ic { width: 18px; height: 18px; }
.scrub { flex: 1; accent-color: rgb(var(--c-data)); }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
