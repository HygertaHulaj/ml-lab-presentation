<script setup lang="ts">
/**
 * Generic "Try It Yourself" quiz: each question has a few options and one answer. → reveals; the score is shown.
 * Answers that come from a computation (e.g. a tree's counts) are passed in by the caller, never typed in here.
 */
import { computed, ref } from 'vue'

export interface QuizItem { q: string; options: string[]; answer: string; why?: string }
const props = defineProps<{ items: QuizItem[]; testid: string; columns?: number }>()
const emit = defineEmits<{ checked: [] }>()
const picks = ref<Record<number, string>>({})
const checked = ref(false)
const choose = (i: number, o: string) => { if (!checked.value) picks.value = { ...picks.value, [i]: o } }
const score = computed(() => props.items.filter((it, i) => picks.value[i] === it.answer).length)
function check() { checked.value = true; emit('checked') }
function advance(): boolean { if (!checked.value) { check(); return true } return false }
function reset() { checked.value = false; picks.value = {} }
defineExpose({ advance })
</script>

<template>
  <div class="cq" :data-testid="testid" :style="{ '--cols': columns ?? 1 }">
    <div class="items">
      <div v-for="(it, i) in items" :key="i" class="item" :class="{ right: checked && picks[i] === it.answer, wrong: checked && picks[i] !== it.answer }">
        <p class="q">{{ i + 1 }}. {{ it.q }}</p>
        <div class="opts">
          <button v-for="o in it.options" :key="o" :class="{ on: picks[i] === o, ans: checked && o === it.answer }" :data-testid="`${testid}-${i}-${o.replace(/\W+/g, '').toLowerCase()}`" @click="choose(i, o)">{{ o }}</button>
        </div>
        <small v-if="checked && it.why">{{ it.why }}</small>
      </div>
    </div>
    <div class="bar">
      <button v-if="!checked" class="btn" :data-testid="testid + '-check'" @click="check">Check answers</button>
      <template v-else><span class="score" :data-testid="testid + '-score'">{{ score }} / {{ items.length }} correct</span><button class="btn ghost" @click="reset">Try again</button></template>
    </div>
  </div>
</template>

<style scoped>
.cq { width: 100%; }
.items { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 10px 16px; }
.item { padding: 12px 16px; border-radius: 14px; background: rgba(var(--c-surface), .75); border: 1.5px solid rgba(var(--c-dim), .18); }
.item.right { border-color: rgb(var(--c-ok)); } .item.wrong { border-color: rgb(var(--c-warn)); }
.q { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.4; }
.opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.opts button { padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(var(--c-dim), .35); font: 500 max(14px, var(--up-14, 14px)) 'Inter', system-ui; color: rgb(var(--c-soft)); }
.opts button.on { background: rgb(var(--c-data)); color: rgb(var(--c-ink)); border-color: rgb(var(--c-data)); }
.opts button.ans { box-shadow: 0 0 0 2px rgb(var(--c-ok)); }
small { display: block; margin-top: 6px; color: rgb(var(--c-dim)); font-size: max(13px, var(--up-13, 13px)); }
.bar { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.btn { padding: 10px 18px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.score { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
</style>
