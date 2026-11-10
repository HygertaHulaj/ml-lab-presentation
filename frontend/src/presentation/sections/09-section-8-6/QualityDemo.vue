<script setup lang="ts">
/**
 * Quality, measured on the digits: (1) "compressed" images at lower resolution, as with radiology scans stored
 * cheaply; (2) erroneous reporting: training labels that are wrong. → reveals the second demo. Backend numbers.
 */
import { ref } from 'vue'
import type { DataQuality } from '../../api'
import PixelImage from './PixelImage.vue'

defineProps<{ data: DataQuality['quality'] }>()
const stage = ref(0)
function advance(): boolean { if (stage.value < 1) { stage.value++; return true } return false }
defineExpose({ advance })
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
</script>

<template>
  <div class="qd" data-testid="m-quality">
    <div class="res">
      <figure v-for="r in data.resolution" :key="r.side" :data-testid="`qd-res-${r.side}`">
        <PixelImage :pixels="r.example" size="min(13vh, 110px)" />
        <figcaption>{{ r.side }}×{{ r.side }} · <b>{{ pct(r.accuracy) }}</b></figcaption>
      </figure>
    </div>
    <p class="cap">The same digit {{ data.example_label }}, stored at lower resolution; the model is retrained and tested at each resolution.</p>
    <div class="noise" :class="{ hide: stage < 1 }">
      <p class="h">Wrong labels in the training data (erroneous reporting)</p>
      <div v-for="(n, i) in data.label_noise" :key="n.wrong_labels" class="bar" :data-testid="`qd-noise-${i}`">
        <span>{{ Math.round(n.wrong_labels * 100) }} % wrong ({{ n.n_wrong }})</span>
        <span class="track"><i :style="{ width: `${(n.accuracy - 0.5) / 0.5 * 100}%` }" /></span>
        <b>{{ pct(n.accuracy) }}</b>
      </div>
    </div>
    <p class="src">Real digit images · logistic regression trained by the backend · test accuracy on unseen digits · bars start at 50 %</p>
  </div>
</template>

<style scoped>
.qd { display: grid; gap: 10px; }
.res { display: flex; gap: 18px; }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
figcaption { font-size: 13px; color: rgb(var(--c-dim)); }
figcaption b { font: 600 15px 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.cap { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.noise { display: grid; gap: 6px; transition: opacity .5s; }
.h { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
.bar { display: grid; grid-template-columns: 140px 1fr 64px; gap: 10px; align-items: center; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.track { height: 12px; border-radius: 6px; background: rgba(var(--c-dim), .15); overflow: hidden; }
.track i { display: block; height: 100%; background: rgb(var(--c-human)); }
.bar b { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; text-align: right; color: rgb(var(--c-strong)); }
.hide { opacity: 0; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
</style>
