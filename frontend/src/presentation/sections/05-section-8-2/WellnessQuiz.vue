<script setup lang="ts">
/**
 * DS4A Try It Yourself, pp. 367–368: the "Mental Wellness Assistant". Assign each of its nine features to
 * Step 1 (ingest), Step 2 (analyze) or Step 3 (produce results); checking flies every card into its lane.
 */
import { computed, ref } from 'vue'
import { LANES, WELLNESS } from './content'

const pick = ref<Record<number, number | undefined>>({})
const checked = ref(false)
const choose = (n: number, lane: number) => { if (!checked.value) pick.value = { ...pick.value, [n]: lane } }
const lane = (l: number) => WELLNESS.filter((w) => (checked.value ? w.lane : pick.value[w.n]) === l)
const unplaced = computed(() => (checked.value ? [] : WELLNESS.filter((w) => pick.value[w.n] === undefined)))
const score = computed(() => WELLNESS.filter((w) => pick.value[w.n] === w.lane).length)
function check() { checked.value = true }
function reset() { checked.value = false; pick.value = {} }
function advance(): boolean { if (!checked.value) { check(); return true } return false }
defineExpose({ advance })
</script>

<template>
  <div class="wq" data-testid="m-wellness">
    <TransitionGroup v-if="unplaced.length" name="card" tag="div" class="pool">
      <div v-for="w in unplaced" :key="w.n" class="card">
        <strong>{{ w.n }}. {{ w.title }}</strong><span>{{ w.text }}</span>
        <div class="btns"><button v-for="l in 3" :key="l" :data-testid="`well-${w.n}-${l}`" @click="choose(w.n, l)">{{ l }}</button></div>
      </div>
    </TransitionGroup>
    <div class="lanes">
      <div v-for="(name, li) in LANES" :key="name" class="lane" :class="'l' + (li + 1)">
        <h4>{{ name }}</h4>
        <TransitionGroup name="card" tag="div" class="list">
          <div v-for="w in lane(li + 1)" :key="w.n" class="chip" :class="{ wrong: checked && pick[w.n] !== w.lane }" @click="!checked && (pick = { ...pick, [w.n]: undefined })">
            {{ w.n }}. {{ w.title }}
          </div>
        </TransitionGroup>
      </div>
    </div>
    <div class="bar">
      <button v-if="!checked" class="btn" data-testid="well-check" @click="check">Check answers</button>
      <template v-else><span class="score" data-testid="well-score">{{ score }} / {{ WELLNESS.length }} correct</span><button class="btn ghost" @click="reset">Try again</button></template>
      <span class="hint">{{ checked ? 'The feedback loop (9) produces results that are fed back as new data: the cycle starts again.' : 'Pick 1, 2 or 3 for each feature; click a placed card to take it back.' }}</span>
      <span class="src">DS4A pp. 367–368</span>
    </div>
  </div>
</template>

<style scoped>
.wq { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.pool { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.card { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 12px; background: rgba(var(--c-surface), .78); border: 1px solid rgba(var(--c-dim), .2); }
.card strong { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.card span { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-soft)); }
.btns { display: flex; gap: 6px; margin-top: 6px; }
.btns button { width: 34px; height: 28px; border-radius: 8px; border: 1px solid rgba(var(--c-dim), .35); color: rgb(var(--c-text)); font: 700 max(13px, var(--up-13, 13px)) 'Space Grotesk'; }
.btns button:hover { background: rgba(var(--c-data), .2); }
.lanes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lane { min-height: 120px; padding: 12px 14px; border-radius: 14px; border: 2px dashed; background: rgba(var(--c-surface), .55); }
.lane.l1 { border-color: rgba(var(--c-data), .55); } .lane.l2 { border-color: rgba(var(--c-feature), .6); } .lane.l3 { border-color: rgba(var(--c-ok), .6); }
h4 { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; margin-bottom: 8px; color: rgb(var(--c-soft)); }
.list { display: flex; flex-direction: column; gap: 6px; }
.chip { padding: 7px 12px; border-radius: 10px; background: rgba(var(--c-text), .06); font-size: max(14px, var(--up-14, 14px)); cursor: pointer; }
.chip.wrong { box-shadow: 0 0 0 2px rgb(var(--c-warn)); }
.bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn { padding: 10px 18px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; }
.btn.ghost { background: transparent; color: rgb(var(--c-text)); border: 1px solid rgba(var(--c-text), .3); }
.score { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; color: rgb(var(--c-ok)); }
.hint { font-size: 13px; color: rgb(var(--c-dim)); }
.src { margin-left: auto; font-size: 12px; color: rgb(var(--c-faint)); }
.card-move, .card-enter-active, .card-leave-active { transition: all .5s ease; }
.card-enter-from, .card-leave-to { opacity: 0; transform: scale(.95); }
.card-leave-active { position: absolute; }
@media (prefers-reduced-motion: reduce) { .card-move, .card-enter-active, .card-leave-active { transition: none; } }
/* shorter screens (e.g. 1880×960): tighter spacing, same text sizes */
@media (max-height: 1000px) { .wq { gap: 8px; } .card { padding: 8px 12px; } .lane { min-height: 90px; padding: 8px 12px; } .chip { padding: 5px 10px; } }
</style>
