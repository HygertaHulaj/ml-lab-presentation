<script setup lang="ts">
/**
 * Recent research (beyond the book, added 9 Nov 2026): does the interpretability-complexity trade-off of DS4A
 * pp. 376–377 (Fig. 8.13) hold? Kruschel et al. (2025) test it on 20 tabular datasets. Three steps: the question and
 * the study, what they found, what it means for us. Every number is a published value quoted from the paper
 * (content.ts), labelled on screen; nothing here is computed by the app.
 */
import { computed, watch } from 'vue'
import { usePresentation } from '../../store'
import { useShell } from '../../shell/shellApi'
import { DESIGN, FINDINGS, GROUP_LABEL, MEANING, PAPER, RANKS, type Group } from './content'

const ID = 'research'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
watch(step, (s) => shell.setFieldAlpha(s === 0 ? 0.8 : 0.12), { immediate: true })

const HEAD = [
  { q: 'Do we really have to choose between accuracy and understanding?', title: 'Recent research: accuracy versus interpretability' },
  { q: 'Which models predicted best?', title: 'What they found' },
  { q: 'What does this change for us?', title: 'What it means' },
]
const head = computed(() => HEAD[step.value] ?? HEAD[0])
const GROUP_COLOR: Record<Group, string> = { gam: 'var(--c-ok)', classic: 'var(--c-human)', blackbox: 'var(--c-data)' }
const MAX_RANK = 14
const SRC = `Kruschel et al. (2025), ${PAPER.journal} · doi:${PAPER.doi}`
</script>

