<script setup lang="ts">
/**
 * Four tasks that need intelligence, each a small looping SVG animation (GSAP). Reduced motion: still frames.
 * Examples come from the chapter: medical imaging (p. 363), translation (p. 365), recommendations (p. 367), fruit sorting (Fig. 8.3).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { TASKS } from './content'

const props = defineProps<{ reduced: boolean }>()
const root = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

const words = ['Hello,', 'how', 'are', 'you?']
const target = ['Përshëndetje,', 'si', 'jeni?']
const fruits = Array.from({ length: 6 }, (_, i) => ({ i, ripe: [true, false, true, true, false, true][i] }))

onMounted(() => {
  if (props.reduced || !root.value) return
  ctx = gsap.context(() => {
    // 1 imaging: scan line sweeps, then the highlight box appears
    gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
      .fromTo('.scanline', { attr: { y: 22 } }, { attr: { y: 178 }, duration: 2.2, ease: 'none' })
      .fromTo('.finding', { opacity: 0, scale: 1.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out' }, '-=0.9')
      .to('.finding', { opacity: 0, duration: 0.5 }, '+=1.4')
    // 2 language: source words, pulse, target words
    gsap.timeline({ repeat: -1, repeatDelay: 1 })
      .fromTo('.src-w', { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.18, duration: 0.35 })
      .fromTo('.pulse', { attr: { cx: 40 } }, { attr: { cx: 260 }, duration: 0.9, ease: 'power1.inOut' })
      .fromTo('.dst-w', { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.22, duration: 0.35 })
      .to(['.src-w', '.dst-w'], { opacity: 0, duration: 0.5 }, '+=1.6')
    // 3 recommendations: links light up, one item is chosen
    gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
      .fromTo('.rlink', { strokeDashoffset: 120 }, { strokeDashoffset: 0, stagger: 0.12, duration: 0.6 })
      .to('.item-3', { attr: { stroke: 'rgb(var(--c-human))' }, duration: 0.3 })
      .fromTo('.star', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out' })
      .to(['.star'], { opacity: 0, duration: 0.4 }, '+=1.4')
      .to('.item-3', { attr: { stroke: 'rgba(var(--c-dim), .5)' }, duration: 0.3 }, '<')
    // 4 vision: fruit moves along the belt and drops into the right bin
    fruits.forEach((f) => {
      gsap.timeline({ repeat: -1, delay: f.i * 0.7 })
        .fromTo(`.fruit-${f.i}`, { attr: { cx: 20, cy: 70 }, opacity: 0 }, { attr: { cx: 150 }, opacity: 1, duration: 1.4, ease: 'none' })
        .to(`.fruit-${f.i}`, { attr: { cx: f.ripe ? 230 : 75, cy: 160 }, duration: 0.8, ease: 'power2.in' })
        .to(`.fruit-${f.i}`, { opacity: 0, duration: 0.3 })
        .to({}, { duration: 6 * 0.7 - 2.5 })
    })
  }, root.value)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div ref="root" class="tasks" data-testid="task-vignettes">
    <figure v-for="(t, k) in TASKS" :key="t.id" class="task" :style="{ animationDelay: k * 0.15 + 's' }">
      <svg viewBox="0 0 300 200" class="art" :class="'art-' + t.id" aria-hidden="true">
        <template v-if="t.id === 'imaging'">
          <ellipse cx="150" cy="100" rx="70" ry="80" stroke-width="7" opacity=".85" style="fill: none; stroke: rgb(var(--c-soft))" />
          <ellipse cx="150" cy="100" rx="58" ry="68" style="fill: rgba(140,170,200,.18); stroke: rgba(var(--c-soft), .35)" />
          <ellipse cx="135" cy="96" rx="9" ry="22" transform="rotate(-18 135 96)" style="fill: rgb(var(--c-ground2))" />
          <ellipse cx="165" cy="96" rx="9" ry="22" transform="rotate(18 165 96)" style="fill: rgb(var(--c-ground2))" />
          <circle cx="182" cy="66" r="9" style="fill: rgba(var(--c-human), .55)" />
          <rect class="finding" x="166" y="50" width="32" height="32" stroke-width="3" :opacity="reduced ? 1 : 0" style="fill: none; stroke: rgb(var(--c-human))" />
          <rect class="scanline" x="70" y="100" width="160" height="2.5" :opacity="reduced ? 0 : 0.9" style="fill: rgb(var(--c-data))" />
        </template>
        <template v-else-if="t.id === 'language'">
          <text v-for="(w, i) in words" :key="w" class="src-w" :x="30 + i * 62" y="62" font-size="22" font-family="Inter" style="fill: rgb(var(--c-text))">{{ w }}</text>
          <line x1="40" y1="100" x2="260" y2="100" stroke-width="2" stroke-dasharray="4 6" style="stroke: rgba(var(--c-data), .35)" />
          <circle class="pulse" cx="150" cy="100" r="7" style="fill: rgb(var(--c-data))" />
          <text v-for="(w, i) in target" :key="w" class="dst-w" :x="[30, 184, 214][i]" y="150" font-size="22" font-family="Inter" style="fill: rgb(var(--c-data-soft))">{{ w }}</text>
          <text x="30" y="185" font-size="13" font-family="Inter" style="fill: rgb(var(--c-faint))">English → Albanian</text>
        </template>
        <template v-else-if="t.id === 'recommend'">
          <circle cx="50" cy="100" r="18" style="fill: rgb(var(--c-data))" />
          <circle cx="50" cy="93" r="6" style="fill: rgb(var(--c-ground2))" />
          <path d="M38 112 q12 -12 24 0" style="fill: rgb(var(--c-ground2))" />
          <line v-for="i in 4" :key="'l' + i" class="rlink" x1="70" y1="100" :x2="190" :y2="25 + (i - 1) * 50" stroke-width="1.5" stroke-dasharray="120" style="stroke: rgba(var(--c-data), .5)" />
          <rect v-for="i in 4" :key="'r' + i" :class="'item-' + i" :x="192" :y="8 + (i - 1) * 50" width="86" height="34" rx="6" stroke-width="2" style="fill: rgba(var(--c-surface), .9); stroke: rgba(var(--c-dim), .5)" />
          <text v-for="i in 4" :key="'t' + i" :x="204" :y="30 + (i - 1) * 50" font-size="13" font-family="Inter" style="fill: rgb(var(--c-soft))">{{ ['Drama', 'Sci-fi', 'Documentary', 'Comedy'][i - 1] }}</text>
          <text class="star" x="282" y="136" font-size="22" :opacity="reduced ? 1 : 0" style="fill: rgb(var(--c-human))">★</text>
        </template>
        <template v-else>
          <rect x="10" y="80" width="190" height="8" rx="4" style="fill: rgba(var(--c-dim), .35)" />
          <circle cx="150" cy="40" r="14" stroke-width="2.5" style="fill: none; stroke: rgb(var(--c-data))" />
          <circle cx="150" cy="40" r="5" style="fill: rgb(var(--c-data))" />
          <path d="M150 54 L150 72" stroke-dasharray="3 3" style="stroke: rgba(var(--c-data), .5)" />
          <rect x="40" y="150" width="70" height="40" rx="6" style="fill: rgba(var(--c-ok), .12); stroke: rgb(var(--c-ok))" />
          <rect x="195" y="150" width="70" height="40" rx="6" style="fill: rgba(var(--c-warn), .12); stroke: rgb(var(--c-warn))" />
          <text x="52" y="196" font-size="12" font-family="Inter" dy="-8" style="fill: rgb(var(--c-ok))">unripe</text>
          <text x="214" y="196" font-size="12" font-family="Inter" dy="-8" style="fill: rgb(var(--c-warn))">ripe</text>
          <circle v-for="f in fruits" :key="f.i" :class="'fruit-' + f.i" :cx="reduced ? 60 + f.i * 22 : 20" cy="70" r="9" :opacity="reduced ? 1 : 0" :style="{ fill: f.ripe ? 'rgb(var(--c-warn))' : '#8fd36a' }" />
        </template>
      </svg>
      <figcaption>
        <strong>{{ t.title }}</strong>
        <span>{{ t.example }}</span>
        <small>DS4A {{ t.source }}</small>
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.tasks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; width: 100%; }
.task { display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 20px; background: rgba(var(--c-surface), .6); border: 1px solid rgba(var(--c-data), .16); animation: rise .8s ease both; }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.art { width: 100%; height: auto; }
figcaption { display: flex; flex-direction: column; gap: 4px; }
strong { font: 600 clamp(17px, 1.35vw, 23px) 'Space Grotesk', system-ui; }
span { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-soft)); line-height: 1.4; }
small { font-size: max(12px, var(--up-12, 12px)); color: rgb(var(--c-faint)); }
@media (max-width: 900px) { .tasks { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .task { animation: none; } }
</style>
