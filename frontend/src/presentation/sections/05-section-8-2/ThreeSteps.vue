<script setup lang="ts">
/**
 * DS4A p. 366: "ingesting the data, analyzing the data, and producing model-based results".
 * Full size on its own step; `compact` renders the persistent mini-map shown on the step pages that follow.
 */
const props = defineProps<{ active: number; compact?: boolean; reduced?: boolean }>()
const STEPS = [
  { t: 'Ingest the data', short: 'Ingest the data', s: 'feed structured or unstructured data into the system', c: 'rgb(var(--c-data))' },
  { t: 'Analyze the data', short: 'Analyze the data', s: 'fit a model that relates the variables', c: 'rgb(var(--c-feature))' },
  { t: 'Produce model-based results', short: 'Produce results', s: 'apply the model to new data and deliver or act', c: 'rgb(var(--c-ok))' },
]
</script>

<template>
  <div class="ts" :class="{ compact: props.compact }" data-testid="three-steps">
    <template v-for="(s, i) in STEPS" :key="s.t">
      <div class="step" :class="{ on: i === props.active, done: i < props.active }" :style="{ '--c': s.c }">
        <span class="n">{{ i + 1 }}</span>
        <strong>{{ props.compact ? s.short : s.t }}</strong>
        <small v-if="!props.compact">{{ s.s }}</small>
      </div>
      <div v-if="i < 2" class="flow" :class="{ still: props.reduced }"><i v-for="k in 4" :key="k" :style="{ animationDelay: k * 0.35 + 's' }" /></div>
    </template>
  </div>
</template>

<style scoped>
.ts { display: flex; align-items: stretch; gap: 1vw; width: 100%; } /* every box the same width and height */
.step { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 34px 26px; border-radius: 22px; background: rgba(var(--c-surface), .78); border: 2px solid color-mix(in srgb, var(--c) 45%, transparent); }
.step .n { font: 600 34px 'Space Grotesk', system-ui; color: var(--c); }
.step strong { font: 600 clamp(20px, 1.9vw, 32px) 'Space Grotesk', system-ui; }
.step small { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.4; }
.step.on { border-color: var(--c); box-shadow: 0 0 34px color-mix(in srgb, var(--c) 35%, transparent); }
.flow { align-self: center; position: relative; width: 6vw; height: 4px; background: rgba(var(--c-dim), .2); border-radius: 2px; overflow: hidden; }
.flow i { position: absolute; top: -2px; left: -8px; width: 8px; height: 8px; border-radius: 4px; background: rgb(var(--c-data-soft)); animation: move 1.4s linear infinite; }
.flow.still i { animation: none; display: none; }
@keyframes move { to { left: 100%; } }
.compact { gap: 8px; align-items: stretch; } /* the mini-map pills: same width and height */
.compact .step { white-space: nowrap; min-width: 0; padding: 6px 12px; flex-direction: row; align-items: center; gap: 8px; border-width: 1px; border-radius: 999px; opacity: .55; }
.compact .step .n { font-size: max(14px, var(--up-14, 14px)); }
.compact .step strong { font-size: max(13px, var(--up-13, 13px)); font-weight: 500; }
.compact .step.on { opacity: 1; }
.compact .flow { align-self: center; width: 24px; height: 2px; }
.compact .flow i { display: none; }
@media (prefers-reduced-motion: reduce) { .flow i { animation: none; display: none; } }
</style>