<template>
  <section class="rs" :data-step="step" data-testid="section-research">
    <header class="head">
      <div class="kicker">Recent research · beyond the book</div>
      <p class="q" data-testid="research-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <!-- 0 · the question and the study -->
      <div v-if="step === 0" class="intro" data-testid="research-study">
        <h1>{{ head.title }}</h1>
        <p class="lead">Section 8.3 showed a <b>trade-off</b>: the more flexible a model, the better it may predict, but the harder it is to explain (DS4A pp. 376–377, Fig. 8.13). Deep learning sits at the far end (Section 8.5). A 2025 study put this claim to the test.</p>
        <div class="paper">
          <strong>{{ PAPER.title }}</strong>
          <span>{{ PAPER.authors }} · {{ PAPER.journal }} · {{ PAPER.date }}</span>
        </div>
        <div class="design">
          <div v-for="(d, i) in DESIGN" :key="d.label" class="fact" :style="{ animationDelay: i * 0.12 + 's' }">
            <b>{{ d.big }}</b><strong>{{ d.label }}</strong><span>{{ d.detail }}</span>
          </div>
        </div>
        <p class="gam"><b>GAM</b> (generalized additive model): prediction = curve₁(x₁) + curve₂(x₂) + … Like linear regression, but each variable gets a curve instead of a straight line, and every curve can be plotted and read.</p>
      </div>

      <!-- 1 · the findings -->
      <div v-else-if="step === 1" class="found" data-testid="research-findings">
        <div class="chart">
          <p class="ctitle">Average rank over the 20 datasets after tuning · 1 = best, 14 = worst · shorter bar = better</p>
          <div v-for="(r, i) in RANKS" :key="r.model" class="row" :data-testid="`rank-${i}`">
            <span class="m">{{ r.model }}</span>
            <span class="track"><i :style="{ width: (r.rank / MAX_RANK) * 100 + '%', background: `rgb(${GROUP_COLOR[r.group]})`, animationDelay: i * 0.05 + 's' }" /></span>
            <b>{{ r.rank.toFixed(2) }}</b>
          </div>
          <div class="legend"><span v-for="(label, g) in GROUP_LABEL" :key="g"><i :style="{ background: `rgb(${GROUP_COLOR[g]})` }" />{{ label }}</span></div>
          <p class="src">Published values, Table 4 of the paper (not computed by this app) · {{ SRC }}</p>
        </div>
        <div class="cards">
          <div v-for="(f, i) in FINDINGS" :key="f.k" class="card" :style="{ animationDelay: 0.3 + i * 0.15 + 's' }"><strong>{{ f.k }}</strong><span>{{ f.v }}</span></div>
        </div>
      </div>

      <!-- 2 · what it means -->
      <div v-else class="meaning" data-testid="research-meaning">
        <div class="cards three">
          <div v-for="(m, i) in MEANING" :key="m.k" class="card" :style="{ borderTopColor: `rgb(var(--c-${m.tone}))`, animationDelay: i * 0.15 + 's' }"><strong>{{ m.k }}</strong><span>{{ m.v }}</span></div>
        </div>
        <p class="ask"><span class="lbl">For discussion</span><span>Noé's scan is an <b>image</b>, not a table. Does this result tell us we could use an interpretable model there? <em>Not directly: the authors say images and text first need features a person can read.</em></span></p>
        <p class="src">{{ SRC }} · open access, preprint arXiv:2409.14429</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rs { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.intro { width: 100%; }
.intro h1 { font: 600 clamp(32px, 3.8vw, 64px) / 1.08 'Space Grotesk', system-ui; max-width: 22ch; }
.lead { max-width: 78ch; margin-top: 16px; font-size: max(clamp(16px, 1.3vw, 22px), var(--up-16, 16px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.lead b, .gam b { color: rgb(var(--c-accent)); }
.paper { display: flex; flex-direction: column; gap: 4px; margin-top: 18px; padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .78); border-left: 4px solid rgb(var(--c-accent)); max-width: 1200px; }
.paper strong { font: 600 max(clamp(16px, 1.2vw, 20px), var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.paper span { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-dim)); }
.design { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 18px; max-width: 1300px; }
.fact { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.fact b { font: 700 clamp(26px, 2.4vw, 40px) 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.fact strong { font: 600 max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.fact span { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-soft)); line-height: 1.4; }
.gam { margin-top: 16px; max-width: 90ch; font-size: max(clamp(15px, 1.1vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.5; }
.found { display: grid; grid-template-columns: 1.15fr 1fr; gap: 3vw; width: 100%; align-items: center; }
.chart { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ctitle { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-dim)); margin-bottom: 4px; }
.row { display: grid; grid-template-columns: minmax(150px, 16.5em) 1fr 3.2em; align-items: center; gap: 10px; }
.row .m { font-size: max(clamp(13px, 1vw, 16px), var(--up-13, 13px)); color: rgb(var(--c-text)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row b { font: 600 max(clamp(13px, 1vw, 16px), var(--up-13, 13px)) 'Space Grotesk', system-ui; text-align: right; color: rgb(var(--c-text)); }
.track { height: 14px; border-radius: 7px; background: rgba(var(--c-text), .07); overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 7px; transform-origin: left; animation: grow .7s ease both; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 8px; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.cards { display: flex; flex-direction: column; gap: 12px; }
.cards.three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.card { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.card strong { font: 600 clamp(18px, 1.4vw, 24px) 'Space Grotesk', system-ui; }
.card span { font-size: max(clamp(14px, 1.05vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.meaning { width: 100%; display: flex; flex-direction: column; gap: 18px; }
.ask { display: flex; flex-direction: column; gap: 6px; padding: 16px 20px; border-radius: 16px; background: rgba(var(--c-surface), .72); border: 1px solid rgba(var(--c-accent), .35); font-size: max(clamp(15px, 1.15vw, 20px), var(--up-15, 15px)); line-height: 1.5; color: rgb(var(--c-text)); }
.ask b { color: rgb(var(--c-accent)); }
.ask em { display: block; margin-top: 4px; color: rgb(var(--c-soft)); }
.lbl { font: 600 max(clamp(12px, .85vw, 14px), var(--up-12, 12px)) 'Space Grotesk', system-ui; letter-spacing: .08em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.src { margin-top: 6px; font-size: 12px; color: rgb(var(--c-faint)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes grow { from { transform: scaleX(0); } to { transform: none; } }
@media (max-width: 1000px) { .design { grid-template-columns: 1fr 1fr; } .found, .cards.three { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .fact, .card, .track i { animation: none; } }
</style>
