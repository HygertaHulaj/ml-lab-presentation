<script setup lang="ts">
/** Mode B — Explore: change parameters (the backend re-runs K-Means), inspect points, save and compare runs. */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { learnerId, lessonsApi } from '../../api/lessons'
import { errorMessage } from '../../api/client'
import { useLessonStore } from '../../stores/lesson'
import { CLUSTER_COLORS, stateAt } from './state'

const store = useLessonStore()
const FEATURES = ['sepal_length_cm', 'sepal_width_cm', 'petal_length_cm', 'petal_width_cm']
const form = reactive({ x: store.config.features[0], y: store.config.features[1], k: store.config.k, init: store.config.init, seed: store.config.seed, max_iter: store.config.max_iter, standardize: store.config.standardize })
watch(() => store.config, (c) => Object.assign(form, { x: c.features[0], y: c.features[1], k: c.k, init: c.init, seed: c.seed, max_iter: c.max_iter, standardize: c.standardize }))
const sameFeature = computed(() => form.x === form.y)
const saved = ref<Awaited<ReturnType<typeof lessonsApi.saved>>>([])
const saveName = ref('')
const msg = ref<string | null>(null)

async function run() {
  if (sameFeature.value) return
  await store.rerun({ features: [form.x, form.y], k: form.k, init: form.init, seed: form.seed, max_iter: form.max_iter, standardize: form.standardize })
}
async function refreshSaved() {
  try { saved.value = await lessonsApi.saved(learnerId()) } catch { /* optional */ }
}
async function save() {
  if (!store.simulation) return
  try {
    await lessonsApi.save(store.simulation.id, learnerId(), saveName.value || `K=${store.config.k} · ${store.config.init} · seed ${store.config.seed}`)
    saveName.value = ''
    msg.value = 'Saved.'
    await refreshSaved()
  } catch (e) { msg.value = errorMessage(e) }
}
async function loadSaved(id: string) {
  store.loading = true
  try {
    const sim = await lessonsApi.simulation(id)
    await store.rerun({ ...sim.config })
  } finally { store.loading = false }
}
onMounted(refreshSaved)

const pretty = (f: string) => f.replace(/_cm$/, '').replace('_', ' ')
// inspector: distances from the selected point to the CURRENT centroids, read from the trace
const inspect = computed(() => {
  const i = store.selectedPoint, sim = store.simulation, tl = store.timeline
  if (i === null || !sim || !tl) return null
  const tr = sim.trace
  const s = stateAt(tl, tr, store.position)
  const updatesDone = tl.steps.filter((st) => st.kind === 'update' && store.position >= st.start + st.duration).length
  const dist = s.centroids.length === 0 ? null : updatesDone < tr.iterations.length ? tr.iterations[updatesDone].distances[i] : tr.final_distances[i]
  return { i, raw: store.dataset?.observations[i] ?? [], x: tr.points[i], label: s.labels[i], dist, species: tr.comparison_labels[i], updatesDone }
})
</script>

