<script setup lang="ts">
/**
 * AC 5, Inference versus Prediction (DS4A p. 399): each scenario's fill-in sentence from the book, with its blanks
 * filled from the solver's answers as the narration reaches them (line 1: problem type and response type; line 2:
 * the goal). Pure function of (scene, line, lp).
 */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import { AC5_SCENARIOS } from './ac5'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
const k = computed(() => (props.scene.startsWith('s') ? Number(props.scene.slice(1)) : -1))
const ans = (i: number) => props.solve.answers[i].answer as { problem: string; response_type: string; goal: string }
const filled = (i: number, level: number) => props.scene === 'summary' || (k.value === i && (props.line > level || (props.line === level && props.lp > 0.35)))
</script>

<template>
  <div class="a5" data-testid="v-ac5">
    <div v-if="scene === 'intro'" class="intro">
      <div class="axis"><div class="pole"><strong>Prediction</strong><span>predicting the response accurately is the top priority</span></div><div class="pole"><strong>Inference</strong><span>understanding how the explanatory variables relate to the response</span></div></div>
      <p>For each scenario: is it regression or classification, and do we want inference, prediction, or both?</p>
    </div>
    <div v-else class="cards">
      <article v-for="(s, i) in AC5_SCENARIOS" :key="s.title" class="sc" :class="{ on: k === i, done: scene === 'summary' || k > i }" :data-testid="`ac5-card-${i}`">
        <h3>{{ i + 1 }}. {{ s.title }}</h3>
        <p v-if="k === i" class="txt">{{ s.text }}</p>
        <p class="sentence">This is a <b :class="{ f: filled(i, 1) }">{{ filled(i, 1) ? ans(i).problem : '______' }}</b> problem because the response, <i>{{ s.response }}</i>, is <b :class="{ f: filled(i, 1) }">{{ filled(i, 1) ? ans(i).response_type : '______' }}</b>. We are interested in <b :class="{ f: filled(i, 2) }">{{ filled(i, 2) ? ans(i).goal : '______' }}</b>.</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.a5 { width: 100%; max-width: 1400px; margin: 0 auto; }
.intro { display: grid; gap: 20px; }
.axis { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pole { display: flex; flex-direction: column; gap: 8px; padding: 22px; border-radius: 18px; background: rgba(var(--c-surface), .82); border-top: 4px solid rgb(var(--c-accent)); }
.pole + .pole { border-color: rgb(var(--c-human)); }
.pole strong { font: 600 clamp(20px, 1.8vw, 30px) 'Space Grotesk', system-ui; }
.pole span { font-size: clamp(15px, 1.2vw, 19px); color: rgb(var(--c-soft)); }
.intro > p { text-align: center; font-size: clamp(16px, 1.3vw, 21px); color: rgb(var(--c-text)); }
.cards { display: grid; gap: 12px; }
.sc { padding: 14px 20px; border-radius: 16px; background: rgba(var(--c-surface), .6); border-left: 4px solid rgba(var(--c-dim), .4); opacity: .45; transition: opacity .4s, background .4s; }
.sc.on { opacity: 1; background: rgba(var(--c-surface), .9); border-color: rgb(var(--c-accent)); }
.sc.done { opacity: .85; border-color: rgb(var(--c-ok)); }
h3 { font: 600 clamp(16px, 1.3vw, 21px) 'Space Grotesk', system-ui; }
.txt { margin-top: 6px; font-size: clamp(14px, 1.05vw, 17px); color: rgb(var(--c-soft)); line-height: 1.5; }
.sentence { margin-top: 8px; font-size: clamp(15px, 1.2vw, 20px); line-height: 1.7; color: rgb(var(--c-text)); }
.sentence b { display: inline-block; min-width: 6ch; padding: 0 6px; border-bottom: 2px solid rgba(var(--c-dim), .6); color: rgb(var(--c-dim)); font-weight: 600; text-align: center; transition: color .3s; }
.sentence b.f { color: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); animation: pop .4s ease both; }
@keyframes pop { from { transform: scale(1.25); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .sentence b.f { animation: none; } }
</style>
