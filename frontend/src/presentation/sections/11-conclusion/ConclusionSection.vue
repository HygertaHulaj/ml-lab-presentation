<script setup lang="ts">
/**
 * Conclusion — the real ending (audit C5, §4 "Resolution and recall"): back to Noé's scan and the talk's through-line,
 * a prediction versus a decision, the evidence checklist (each item jumps back to where it was taught), three recall
 * questions, then sources and where to explore. Reuses the film's last frame (no re-render).
 */
import { computed, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { THROUGH_LINE, sectionById } from '../../sections'
import ChoiceQuiz from '../../../visualizations/concepts/ChoiceQuiz.vue'
import { CHECKLIST, DECISION, EXPLORE, RECALL, SOURCES } from './content'

const ID = 'conclusion'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const mod = ref<{ advance: () => boolean } | null>(null)
watch(step, (s) => shell.setFieldAlpha(s === 0 ? 0.3 : 0.15), { immediate: true })
useSectionKeys((e) => ((e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') ? mod.value?.advance() ?? false : false))
const LAST = '/film/last-frame.jpg'
const def = sectionById(ID)!
const returnTo = encodeURIComponent('/presentation/conclusion?step=4')
const withReturn = (to: string) => (to.startsWith('/presentation') || to === '/' ? to : `${to}?return=${returnTo}`)

const HEAD = [
  { q: THROUGH_LINE, title: "Back to Noé's scan" },
  { q: 'Who acts on the output?', title: 'A prediction is not a decision' },
  { q: 'What would we ask before trusting the scan model?', title: 'The evidence checklist' },
  { q: 'Can you explain it without the slides?', title: 'Recall' },
  { q: 'Where does it all come from, and where next?', title: 'Sources and exploring further' },
]
const head = computed(() => HEAD[step.value])
</script>

<template>
  <section class="cc" :data-step="step" data-testid="section-conclusion">
    <header class="head">
      <div class="kicker">Conclusion · the whole chapter</div>
      <p class="q" data-testid="conclusion-question">{{ head.q }}</p>
      <h2>{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="scan">
        <img :src="LAST" alt="The last frame of the opening film: Noé in the hospital reading room" class="still" />
        <div class="side">
          <p class="lead">Noé asked how anyone could review all those scans carefully. RadiologyML offered a prediction for every image.</p>
          <p class="lead">An impressive prediction is not yet evidence. Over this lecture we met the kinds of evidence that would make one trustworthy, and the ways a model can look better than it is.</p>
          <p class="note">The film is a fictional scenario written for this presentation; the datasets we used (flowers, car seats, movies, digits, penguins) teach the ideas and say nothing about any clinical system.</p>
        </div>
      </div>

      <div v-else-if="step === 1" class="decide" data-testid="conclusion-decision">
        <div class="col pred"><h3>A prediction</h3><ul><li v-for="p in DECISION.prediction" :key="p">{{ p }}</li></ul></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="col dec"><h3>A decision</h3><ul><li v-for="p in DECISION.decision" :key="p">{{ p }}</li></ul></div>
      </div>

      <div v-else-if="step === 2" class="check" data-testid="conclusion-checklist">
        <div v-for="c in CHECKLIST" :key="c.k" class="item" :style="{ borderColor: `rgb(var(--c-${c.tone}))` }">
          <strong :style="{ color: `rgb(var(--c-${c.tone}))` }">{{ c.k }}</strong>
          <span>{{ c.ask }}</span>
          <div class="where"><button v-for="w in c.where" :key="w.label" class="jump" @click="shell.go(w.section, w.step)">↩ {{ w.label }}</button></div>
        </div>
      </div>

      <div v-else-if="step === 3" class="full">
        <ChoiceQuiz ref="mod" :items="RECALL" testid="recall" :columns="3" />
        <p class="src">Questions written for this presentation (not from the book). Discuss each answer before checking.</p>
      </div>

      <div v-else class="ending">
        <div class="sources" data-testid="conclusion-sources">
          <h3>Sources</h3>
          <p v-for="s in SOURCES" :key="s.k"><b>{{ s.k }}.</b> {{ s.v }}</p>
        </div>
        <div class="explore">
          <h3>Explore after the lecture</h3>
          <RouterLink v-for="x in EXPLORE" :key="x.to" :to="withReturn(x.to)" class="xl">{{ x.label }} →</RouterLink>
          <div class="final" data-testid="section-bridge"><span class="lbl">{{ def.question }}</span>{{ def.takeaway }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cc { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 clamp(16px, 1.25vw, 22px) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
h3 { font: 600 clamp(18px, 1.4vw, 24px) 'Space Grotesk', system-ui; margin-bottom: 8px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.scan { display: grid; grid-template-columns: 1.2fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.still { width: 100%; max-height: 54vh; object-fit: cover; border-radius: 18px; }
.side { display: flex; flex-direction: column; gap: 14px; }
.lead { font-size: clamp(17px, 1.35vw, 24px); line-height: 1.5; }
.note { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); line-height: 1.5; color: rgb(var(--c-soft)); }
.decide { display: grid; grid-template-columns: 1fr auto 1fr; gap: 2vw; width: 100%; align-items: center; }
.col { padding: 22px 26px; border-radius: 18px; background: rgba(var(--c-surface), .8); border-top: 4px solid; }
.col.pred { border-color: rgb(var(--c-data)); } .col.dec { border-color: rgb(var(--c-human)); }
.col li { margin: 10px 0 10px 18px; font-size: clamp(16px, 1.25vw, 22px); line-height: 1.45; }
.arrow { font: 600 clamp(32px, 3vw, 56px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.check { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.item { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 16px; background: rgba(var(--c-surface), .8); border-top: 4px solid; }
.item strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.item span { font-size: max(clamp(14px, 1.1vw, 19px), var(--up-14, 14px)); line-height: 1.45; flex: 1; }
.where { display: flex; flex-direction: column; gap: 6px; }
.jump { text-align: left; font-size: max(clamp(13px, .95vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-data)); text-decoration: underline; text-underline-offset: 3px; }
.full { width: 100%; display: grid; gap: 10px; }
.src { font-size: 12px; color: rgb(var(--c-faint)); }
.ending { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3vw; width: 100%; align-items: start; }
.sources p { font-size: max(clamp(13px, .95vw, 16px), var(--up-13, 13px)); line-height: 1.45; color: rgb(var(--c-soft)); margin: 5px 0; }
.sources b { color: rgb(var(--c-text)); }
.explore { display: flex; flex-direction: column; gap: 8px; }
.xl { font-size: max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-data)); text-decoration: underline; text-underline-offset: 3px; }
.final { display: flex; flex-direction: column; gap: 4px; margin-top: 14px; padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .8); border: 1px solid rgba(var(--c-accent), .4); font-size: max(clamp(15px, 1.15vw, 20px), var(--up-15, 15px)); line-height: 1.45; }
.lbl { font: 600 max(clamp(12px, .85vw, 14px), var(--up-12, 12px)) 'Space Grotesk', system-ui; letter-spacing: .08em; text-transform: uppercase; color: rgb(var(--c-accent)); }
@media (max-width: 1000px) { .scan, .decide, .ending { grid-template-columns: 1fr; } .check { grid-template-columns: 1fr 1fr; } .arrow { display: none; } }
</style>
