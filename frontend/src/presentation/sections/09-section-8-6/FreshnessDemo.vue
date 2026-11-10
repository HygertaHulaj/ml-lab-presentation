<script setup lang="ts">
/**
 * Freshness, measured: real digit images as a *simulated* new scanner would record them (fainter shading). The model
 * trained on old-scanner images loses accuracy; retraining with a few fresh images restores it. → reveals the drop,
 * then the retraining. All accuracies from the backend.
 */
import { computed, ref } from 'vue'
import type { DataQuality } from '../../api'
import PixelImage from './PixelImage.vue'

const props = defineProps<{ data: DataQuality['freshness'] }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 2) { stage.value++; return true } return false }
defineExpose({ advance })
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const bars = computed(() => [
  { k: 'old model · old scanner', v: props.data.old_model_on_old, tone: 'ok', show: 1 },
  { k: 'old model · new scanner', v: props.data.retraining[0].accuracy_new_scanner, tone: 'warn', show: 1 },
  ...props.data.retraining.slice(1).map((r) => ({ k: `retrained + ${r.fresh_images} fresh images · new scanner`, v: r.accuracy_new_scanner, tone: 'data', show: 2 })),
])
</script>

<template>
  <div class="fd" data-testid="m-fresh">
    <div class="imgs">
      <figure><PixelImage :pixels="data.example.old" size="min(16vh, 140px)" /><figcaption>old scanner</figcaption></figure>
      <span class="arr">→</span>
      <figure><PixelImage :pixels="data.example.new" size="min(16vh, 140px)" /><figcaption>new scanner (simulated: {{ Math.round(data.shading_factor * 100) }} % shading)</figcaption></figure>
    </div>
    <div class="bars">
      <div v-for="(b, i) in bars" :key="b.k" class="bar" :class="{ hide: stage < b.show }" :data-testid="`fd-bar-${i}`">
        <span>{{ b.k }}</span>
        <span class="track"><i :style="{ width: `${(b.v - 0.5) / 0.5 * 100}%`, background: `rgb(var(--c-${b.tone}))` }" /></span>
        <b>{{ pct(b.v) }}</b>
      </div>
    </div>
    <p class="src">{{ data.n_test }} real test digits · logistic regression trained by the backend · the scanner change is simulated · bars start at 50 %</p>
  </div>
</template>

<style scoped>
.fd { display: grid; gap: 14px; }
.imgs { display: flex; align-items: center; gap: 20px; }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
figcaption { font-size: 13px; color: rgb(var(--c-dim)); }
.arr { font-size: 30px; color: rgb(var(--c-accent)); }
.bars { display: grid; gap: 8px; }
.bar { display: grid; grid-template-columns: minmax(0, 1.3fr) 1fr 64px; gap: 10px; align-items: center; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); transition: opacity .5s; }
.track { height: 14px; border-radius: 7px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 7px; transition: width .6s; }
.bar b { font: 600 max(16px, var(--up-16, 16px)) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); text-align: right; }
.hide { opacity: 0; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
