<script setup lang="ts">
import { SHOW_EXTRA_PAGES } from '../features'
/** Hub for the cinematic activities: DS4A "Applying the Concepts" (and Shah's Hands-On Problems as they are added). */
import { computed } from 'vue'
import { usePresentation } from '../presentation/store'
import { themeVars } from '../presentation/theme'
import { ACTIVITIES } from './registry'

const store = usePresentation()
const vars = computed(() => themeVars(store.theme, 'lab'))
const ds4a = computed(() => ACTIVITIES.filter((a) => a.book === 'DS4A'))
const hoids = computed(() => ACTIVITIES.filter((a) => a.book === 'HoIDS'))
</script>

<template>
  <div class="hub" :style="vars" :data-theme="store.theme" data-testid="activities-hub">
    <header>
      <RouterLink :to="SHOW_EXTRA_PAGES ? '/' : '/presentation'" class="back">{{ SHOW_EXTRA_PAGES ? '← ML Lab' : '← Presentation' }}</RouterLink>
      <p class="kick">Cinematic activities · Chapter 8</p>
      <h1>Apply the concepts</h1>
      <p class="lead">Each end-of-chapter exercise as a short film: watch the <b>Story</b>, then <b>Try it</b> yourself, then open the worked <b>Solution</b>. Every number is computed by the backend on the book's own data.</p>
    </header>
    <section>
      <h2>Data Science for All · Applying the Concepts <span>pp. 398–401</span></h2>
      <div class="grid">
        <RouterLink v-for="a in ds4a" :key="a.id" :to="`/activities/${a.id}`" class="card" :style="{ borderColor: `rgb(var(--c-${a.tone}))` }" :data-testid="`hub-${a.id}`">
          <span class="lab">{{ a.label }} · {{ a.page }}</span><strong>{{ a.title }}</strong><span class="blurb">{{ a.blurb }}</span><span class="go">Watch →</span>
        </RouterLink>
      </div>
    </section>
    <section>
      <h2>Hands-On Introduction to Data Science · Hands-On Problems <span>Chapter 8, pp. 231–233</span></h2>
      <RouterLink v-if="SHOW_EXTRA_PAGES" to="/workshops/movies" class="card lesson classroom" data-testid="hub-movie-workshop">
        <span class="lab">Start here · Classroom journey · Problem 8.4</span>
        <strong>Can money buy a better movie rating?</strong>
        <span class="blurb">Story → Predict → Watch → Try → Solution. Meet real movies, make an audience prediction, connect a fitted line to its cost bowl, and test what happens when steps get too large.</span>
        <span class="go">Present the interactive example →</span>
      </RouterLink>
      <p class="sub">Continue with Restaurants for a first plane, Airlines to extend a line to a plane, or Rock Samples to explore a slice of a model with three predictors.</p>
      <p class="sub">3D cinematic lessons: watch the regression plane tilt into place and gradient descent roll down the real cost bowl.</p>
      <div class="grid lessons">
        <RouterLink v-for="a in hoids.filter((x) => x.lesson)" :key="a.lesson" :to="`/lessons/${a.lesson}`" class="card lesson" :data-testid="`hub-lesson-${a.lesson}`">
          <span class="lab">▶ 3D lesson · {{ a.label }}</span><strong>{{ a.title }}</strong><span class="blurb">Story, Explore and Math modes, like the K-Means lesson.</span><span class="go">Start the lesson →</span>
        </RouterLink>
      </div>
      <p class="sub">Short activities: Story, Try it, Solution.</p>
      <div v-if="hoids.length" class="grid">
        <RouterLink v-for="a in hoids" :key="a.id" :to="`/activities/${a.id}`" class="card" :style="{ borderColor: `rgb(var(--c-${a.tone}))` }" :data-testid="`hub-${a.id}`">
          <span class="lab">{{ a.label }} · {{ a.page }}</span><strong>{{ a.title }}</strong><span class="blurb">{{ a.blurb }}</span><span class="go">Watch →</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hub { min-height: 100vh; padding: 28px 5vw 60px; background: radial-gradient(ellipse at 50% 0%, rgba(var(--c-accent), .1), rgb(var(--c-ground)) 50%, rgb(var(--c-ground2))); background-color: rgb(var(--c-ground)); color: rgb(var(--c-text)); font-family: 'Inter', system-ui, sans-serif; }
.back { font-size: 14px; color: rgb(var(--c-dim)); }
.kick { margin-top: 24px; font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
h1 { font: 600 clamp(34px, 4vw, 64px) / 1.05 'Space Grotesk', system-ui; margin-top: 6px; }
.lead { max-width: 75ch; margin-top: 14px; font-size: clamp(15px, 1.2vw, 20px); color: rgb(var(--c-soft)); line-height: 1.55; }
.lead b { color: rgb(var(--c-accent)); }
section { margin-top: 36px; }
h2 { font: 600 clamp(17px, 1.4vw, 23px) 'Space Grotesk', system-ui; margin-bottom: 14px; }
h2 span { font: 400 14px 'Inter', system-ui; color: rgb(var(--c-dim)); margin-left: 8px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; border-radius: 18px; background: rgba(var(--c-surface), .85); border-top: 3px solid; transition: transform .25s, background .25s; }
.card:hover { transform: translateY(-3px); background: rgba(var(--c-surface), 1); }
.lab { font: 600 12px 'Space Grotesk', system-ui; letter-spacing: .1em; text-transform: uppercase; color: rgb(var(--c-dim)); }
.card strong { font: 600 18px 'Space Grotesk', system-ui; line-height: 1.25; }
.blurb { font-size: 14px; color: rgb(var(--c-soft)); line-height: 1.45; flex: 1; }
.go { font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.soon { font-size: 15px; color: rgb(var(--c-dim)); margin-top: 12px; }
.sub { margin: 10px 0 10px; font-size: 14px; color: rgb(var(--c-soft)); }
.card.lesson { border-top-color: rgb(var(--c-accent)); background: linear-gradient(160deg, rgba(var(--c-accent), .16), rgba(var(--c-surface), .85)); }
.classroom { margin: 18px 0; padding: 28px; max-width: 1100px; } .classroom strong { font-size: clamp(24px, 2.5vw, 36px); } .classroom .blurb { font-size: 18px; max-width: 85ch; }
</style>
