<script setup lang="ts">
/**
 * Back to the movies (audit §4/§7): the worked example's R² was measured on the movies each model was fitted to. Here
 * the same complete movies are split once (fixed seed); each model is fitted on the training movies only and scored on
 * held-out movies, next to a baseline that always predicts the training mean. The movie the class picked in the worked
 * example comes along (presentation store). → reveals: fitted scores, held-out scores, the selected movie and the
 * spread over many splits. Every number from `GET /concepts/movie-holdout`.
 */
import { computed, onMounted, ref } from 'vue'
import { presentationApi, type MovieHoldout } from '../../api'
import { errorMessage } from '../../../api/client'
import { usePresentation } from '../../store'

const store = usePresentation()
const data = ref<MovieHoldout | null>(null)
const error = ref<string | null>(null)
const stage = ref(0)
onMounted(async () => { try { data.value = await presentationApi.movieHoldout() } catch (e) { error.value = errorMessage(e) } })
function advance(): boolean { if (stage.value < 2) { stage.value++; return true } return false }
defineExpose({ advance })

const f3 = (v: number) => v.toFixed(3)
const movie = computed(() => data.value?.movies.find((m) => m.label === store.movie) ?? null)
const budget = computed(() => data.value?.models.find((m) => m.id === 'budget') ?? null)
</script>

<template>
  <div class="mr" data-testid="m-movies-return">
    <div v-if="error" class="err">The backend is not reachable ({{ error }}).</div>
    <div v-else-if="!data" class="loading">Splitting the movies…</div>
    <template v-else>
      <p class="lead">The same {{ data.n }} complete movies, split once (seed {{ data.seed }}): <b>{{ data.n_train }} training</b> movies to fit each model, <b>{{ data.n_test }} held-out</b> movies it never sees.</p>
      <table class="tbl" data-testid="movies-holdout-table">
        <thead>
          <tr><th>Model</th><th>R², fitted on all {{ data.n }} movies<small>in-sample (the worked example)</small></th><th :class="{ dim: stage < 1 }">R², training movies<small>in-sample</small></th><th :class="{ dim: stage < 1 }">R², held-out movies<small>never seen</small></th><th :class="{ dim: stage < 1 }">MSE, held-out<small>baseline {{ f3(data.baseline_test_mse) }}</small></th></tr>
        </thead>
        <tbody>
          <tr v-for="m in data.models" :key="m.id" :data-testid="`holdout-${m.id}`">
            <td>{{ m.label }}</td><td>{{ f3(m.fitted_r2_all) }}</td>
            <td :class="{ dim: stage < 1 }">{{ stage >= 1 ? f3(m.train_r2) : '?' }}</td>
            <td :class="{ dim: stage < 1, warn: stage >= 1 && m.test_r2 < m.train_r2 / 2 }">{{ stage >= 1 ? f3(m.test_r2) : '?' }}</td>
            <td :class="{ dim: stage < 1 }">{{ stage >= 1 ? f3(m.test_mse) : '?' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="stage >= 1" class="note">Baseline: always predict the training movies' mean rating. A held-out R² near zero means the model predicts the new movies little better than their own average rating would; a negative R² means worse. Compare each MSE with the baseline.</p>
      <div v-if="stage >= 2" class="pair">
        <div v-if="movie && budget" class="card" data-testid="movies-return-selected">
          <strong>{{ movie.label }}</strong>
          <span>{{ movie.set === 'test' ? 'held out: the budget model never saw it' : 'a training movie: the budget model learned from it' }}</span>
          <span>observed rating {{ movie.rating }} · budget-only prediction {{ f3(movie.budget_prediction) }}</span>
        </div>
        <div class="card" data-testid="movies-return-spread">
          <strong>One split is one sample</strong>
          <span>Over {{ data.budget_test_r2_over_seeds.seeds }} different random splits, the budget model's held-out R² ranged from {{ f3(data.budget_test_r2_over_seeds.min) }} to {{ f3(data.budget_test_r2_over_seeds.max) }} (median {{ f3(data.budget_test_r2_over_seeds.median) }}).</span>
        </div>
      </div>
      <p class="src">{{ data.source }} · least squares fitted by the backend · held-out scores are a final check here, not used to choose a model</p>
    </template>
  </div>
</template>

<style scoped>
.mr { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.lead { font-size: clamp(17px, 1.3vw, 23px); line-height: 1.5; }
.lead b { color: rgb(var(--c-accent)); }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; font-size: max(clamp(16px, 1.2vw, 21px), var(--up-16, 16px)); font-variant-numeric: tabular-nums; }
.tbl th { text-align: right; font: 600 max(clamp(13px, .95vw, 16px), var(--up-13, 13px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); padding: 0 12px 4px; vertical-align: bottom; }
.tbl th:first-child, .tbl td:first-child { text-align: left; }
.tbl th small { display: block; font: 400 max(clamp(12px, .85vw, 14px), var(--up-12, 12px)) 'Inter', system-ui; color: rgb(var(--c-dim)); }
.tbl td { text-align: right; padding: 10px 12px; background: rgba(var(--c-surface), .78); }
.tbl td:first-child { border-radius: 10px 0 0 10px; font-weight: 600; } .tbl td:last-child { border-radius: 0 10px 10px 0; }
.dim { opacity: .35; }
.warn { color: rgb(var(--c-warn)); font-weight: 700; }
.note { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.card { display: flex; flex-direction: column; gap: 4px; padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .8); border-left: 4px solid rgb(var(--c-accent)); font-size: max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)); }
.card strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
.err { color: rgb(var(--c-warn)); } .loading { color: rgb(var(--c-dim)); }
@media (max-width: 1000px) { .pair { grid-template-columns: 1fr; } }
</style>
