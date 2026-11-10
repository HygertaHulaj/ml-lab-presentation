<script setup lang="ts">
/**
 * DS4A p. 391: trained on thousands of digits, the network learns which features are distinct to each digit.
 * The chosen digit flows through the real trained network (→ one layer at a time). The real test accuracy and the
 * digits it gets wrong are shown too: deep learning is powerful, not perfect.
 */
import { computed, ref } from 'vue'
import type { DeepLearning } from '../../api'
import NetReading from './NetReading.vue'

const props = defineProps<{ data: DeepLearning; modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()
const reach = ref(0)
const wrongIdx = ref<number | null>(null)
function advance(): boolean { if (reach.value < 3) { reach.value++; return true } return false }
defineExpose({ advance })
const reading = computed(() => (wrongIdx.value !== null ? props.data.misclassified[wrongIdx.value] : props.data.examples[props.modelValue]))
const pick = (i: number) => { wrongIdx.value = null; emit('update:modelValue', i); reach.value = 3 }
const pickWrong = (i: number) => { wrongIdx.value = i; reach.value = 3 }
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const shade = (v: number) => `rgba(var(--c-strong), ${(v / props.data.dataset.shading_max).toFixed(3)})`
</script>

<template>
  <div class="fp" data-testid="m-forward">
    <div class="main">
      <NetReading :reading="reading" :architecture="data.architecture" :reach="reach" :shading-max="data.dataset.shading_max" />
      <p class="verdict" :class="{ hide: reach < 3 }" data-testid="fp-verdict">
        The network says <b>{{ reading.prediction }}</b> ({{ pct(reading.probabilities[reading.prediction]) }})
        <template v-if="reading.label !== undefined"> · the true digit is {{ reading.label }} <span :class="reading.label === reading.prediction ? 'ok' : 'bad'">{{ reading.label === reading.prediction ? '✓' : '✗' }}</span></template>
      </p>
    </div>
    <aside>
      <div class="stats">
        <div><span>layers</span><b>{{ data.architecture.join(' → ') }}</b></div>
        <div><span>weights learned</span><b data-testid="fp-weights">{{ data.n_weights.toLocaleString('en') }}</b></div>
        <div><span>training passes</span><b>{{ data.iterations }}</b></div>
        <div><span>test accuracy ({{ data.dataset.n_test }} unseen)</span><b data-testid="fp-accuracy">{{ pct(data.test_accuracy) }}</b></div>
      </div>
      <p class="h">Correctly read</p>
      <div class="chips"><button v-for="(e, i) in data.examples" :key="i" :class="{ on: wrongIdx === null && i === modelValue }" :data-testid="`fp-ex-${e.label}`" @click="pick(i)">{{ e.label }}</button></div>
      <p class="h">Its mistakes ({{ data.n_wrong }} of {{ data.dataset.n_test }})</p>
      <div class="wrong">
        <button v-for="(m, i) in data.misclassified" :key="i" :class="{ on: wrongIdx === i }" :data-testid="`fp-wrong-${i}`" @click="pickWrong(i)">
          <span class="mini"><i v-for="(v, k) in m.pixels" :key="k" :style="{ background: shade(v) }" /></span>
          <small>{{ m.label }} → {{ m.prediction }}</small>
        </button>
      </div>
      <p class="src">scikit-learn MLP trained by the backend (seeded) · activations recomputed from its weights · brighter unit = more active</p>
    </aside>
  </div>
</template>

<style scoped>
.fp { display: grid; grid-template-columns: 1.7fr 1fr; gap: 2.5vw; width: 100%; align-items: center; }
.verdict { font: 500 clamp(16px, 1.3vw, 22px) 'Inter', system-ui; color: rgb(var(--c-text)); transition: opacity .4s; }
.verdict b { font: 700 1.3em 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.verdict .ok { color: rgb(var(--c-ok)); } .verdict .bad { color: rgb(var(--c-warn)); }
.hide { opacity: 0; }
.stats { display: grid; gap: 5px; }
.stats div { display: flex; justify-content: space-between; gap: 10px; padding: 7px 12px; border-radius: 10px; background: rgba(var(--c-surface), .72); font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-dim)); }
.stats b { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.h { margin: 12px 0 6px; font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chips button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(var(--c-dim), .4); font: 600 15px 'Space Grotesk', system-ui; color: rgb(var(--c-text)); }
.chips button.on, .wrong button.on { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
.wrong { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.wrong button { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 5px; border-radius: 8px; border: 1px solid rgba(var(--c-warn), .4); color: rgb(var(--c-text)); }
.mini { display: grid; grid-template-columns: repeat(8, 1fr); width: 40px; height: 40px; background: rgb(var(--c-ground2)); border-radius: 4px; overflow: hidden; }
.mini i { display: block; }
.wrong small { font: 600 max(12px, var(--up-12, 12px)) 'Space Grotesk', system-ui; }
.src { margin-top: 10px; font-size: 12px; color: rgb(var(--c-faint)); line-height: 1.4; }
</style>
