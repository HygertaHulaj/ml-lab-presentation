<script setup lang="ts">
/**
 * Explore: change the learning rate α and the iteration limit for one part and run gradient descent again on the
 * backend. Too small: slow. Too large: the ball overshoots and the cost explodes (diverged). Reset restores the book's run.
 */
import { computed, reactive, watch } from 'vue'
import { useLinregLessonStore } from '../../stores/linregLesson'
import { stateAt } from './state'

const store = useLinregLessonStore()
const current = computed(() => (store.timeline && store.manifest && store.traces.length ? stateAt(store.timeline, store.manifest.parts, store.traces, store.position).part : 0))
const form = reactive({ part: 0, lr: 0.1, iters: 5000 })
watch(current, (p) => { form.part = p }, { immediate: true })
watch(() => [form.part, store.configs], () => {
  const c = store.configs[form.part]
  if (c) { form.lr = c.learning_rate; form.iters = c.iterations }
}, { immediate: true, deep: true })
const ctl = computed(() => store.manifest?.controls)
const tr = computed(() => store.traces[form.part])
async function run() { await store.rerun(form.part, { learning_rate: Number(form.lr), iterations: Number(form.iters) }) }
async function reset() {
  const base = store.manifest?.parts[form.part].config
  if (base) await store.rerun(form.part, { learning_rate: base.learning_rate, iterations: base.iterations })
}
</script>

<template>
  <div v-if="store.manifest && ctl" class="space-y-3 text-[length:var(--l-sm)]" data-testid="gd-lab">
    <label class="block">
      <span class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Model</span>
      <select v-model.number="form.part" class="mt-1 w-full rounded bg-[rgba(var(--c-text),.05)] px-2 py-1.5 text-[length:var(--l-sm)]" data-testid="gd-lab-part">
        <option v-for="(p, i) in store.manifest.parts" :key="p.id" :value="i">{{ p.title }}</option>
      </select>
    </label>
    <label class="block">
      <span class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Learning rate α = <b class="text-[rgb(var(--c-strong))]">{{ form.lr }}</b></span>
      <input v-model.number="form.lr" type="range" :min="ctl.learning_rate.min" :max="ctl.learning_rate.max" :step="ctl.learning_rate.step" class="w-full accent-[rgb(var(--c-pred))]" data-testid="gd-lab-lr" />
    </label>
    <label class="block">
      <span class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Iteration limit</span>
      <input v-model.number="form.iters" type="number" :min="ctl.iterations.min" :max="ctl.iterations.max" class="mt-1 w-full rounded bg-[rgba(var(--c-text),.05)] px-2 py-1.5 text-[length:var(--l-sm)]" data-testid="gd-lab-iters" />
    </label>
    <div class="flex gap-2">
      <button class="flex-1 rounded-lg bg-[rgb(var(--c-pred))] px-3 py-2 font-semibold text-[rgb(var(--c-ink))] hover:bg-[rgb(var(--c-pred))] disabled:opacity-50" :disabled="store.loading" data-testid="gd-lab-run" @click="run">Run gradient descent</button>
      <button class="rounded-lg border border-[rgba(var(--c-text),.2)] px-3 py-2 text-[length:var(--l-xs)] hover:bg-[rgba(var(--c-text),.05)]" @click="reset">Book's run</button>
    </div>
    <p v-if="tr" class="rounded bg-[rgba(var(--c-text),.05)] px-3 py-2 text-[length:var(--l-xs)]" data-testid="gd-lab-result">
      <b :class="tr.stop_reason === 'diverged' ? 'text-[rgb(var(--c-err))]' : tr.stop_reason === 'converged' ? 'text-[rgb(var(--c-ok))]' : 'text-[rgb(var(--c-ref))]'">{{ tr.stop_reason }}</b>
      after {{ tr.iterations_run }} iterations with α = {{ tr.learning_rate }}. Press Story (or ▶) to watch it.
    </p>
    <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-faint))]">With standardized features, small α creeps, α near 1 is fast, and too large an α overshoots so the cost explodes. Try 0.01, 0.5 and 2.2.</p>
  </div>
</template>
