<script setup lang="ts">
/** Mode C — the mathematics behind the current visual event, with real values from the trace substituted in. */
import { computed, ref } from 'vue'
import { useLessonStore } from '../../stores/lesson'
import { CLUSTER_COLORS, mathAt, stateAt } from './state'
import InertiaChart from './InertiaChart.vue'

const props = defineProps<{ large?: boolean }>()
const store = useLessonStore()
const advanced = ref(false)
const showCode = ref(false)
const info = computed(() => (store.timeline && store.simulation ? mathAt(store.timeline, store.simulation.trace, store.position) : null))
const series = computed(() => (store.timeline && store.simulation ? stateAt(store.timeline, store.simulation.trace, store.position).inertiaSeries : []))
const trace = computed(() => store.simulation?.trace)
const f = (v: number, d = 3) => (Number.isFinite(v) ? Number(v.toFixed(d)).toString() : '—')
const vec = (a: number[], d = 3) => `(${a.map((x) => f(x, d)).join(', ')})`
const mu = (j: number) => `μ${String(j + 1).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('')}`
const col = (j: number) => CLUSTER_COLORS[j % CLUSTER_COLORS.length]
const stageOrder = ['focus', 'lines', 'subtract', 'square', 'sum', 'sqrt', 'compare', 'assign']
const reached = (stage: string) => {
  const i = info.value
  return !!i && i.kind === 'distance' && stageOrder.indexOf(i.stage ?? 'focus') >= stageOrder.indexOf(stage)
}
const CODE: Record<string, string> = {
  distance: 'diff = X[:, None, :] - C[None, :, :]\nD = np.sqrt(np.sum(diff * diff, axis=2))   # n × k distances\nlabels = np.argmin(D, axis=1)                # nearest centroid',
  assign: 'labels = np.argmin(D, axis=1)\ninertia = np.sum(D[np.arange(n), labels] ** 2)',
  update: 'counts = np.bincount(labels, minlength=k)\nsums = np.zeros((k, d)); np.add.at(sums, labels, X)\nC_new[nonempty] = sums[nonempty] / counts[nonempty, None]',
  init: 'd2 = np.min(((X[:, None] - X[chosen][None]) ** 2).sum(2), axis=1)\nprobs = d2 / d2.sum()\nidx = np.searchsorted(np.cumsum(probs), rng.random(), side="right")',
  converge: 'if changed == 0: stop = "converged_labels"\nelif shift_sq <= tol: stop = "converged_tol"',
}
</script>

