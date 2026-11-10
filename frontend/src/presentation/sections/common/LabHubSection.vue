<script setup lang="ts">
/** Appendix (after the conclusion): the working, backend-computed simulations, for exploration after the lecture. */
import { onMounted } from 'vue'
import { useShell } from '../../shell/shellApi'

const shell = useShell()
onMounted(() => shell.setFieldAlpha(0.6))
const LABS = [
  { title: 'K-Means clustering', text: 'Iris, unlabelled. Every assignment, distance and centroid comes from the FastAPI trace. Play, step, scrub, change K.', to: '/lessons/kmeans-iris', tag: 'unsupervised · idea of DS4A §8.2; method beyond Ch. 8', primary: true },
  { title: 'Movies: regression in 3D', text: 'The worked example as a 3D lesson: the regression plane, the cost bowl and the descent path. Story, Explore and Math modes.', to: '/lessons/shah-8-4-movies', tag: 'Shah Problem 8.4' },
  { title: 'Decision trees', text: 'Grow a tree, read its rules, follow a prediction path. Depth versus interpretability.', to: '/decision-trees', tag: 'supervised · DS4A §8.3' },
  { title: 'Regression & gradient descent', text: 'Fit a line by least squares, then watch gradient descent find it iteration by iteration.', to: '/gradient-descent', tag: 'supervised · Shah Ch. 8' },
  { title: 'Model evaluation', text: 'Train/test split, confusion matrix, overfitting and underfitting.', to: '/evaluation', tag: 'DS4A §8.4' },
  { title: 'Apply the concepts', text: 'The eight end-of-chapter activities as short films: Story, Try it, Solution.', to: '/activities', tag: 'DS4A pp. 398–401' },
]
</script>

<template>
  <section class="hub" data-testid="section-lab">
    <div class="kicker">Appendix · Algorithm lab · after the lecture</div>
    <h1>Watch real algorithms learn</h1>
    <p class="lead">Each simulation runs on the backend. The screen only draws what was computed.</p>
    <div class="labs">
      <RouterLink v-for="l in LABS" :key="l.to" :to="`${l.to}?return=${encodeURIComponent('/presentation/lab')}`" class="lab" :class="{ primary: l.primary }" :data-testid="'lab-' + l.to.split('/').pop()">
        <small>{{ l.tag }}</small>
        <strong>{{ l.title }}</strong>
        <span>{{ l.text }}</span>
        <em>Open →</em>
      </RouterLink>
    </div>
    <p class="note">k-Nearest Neighbours (classification) is planned for this section, with a new backend trace.</p>
  </section>
</template>

<style scoped>
.hub { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: safe center; padding: 80px 7vw 90px; overflow-y: auto; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
h1 { font: 600 clamp(32px, 4vw, 64px) 'Space Grotesk', system-ui; margin: 12px 0 6px; }
.lead { color: rgb(var(--c-soft)); font-size: clamp(16px, 1.3vw, 22px); }
.labs { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 34px; }
.lab { display: flex; flex-direction: column; gap: 10px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .78); border: 1px solid rgba(var(--c-data), .2); backdrop-filter: blur(8px); transition: transform .2s, border-color .2s; }
.lab:hover { transform: translateY(-3px); border-color: rgb(var(--c-data)); }
.lab.primary { border-color: rgba(var(--c-human), .7); }
.lab small { font-size: max(12px, var(--up-12, 12px)); letter-spacing: .1em; text-transform: uppercase; color: rgb(var(--c-faint)); }
.lab strong { font: 600 max(21px, var(--up-21, 21px)) 'Space Grotesk', system-ui; }
.lab span { font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.45; }
.lab em { margin-top: auto; font-style: normal; font-weight: 600; color: rgb(var(--c-data)); }
.note { margin-top: 22px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-faint)); }
@media (max-width: 900px) { .labs { grid-template-columns: 1fr 1fr; } }
</style>
