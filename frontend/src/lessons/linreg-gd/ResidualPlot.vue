<script setup lang="ts">
/**
 * Residual-versus-fitted diagnostic of the full least-squares model (audit A8). Fitted values and residuals come from the
 * backend trace (`diagnostics`); this component only scales them to pixels. A curved or fanning pattern means a straight
 * model misses structure that R² alone does not reveal.
 */
import { computed } from 'vue'
import type { LinRegTrace } from './types'

const props = defineProps<{ trace: LinRegTrace }>()
const W = 320, H = 150, L = 34, B = 22, T = 8, R = 8
const box = computed(() => {
  const f = props.trace.diagnostics.fitted, r = props.trace.diagnostics.residuals
  const fx0 = Math.min(...f), fx1 = Math.max(...f), ry = Math.max(1e-9, ...r.map(Math.abs))
  const px = (v: number) => L + ((v - fx0) / (fx1 - fx0 || 1)) * (W - L - R)
  const py = (v: number) => T + (H - B - T) / 2 - (v / ry) * ((H - B - T) / 2)
  return { pts: f.map((v, i) => ({ x: px(v), y: py(r[i]) })), zero: py(0), ry, fx0, fx1 }
})
const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(Math.abs(v) >= 10 ? 0 : 2))
</script>

<template>
  <figure class="rounded-lg border border-[rgba(var(--c-text),.6)] bg-[rgba(var(--c-text),.05)] p-2" data-testid="gd-residuals">
    <figcaption class="mb-1 text-[length:var(--l-xs)] font-semibold text-[rgb(var(--c-soft))]">Residuals vs fitted values (full model, {{ trace.n }} observations)</figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" role="img" aria-label="Residual versus fitted plot computed by the backend">
      <line :x1="L" :x2="W - R" :y1="box.zero" :y2="box.zero" stroke="currentColor" class="text-[rgb(var(--c-ref))]" stroke-dasharray="4 3" />
      <circle v-for="(p, i) in box.pts" :key="i" :cx="p.x" :cy="p.y" r="2.6" fill="currentColor" class="text-[rgb(var(--c-obs))]" opacity="0.85" />
      <text :x="L - 4" :y="T + 8" text-anchor="end" font-size="9" fill="currentColor" class="text-[rgb(var(--c-dim))]">+{{ fmt(box.ry) }}</text>
      <text :x="L - 4" :y="H - B" text-anchor="end" font-size="9" fill="currentColor" class="text-[rgb(var(--c-dim))]">−{{ fmt(box.ry) }}</text>
      <text :x="L" :y="H - 6" font-size="9" fill="currentColor" class="text-[rgb(var(--c-dim))]">fitted {{ fmt(box.fx0) }}</text>
      <text :x="W - R" :y="H - 6" text-anchor="end" font-size="9" fill="currentColor" class="text-[rgb(var(--c-dim))]">{{ fmt(box.fx1) }}</text>
    </svg>
    <p class="mt-1 text-[length:var(--l-xs)] text-[rgb(var(--c-soft))]">A straight-line model leaves a patternless band around zero. Curvature or a fan shape means the relationship is not well described as linear, whatever R² says.</p>
    <p v-if="trace.diagnostics.log_response_r2 !== undefined" class="mt-1 text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Option to test: on log({{ trace.response }}), the same predictors give R² = {{ trace.diagnostics.log_response_r2.toFixed(3) }} (a different scale, so not directly comparable).</p>
  </figure>
</template>