<template>
  <div v-if="info && trace" :class="['space-y-3 text-[rgb(var(--c-text))]', large ? 'text-[length:var(--l-lg)]' : 'text-[length:var(--l-sm)]']" data-testid="math-panel">
    <!-- INTRO -->
    <template v-if="info.kind === 'intro'">
      <p>A <b class="text-[rgb(var(--c-pred))]">dataset</b> is a table: each row is an <b>observation</b> (one flower), each column a <b>feature</b> (one measurement).</p>
      <table v-if="store.dataset" class="w-full text-[length:var(--l-xs)] tabular-nums">
        <thead><tr class="text-[rgb(var(--c-dim))]"><th class="text-left">#</th><th v-for="h in store.dataset.features" :key="h" class="text-right">{{ h.replace('_cm', '').replace('_', ' ') }}</th></tr></thead>
        <tbody><tr v-for="i in [0, 50, 100]" :key="i" class="border-t border-[rgba(var(--c-text),.12)]"><td>{{ i + 1 }}</td><td v-for="(v, j) in store.dataset.observations[i]" :key="j" class="text-right" :class="trace.features.includes(store.dataset.features[j]) ? 'text-[rgb(var(--c-pred))]' : ''">{{ v }}</td></tr></tbody>
      </table>
      <p>The two highlighted features become coordinates: flower → point <span class="font-mono">(x, y) = ({{ trace.features[0].replace('_cm','') }}, {{ trace.features[1].replace('_cm','') }})</span>. {{ info.n }} flowers → {{ info.n }} points.</p>
    </template>

    <template v-else-if="info.kind === 'problem'">
      <p><b class="text-[rgb(var(--c-feature))]">Unsupervised learning</b>: there is no response variable. The algorithm sees only {{ info.n }} positions — never the species.</p>
      <p><b>Clustering</b> asks: which points belong together? K-Means answers by minimising the total squared distance of points to their group centre.</p>
      <div class="formula-dark">J = Σⱼ Σ<sub>x∈Cⱼ</sub> ‖x − μⱼ‖²</div>
    </template>

    <template v-else-if="info.kind === 'choose-k'">
      <p><b class="text-[rgb(var(--c-pred))]">K = {{ info.k }}</b>: K-Means looks for exactly {{ info.k }} groups. K is chosen by us — the algorithm cannot discover it.</p>
      <p>Each group j has a <b>centroid</b> μⱼ: a point in the same feature space as the flowers, which will move to the centre of its group.</p>
      <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Initialization: {{ info.method }} · seed {{ info.seed }} (the same seed always gives the same start).</p>
    </template>

    <!-- INIT -->
    <template v-else-if="info.kind === 'init'">
      <p>Centroid <b :style="{ color: col(info.centroid) }">{{ mu(info.centroid) }}</b> starts at {{ info.point !== null ? `flower #${info.point + 1}` : 'a given position' }}: <span class="font-mono">{{ vec(info.coords, 2) }}</span>.</p>
      <template v-if="info.method === 'k-means++'">
        <div class="formula-dark">P(xᵢ) = D(xᵢ)² / Σ D(x)²</div>
        <p v-if="info.d2 !== null">D² of this flower = <b class="font-mono">{{ f(info.d2) }}</b>, Σ D² = <span class="font-mono">{{ f(info.d2sum ?? 0, 2) }}</span> → probability <b class="font-mono text-[rgb(var(--c-ref))]">{{ f((info.probability ?? 0) * 100, 2) }}%</b> (random draw u = {{ f(info.draw ?? 0, 4) }}).</p>
        <p v-else>The first centre is chosen uniformly: probability 1/{{ trace.n }} = {{ f((info.probability ?? 0) * 100, 2) }}%.</p>
      </template>
      <p v-else class="text-[rgb(var(--c-dim))]">Random initialization: K distinct flowers are drawn uniformly (seed {{ trace.initialization.seed }}).</p>
      <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Different seeds can give different starts — and different final clusters.</p>
    </template>

    <!-- DISTANCE -->
    <template v-else-if="info.kind === 'distance'">
      <p>Flower <b>#{{ info.point + 1 }}</b>: x = <span class="font-mono text-[rgb(var(--c-strong))]">{{ vec(info.x, 2) }}</span></p>
      <div class="formula-dark">d(x, μⱼ) = √( (x₁ − μⱼ₁)² + (x₂ − μⱼ₂)² )</div>
      <div v-for="r in info.rows" :key="r.centroid" :class="['rounded-lg px-3 py-2 font-mono text-[length:var(--l-xs)] leading-relaxed transition-colors', reached('compare') && r.centroid === info.nearest ? 'bg-[rgba(var(--c-text),.1)] ring-1' : 'bg-[rgba(var(--c-text),.05)]']" :style="{ '--tw-ring-color': col(r.centroid) }">
        <div :style="{ color: col(r.centroid) }">{{ mu(r.centroid) }} = {{ vec(r.mu, 3) }}</div>
        <div v-if="reached('subtract')" :class="info.stage === 'subtract' ? 'text-[rgb(var(--c-pred))]' : ''">differences: {{ r.diff.map((d) => f(d)).join(', ') }}</div>
        <div v-if="reached('square')" :class="info.stage === 'square' ? 'text-[rgb(var(--c-pred))]' : ''">squares: {{ r.sq.map((d) => f(d, 4)).join(' + ') }}</div>
        <div v-if="reached('sum')" :class="info.stage === 'sum' ? 'text-[rgb(var(--c-pred))]' : ''">sum = {{ f(r.sum, 4) }}</div>
        <div v-if="reached('sqrt')" :class="info.stage === 'sqrt' ? 'text-[rgb(var(--c-pred))]' : ''">d = √{{ f(r.sum, 4) }} = <b class="text-[rgb(var(--c-strong))]">{{ f(r.d, 4) }}</b></div>
      </div>
      <p v-if="reached('compare')">Smallest distance → <b :style="{ color: col(info.nearest) }">{{ mu(info.nearest) }}</b>. This flower joins cluster {{ info.nearest + 1 }}.</p>
    </template>

    <!-- ASSIGN -->
    <template v-else-if="info.kind === 'assign'">
      <p>Iteration <b>{{ info.iteration }}</b> — assignment: every flower goes to its nearest centroid.</p>
      <div class="formula-dark">cluster(x) = argminⱼ d(x, μⱼ)</div>
      <p><b>{{ info.changed }}</b> flower{{ info.changed === 1 ? '' : 's' }} {{ info.iteration === 1 ? 'assigned' : 'changed cluster' }}. Cluster sizes: <span class="font-mono">{{ info.counts.join(' · ') }}</span>.</p>
      <p>Inertia J = <b class="font-mono text-[rgb(var(--c-pred))]">{{ f(info.inertia, 4) }}</b></p>
    </template>

    <!-- UPDATE -->
    <template v-else-if="info.kind === 'update'">
      <p>Iteration <b>{{ info.iteration }}</b> — update: each centroid moves to the mean of its points.</p>
      <div class="formula-dark">μⱼ = (1 / |Cⱼ|) Σ<sub>x∈Cⱼ</sub> x</div>
      <div v-for="c in info.clusters" :key="c.centroid" class="rounded-lg bg-[rgba(var(--c-text),.05)] px-3 py-2 font-mono text-[length:var(--l-xs)] leading-relaxed">
        <div :style="{ color: col(c.centroid) }">{{ mu(c.centroid) }}: |C| = {{ c.count }}</div>
        <div>Σx = {{ vec(c.sum, 2) }}</div>
        <div>mean = {{ vec(c.sum, 2) }} / {{ c.count }} = <b class="text-[rgb(var(--c-strong))]">{{ vec(c.mean, 4) }}</b></div>
        <div class="text-[rgb(var(--c-dim))]">moved {{ f(c.movement, 4) }} from {{ vec(c.before, 3) }}</div>
      </div>
      <p v-for="r in info.reseeded" :key="r.cluster" class="text-[rgb(var(--c-ref))]">Cluster {{ r.cluster + 1 }} was empty and was re-seeded at flower #{{ r.point_index + 1 }}.</p>
      <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">J with the new centroids: {{ f(info.inertiaAfter, 4) }} · total squared movement {{ f(info.shiftSq, 6) }}</p>
    </template>

    <!-- CONVERGE -->
    <template v-else-if="info.kind === 'converge'">
      <p v-if="info.stop === 'converged_labels'">After {{ info.iterations }} iterations no flower changed cluster (last iteration: {{ info.lastChanged }} changes) → <b class="text-[rgb(var(--c-ok))]">converged</b>.</p>
      <p v-else-if="info.stop === 'converged_tol'">Centroids moved less than the tolerance (Σ shift² = {{ f(info.lastShiftSq, 8) }} ≤ {{ trace.tol }}) → <b class="text-[rgb(var(--c-ok))]">converged</b>.</p>
      <p v-else class="text-[rgb(var(--c-ref))]">Stopped at the iteration limit ({{ trace.max_iter }}) — not converged.</p>
      <p>Final inertia J = <b class="font-mono">{{ f(info.inertia, 4) }}</b>. Convergence means a <i>local</i> optimum — another initialization can do better or worse.</p>
    </template>

    <!-- RESULTS -->
    <template v-else-if="info.kind === 'results'">
      <p>{{ info.k }} clusters, inertia {{ f(info.inertia, 3) }}. Species (never used by K-Means) versus clusters:</p>
      <table v-if="info.crosstab" class="w-full text-[length:var(--l-xs)] tabular-nums" data-testid="crosstab">
        <thead><tr class="text-[rgb(var(--c-dim))]"><th class="text-left">species</th><th v-for="j in info.k" :key="j" class="text-right" :style="{ color: col(j - 1) }">{{ mu(j - 1) }}</th></tr></thead>
        <tbody><tr v-for="c in info.classes" :key="c" class="border-t border-[rgba(var(--c-text),.12)]"><td>{{ c }}</td><td v-for="j in info.k" :key="j" class="text-right">{{ info.crosstab[c][String(j - 1)] }}</td></tr></tbody>
      </table>
      <p class="text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">Clusters are not species: K-Means groups by distance in the chosen features only, and two species overlap there.</p>
    </template>

    <div class="pt-1">
      <div class="mb-1 text-[length:var(--l-xs)] font-semibold tracking-wider text-[rgb(var(--c-faint))] uppercase">Inertia per iteration</div>
      <InertiaChart :series="series" :total="trace.iterations.length" />
    </div>

    <div class="flex gap-3 pt-1 text-[length:var(--l-xs)]">
      <button class="text-[rgb(var(--c-pred))] hover:underline" @click="advanced = !advanced">{{ advanced ? 'Hide' : 'Show' }} advanced</button>
      <button v-if="CODE[info.kind]" class="text-[rgb(var(--c-pred))] hover:underline" @click="showCode = !showCode">{{ showCode ? 'Hide' : 'Show' }} Python</button>
    </div>
    <p v-if="advanced" class="text-[length:var(--l-xs)] leading-relaxed text-[rgb(var(--c-dim))]">
      K-Means minimises J = Σ‖xᵢ − μ<sub>c(i)</sub>‖² by coordinate descent: the assignment step minimises J over c with μ fixed, the update step
      minimises J over μ with c fixed (the mean is the point minimising squared distance). J therefore never increases and the labels must
      eventually repeat — but only a local minimum is guaranteed (the problem is NP-hard in general).
    </p>
    <pre v-if="showCode && CODE[info.kind]" class="overflow-x-auto rounded-lg bg-[rgba(var(--c-ground2),.4)] p-3 text-[length:var(--l-xs)] leading-relaxed text-[rgb(var(--c-ok))]">{{ CODE[info.kind] }}
# backend/app/ml/kmeans.py</pre>
  </div>
</template>

<style scoped>
.formula-dark { font-family: 'Cambria Math', 'STIX Two Math', Cambria, serif; font-size: 1.05em; padding: 0.4rem 0.75rem; border-radius: 0.5rem; background: rgba(34, 211, 238, 0.07); color: #e0f2fe; }
</style>
