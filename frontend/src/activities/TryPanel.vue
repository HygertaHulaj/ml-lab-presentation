<script setup lang="ts">
/**
 * Try mode: the student answers each item (a choice, or a number typed to two decimals); "Check" marks them against
 * the answers computed by the backend solver and shows why. Nothing is computed here.
 */
import { computed, ref } from 'vue'
import type { TryItem } from './types'
import { numericCorrect } from './timing'

const props = defineProps<{ items: TryItem[] }>()
const emit = defineEmits<{ solution: [] }>()
const picks = ref<Record<string, string>>({})
const checked = ref(false)
const right = (it: TryItem) => {
  const v = picks.value[it.id]
  if (v === undefined || v === '') return false
  return it.options ? v === String(it.answer) : numericCorrect(v, Number(it.answer), it.tolerance ?? 0.005)
}
const score = computed(() => props.items.filter(right).length)
const shown = (it: TryItem) => (typeof it.answer === 'number' && !Number.isInteger(it.answer) ? it.answer.toFixed(2) : String(it.answer))
const key = (s: string) => s.replace(/\W+/g, '').toLowerCase()
function reset() { picks.value = {}; checked.value = false }
</script>

<template>
  <section class="tp" data-testid="ap-try">
    <div class="items">
      <div v-for="(it, i) in items" :key="it.id" class="item" :class="{ ok: checked && right(it), bad: checked && !right(it) }" :data-testid="`try-item-${i}`">
        <p class="q">{{ i + 1 }}. {{ it.q }}</p>
        <div v-if="it.options" class="opts">
          <button v-for="o in it.options" :key="o" :class="{ on: picks[it.id] === o, ans: checked && o === String(it.answer) }" :data-testid="`try-${i}-${key(o)}`" @click="!checked && (picks = { ...picks, [it.id]: o })">{{ o }}</button>
        </div>
        <input v-else v-model="picks[it.id]" class="num" inputmode="decimal" placeholder="your answer" :disabled="checked" :data-testid="`try-${i}-input`" />
        <small v-if="checked">{{ right(it) ? '✓' : `✗ answer: ${shown(it)}` }}<template v-if="it.why"> · {{ it.why }}</template></small>
      </div>
    </div>
    <div class="bar">
      <button v-if="!checked" class="btn" data-testid="try-check" @click="checked = true">Check my answers</button>
      <template v-else>
        <span class="score" data-testid="try-score">{{ score }} / {{ items.length }} correct</span>
        <button class="btn ghost" @click="reset">Try again</button>
        <button class="btn ghost" data-testid="try-to-solution" @click="emit('solution')">See the worked solution →</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.tp { width: 100%; max-width: 1400px; margin: 0 auto; padding-top: 8px; }
.items { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 10px 16px; }
.item { padding: 12px 16px; border-radius: 14px; background: rgba(var(--c-surface), .8); border: 1.5px solid rgba(var(--c-dim), .2); display: grid; gap: 8px; }
.item.ok { border-color: rgb(var(--c-ok)); } .item.bad { border-color: rgb(var(--c-warn)); }
.q { font-size: clamp(14px, 1.05vw, 17px); line-height: 1.4; }
.opts { display: flex; flex-wrap: wrap; gap: 6px; }
.opts button { padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(var(--c-dim), .4); font-size: 14px; color: rgb(var(--c-soft)); }
.opts button.on { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
.opts button.ans { box-shadow: 0 0 0 2px rgb(var(--c-ok)); }
.num { width: 160px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(var(--c-dim), .5); background: rgb(var(--c-ground2)); color: rgb(var(--c-text)); font: 600 15px 'JetBrains Mono', monospace; }
small { font-size: 13px; color: rgb(var(--c-dim)); }
.bar { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.btn { padding: 10px 18px; border-radius: 999px; background: rgb(var(--c-accent)); color: rgb(var(--c-ink)); font: 600 15px 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.score { font: 600 18px 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
@media (max-width: 900px) { .items { grid-template-columns: 1fr; } }
</style>
