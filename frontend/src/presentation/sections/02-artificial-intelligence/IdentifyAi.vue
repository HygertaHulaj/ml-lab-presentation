<script setup lang="ts">
/** DS4A "Try It Yourself: Identify Artificial Intelligence" (p. 365): select the items that use AI, then check. */
import { computed, ref } from 'vue'
import { IDENTIFY_AI } from './content'

const picked = ref<Set<string>>(new Set())
const checked = ref(false)
function toggle(item: string) {
  if (checked.value) return
  const s = new Set(picked.value)
  if (s.has(item)) s.delete(item); else s.add(item)
  picked.value = s
}
const score = computed(() => IDENTIFY_AI.filter((q) => picked.value.has(q.item) === q.ai).length)
function check() { checked.value = true }
function reset() { checked.value = false; picked.value = new Set() }
/** → : first reveal, then let the presenter move on */
function advance(): boolean { if (!checked.value) { check(); return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="quiz" data-testid="identify-ai">
    <div class="grid">
      <button v-for="q in IDENTIFY_AI" :key="q.item" class="card"
              :class="{ on: picked.has(q.item), right: checked && picked.has(q.item) === q.ai, wrong: checked && picked.has(q.item) !== q.ai }"
              :aria-pressed="picked.has(q.item)" :data-testid="'quiz-' + q.item.split(' ')[0].toLowerCase()" @click="toggle(q.item)">
        <strong>{{ q.item }}</strong>
        <span v-if="checked" class="why">{{ q.ai ? 'Uses AI' : 'Usually no AI' }}: {{ q.why }}</span>
      </button>
    </div>
    <div class="bar">
      <button v-if="!checked" class="btn" data-testid="quiz-check" @click="check">Check answers</button>
      <template v-else>
        <span class="score" data-testid="quiz-score">{{ score }} / {{ IDENTIFY_AI.length }} correct</span>
        <button class="btn ghost" @click="reset">Try again</button>
      </template>
      <span class="src">DS4A p. 365 · suggested answers</span>
    </div>
  </div>
</template>

<style scoped>
.quiz { width: 100%; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.card { min-height: 108px; display: flex; flex-direction: column; justify-content: center; gap: 8px; padding: 16px 18px; text-align: left; border-radius: 16px; background: rgba(var(--c-surface), .72); border: 1.5px solid rgba(var(--c-dim), .25); transition: border-color .25s, background .25s, transform .2s; }
.card:hover { transform: translateY(-2px); }
.card.on { border-color: rgb(var(--c-data)); background: rgba(var(--c-data), .1); }
.card.right { border-color: rgb(var(--c-ok)); background: rgba(var(--c-ok), .1); }
.card.wrong { border-color: rgb(var(--c-warn)); background: rgba(var(--c-warn), .1); }
.card strong { font: 600 max(clamp(16px, 1.25vw, 21px), var(--up-16, 16px)) 'Space Grotesk', system-ui; }
.why { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); }
.bar { display: flex; align-items: center; gap: 14px; margin-top: 22px; }
.btn { padding: 11px 20px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.score { font: 600 max(20px, var(--up-20, 20px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
.src { margin-left: auto; font-size: 12px; color: rgb(var(--c-faint)); }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
</style>
