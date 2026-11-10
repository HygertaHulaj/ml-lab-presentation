<script setup lang="ts">
/**
 * A Shah Ch. 8 cinematic lesson (regression / gradient descent): its store and components in the shared lesson shell,
 * plus a small heads-up display (iteration, cost, and the model comparison for Problem 8.4).
 */
import { computed, onMounted } from 'vue'
import CinematicLessonShell from '../../components/lesson/CinematicLessonShell.vue'
import { useLinregLessonStore } from '../../stores/linregLesson'
import GdScene from './GdScene.vue'
import GdMathPanel from './GdMathPanel.vue'
import GdLabPanel from './GdLabPanel.vue'
import { stateAt } from './state'

const props = defineProps<{ id: string }>()
const store = useLinregLessonStore()
onMounted(() => store.load(props.id))
const s = computed(() => (store.timeline && store.manifest && store.traces.length ? stateAt(store.timeline, store.manifest.parts, store.traces, store.position) : null))
const tr = computed(() => (s.value ? store.traces[s.value.part] : null))
const live = computed(() => !!s.value && ['guess', 'residuals', 'bowl', 'descend', 'converged', 'read'].includes(s.value.kind))
const sci = (v: number) => (!Number.isFinite(v) ? '∞' : Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(2) : v.toFixed(3))
</script>

<template>
  <CinematicLessonShell :store="store" :camera="[0, 2.2, 15]" loading-text="Running gradient descent on the server…" back-to="/activities" accent="movies">
    <template #scene="{ reducedMotion, onContextLost }"><GdScene :reduced-motion="reducedMotion" @contextlost="onContextLost" /></template>
    <template #math="{ large }"><GdMathPanel :large="large" /></template>
    <template #lab><GdLabPanel /></template>
    <template #hud>
      <div v-if="s && tr && live" class="pointer-events-none absolute top-14 right-4 rounded-xl bg-[rgba(var(--c-ground2),.45)] px-4 py-3 text-[length:var(--l-xs)] text-[rgb(var(--c-soft))] backdrop-blur" data-testid="gd-hud">
        <div>iteration <b class="text-[length:var(--l-base)] text-[rgb(var(--c-strong))] tabular-nums">{{ s.frame.iteration }}</b> / {{ tr.iterations_run }}</div>
        <div>cost J <b class="text-[length:var(--l-base)] text-[rgb(var(--c-ref))] tabular-nums">{{ sci(s.frame.cost) }}</b></div>
        <div class="text-[rgb(var(--c-faint))]">α = {{ tr.learning_rate }} · {{ ['converged', 'read', 'models', 'outro'].includes(s.kind) ? tr.stop_reason : 'fitting' }}</div>
      </div>
      <div v-if="s && tr && tr.models && s.modelsOpacity > 0" class="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-[min(640px,90%)] rounded-2xl bg-[rgba(var(--c-ground2),.55)] p-5 backdrop-blur" :style="{ opacity: s.modelsOpacity }" data-testid="gd-models">
        <div v-for="m in tr.models" :key="m.label" class="mb-3">
          <div class="flex justify-between text-[length:var(--l-sm)] text-[rgb(var(--c-text))]"><span>{{ m.label }}</span><span class="tabular-nums">R² {{ m.r2.toFixed(3) }} · adj. {{ m.adj_r2.toFixed(3) }}</span></div>
          <div class="mt-1 h-3 rounded bg-[rgba(var(--c-text),.1)]"><div class="h-3 rounded bg-[rgb(var(--c-pred))]" :style="{ width: Math.max(1, m.r2 * 100 * 3) + '%' }" /></div>
        </div>
        <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Bars stretched ×3 (0–33 %) · same {{ tr.n }} complete movies for both models</p>
      </div>
    </template>
  </CinematicLessonShell>
</template>