<template>
  <div class="space-y-4 text-[length:var(--l-sm)] text-[rgb(var(--c-text))]" data-testid="lab-panel">
    <form class="space-y-3" @submit.prevent="run">
      <div class="grid grid-cols-2 gap-2">
        <label class="block"><span class="lab-label">x feature</span>
          <select v-model="form.x" class="lab-input" aria-label="x feature" data-testid="feature-x"><option v-for="f in FEATURES" :key="f" :value="f">{{ pretty(f) }}</option></select></label>
        <label class="block"><span class="lab-label">y feature</span>
          <select v-model="form.y" class="lab-input" aria-label="y feature" data-testid="feature-y"><option v-for="f in FEATURES" :key="f" :value="f">{{ pretty(f) }}</option></select></label>
      </div>
      <label class="block"><span class="lab-label">K (number of clusters): {{ form.k }}</span>
        <input v-model.number="form.k" type="range" min="1" max="10" class="w-full accent-[rgb(var(--c-pred))]" aria-label="K, number of clusters" data-testid="k-slider" /></label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block"><span class="lab-label">initialization</span>
          <select v-model="form.init" class="lab-input" aria-label="initialization method" data-testid="init"><option value="k-means++">K-Means++</option><option value="random">random</option></select></label>
        <label class="block"><span class="lab-label">random seed</span>
          <input v-model.number="form.seed" type="number" min="0" max="99999" class="lab-input" aria-label="random seed" data-testid="seed" /></label>
        <label class="block"><span class="lab-label">max iterations</span>
          <input v-model.number="form.max_iter" type="number" min="1" max="300" class="lab-input" aria-label="maximum iterations" /></label>
        <label class="flex items-end gap-2 pb-1.5"><input v-model="form.standardize" type="checkbox" class="accent-[rgb(var(--c-pred))]" aria-label="standardize features" /> <span class="text-[length:var(--l-xs)]">standardize</span></label>
      </div>
      <p v-if="sameFeature" class="text-[length:var(--l-xs)] text-[rgb(var(--c-ref))]">Choose two different features.</p>
      <button class="w-full rounded-lg bg-[rgba(var(--c-pred),.9)] px-3 py-2 font-semibold text-[rgb(var(--c-ink))] hover:bg-[rgb(var(--c-pred))] disabled:opacity-50" :disabled="store.loading || sameFeature" data-testid="run">
        {{ store.loading ? 'Computing on the server…' : 'Run K-Means' }}</button>
      <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-faint))]">The server re-runs the algorithm; the timeline jumps to “Initialize centroids”.</p>
    </form>

    <section v-if="inspect" class="rounded-xl bg-[rgba(var(--c-text),.05)] p-3" data-testid="inspector">
      <div class="mb-1 font-semibold">Flower #{{ inspect.i + 1 }}</div>
      <div class="font-mono text-[length:var(--l-xs)] text-[rgb(var(--c-soft))]">sepal {{ inspect.raw[0] }} × {{ inspect.raw[1] }} · petal {{ inspect.raw[2] }} × {{ inspect.raw[3] }} cm</div>
      <div class="mt-1 text-[length:var(--l-xs)]">Cluster: <b :style="{ color: inspect.label >= 0 ? CLUSTER_COLORS[inspect.label] : '#94a3b8' }">{{ inspect.label >= 0 ? `μ${inspect.label + 1}` : 'not assigned yet' }}</b>
        · species <span class="text-[rgb(var(--c-dim))]">{{ inspect.species }}</span> (hidden from K-Means)</div>
      <table v-if="inspect.dist" class="mt-2 w-full text-[length:var(--l-xs)] tabular-nums">
        <tr v-for="(d, j) in inspect.dist" :key="j" :class="j === inspect.dist.indexOf(Math.min(...inspect.dist)) ? 'font-semibold text-[rgb(var(--c-strong))]' : 'text-[rgb(var(--c-dim))]'">
          <td :style="{ color: CLUSTER_COLORS[j] }">d(x, μ{{ j + 1 }})</td><td class="text-right">{{ d.toFixed(4) }}</td></tr>
      </table>
      <p class="mt-1 text-[length:var(--l-xs)] text-[rgb(var(--c-faint))]">Distances to the centroids after {{ inspect.updatesDone }} update(s), from the trace.</p>
    </section>
    <p v-else class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Click a point in the scene to inspect it. Drag to orbit, scroll to zoom.</p>

    <section class="space-y-2">
      <div class="flex gap-2">
        <input v-model="saveName" aria-label="experiment name" class="lab-input" placeholder="Name this experiment" maxlength="120" />
        <button class="rounded-lg border border-[rgba(var(--c-text),.28)] px-3 text-[length:var(--l-xs)] hover:bg-[rgba(var(--c-text),.1)]" @click="save">Save</button>
      </div>
      <p v-if="msg" class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">{{ msg }}</p>
      <table v-if="saved.length" class="w-full text-[length:var(--l-xs)] tabular-nums" data-testid="saved">
        <thead><tr class="text-[rgb(var(--c-faint))]"><th class="text-left">experiment</th><th class="text-right">iter</th><th class="text-right">inertia</th></tr></thead>
        <tbody><tr v-for="e in saved.slice(0, 6)" :key="e.id" class="cursor-pointer border-t border-[rgba(var(--c-text),.12)] hover:bg-[rgba(var(--c-text),.05)]" @click="loadSaved(e.simulation_id)">
          <td class="truncate py-1">{{ e.name }}</td><td class="text-right">{{ e.iterations }}</td><td class="text-right">{{ e.final_inertia.toFixed(2) }}</td></tr></tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.lab-label { display: block; margin-bottom: 0.2rem; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; }
.lab-input { width: 100%; border-radius: 0.5rem; border: 1px solid #334155; background: #0f172a; padding: 0.4rem 0.6rem; color: #e2e8f0; font-size: 0.85rem; }
.lab-input:focus { outline: 2px solid #22d3ee55; border-color: #22d3ee; }
</style>
