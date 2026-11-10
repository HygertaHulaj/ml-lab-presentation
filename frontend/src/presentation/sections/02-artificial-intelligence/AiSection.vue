<script setup lang="ts">
/**
 * Section 2 — What is Artificial Intelligence? (DS4A §8.1, §8.5)
 * Steps: 0 question · 1 tasks that need intelligence · 2 definition · 3 AI field · 4 ML inside AI · 5 DL inside ML ·
 * 6 rules vs learning (real backend computation) · 7 Try It Yourself.
 * One main visual per step, one short title, one concise explanation. Later steps reveal more detail.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import NestedFields from './NestedFields.vue'
import TaskVignettes from './TaskVignettes.vue'
import RulesVsLearning from './RulesVsLearning.vue'
import IdentifyAi from './IdentifyAi.vue'
import { FIELDS, QUESTION, type FieldId } from './content'

const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf('ai'))
const picked = ref<FieldId | null>(null)
const rvl = ref<InstanceType<typeof RulesVsLearning> | null>(null)
const quiz = ref<InstanceType<typeof IdentifyAi> | null>(null)

const level = computed(() => (step.value <= 3 ? 1 : step.value === 4 ? 2 : 3))
const stepFocus = computed<FieldId | null>(() => (step.value === 3 ? 'ai' : step.value === 4 ? 'ml' : step.value === 5 ? 'dl' : null))
const focus = computed<FieldId | null>(() => picked.value ?? stepFocus.value)
watch(step, () => { picked.value = null })
const field = computed(() => (focus.value ? FIELDS[focus.value] : FIELDS.ai))

function select(id: FieldId) { picked.value = id === stepFocus.value ? null : id }

onMounted(() => shell.setFieldAlpha(step.value <= 1 ? 1 : 0.5))
watch(step, (s) => shell.setFieldAlpha(s <= 1 ? 1 : s <= 5 ? 0.5 : 0.25))

// → inside the interactive steps first advances their own sub-stages
useSectionKeys((e) => {
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '
  const bwd = e.key === 'ArrowLeft' || e.key === 'PageUp'
  if (step.value === 6 && fwd) return rvl.value?.advance() ?? false
  if (step.value === 6 && bwd) return rvl.value?.back() ?? false
  if (step.value === 7 && fwd) return quiz.value?.advance() ?? false
  return false
})

const titles = ['', 'Tasks that need intelligence', 'Artificial intelligence', '', '', '', 'Rules written by people vs. rules learned from data', 'Try it yourself: which of these use AI?']
</script>

<template>
  <section class="ai" :data-step="step" data-testid="section-ai">
    <!-- 0: the question -->
    <Transition name="rise">
      <div v-if="step === 0" class="question" data-testid="ai-question">
        <div class="kicker">Section 02 · Artificial intelligence</div>
        <h1>{{ QUESTION }}</h1>
      </div>
    </Transition>

    <!-- 1: tasks -->
    <Transition name="rise">
      <div v-if="step === 1" class="layout stack">
        <h2>{{ titles[1] }}</h2>
        <p class="lead">Each of these needs perception, language or judgement. That is the territory of AI.</p>
        <TaskVignettes :reduced="store.reducedMotion" />
      </div>
    </Transition>

    <!-- 2–5: definition and nested fields -->
    <div v-if="step >= 2 && step <= 5" class="layout split">
      <div class="text">
        <Transition name="rise" mode="out-in">
          <div :key="field.id + step">
            <div class="kicker" :class="'k-' + field.id">{{ step === 2 ? 'Definition' : field.name }}</div>
            <h2>{{ step === 2 ? titles[2] : field.name }}</h2>
            <p class="def" data-testid="field-definition">{{ field.definition }}</p>
            <p v-if="step >= 3" class="note">{{ field.note }}</p>
            <p class="src">{{ field.source }}</p>
          </div>
        </Transition>
        <p v-if="step >= 3" class="hint">Click a field to focus it.</p>
      </div>
      <div class="vis">
        <NestedFields :level="level" :focus="step === 2 ? null : focus" :reduced="store.reducedMotion" @select="select" />
      </div>
    </div>

    <!-- 6: rules vs learning -->
    <Transition name="rise">
      <div v-if="step === 6" class="layout stack">
        <h2>{{ titles[6] }}</h2>
        <p class="lead">Traditional programming: a person writes the rule. Machine learning: an algorithm finds the rule from labelled examples, and is then checked on examples it has never seen.</p>
        <RulesVsLearning ref="rvl" :reduced="store.reducedMotion" />
      </div>
    </Transition>

    <!-- 7: try it yourself -->
    <Transition name="rise">
      <div v-if="step === 7" class="layout stack">
        <h2>{{ titles[7] }}</h2>
        <p class="lead">Select every item that, in most cases, uses artificial intelligence.</p>
        <IdentifyAi ref="quiz" />
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.ai { position: absolute; inset: 0; }
.question { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 10vw; }
.question h1 { font: 500 clamp(34px, 4.4vw, 76px) / 1.15 'Space Grotesk', system-ui; letter-spacing: .01em; max-width: 20ch; margin-top: 18px; text-shadow: 0 0 40px rgba(var(--c-ground2), .9); }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.k-ai { color: rgb(var(--c-compute)); } .k-ml { color: rgb(var(--c-data)); } .k-dl { color: rgb(var(--c-feature)); }
.layout { position: absolute; inset: 0; padding: 92px 6vw 96px; }
.stack { display: flex; flex-direction: column; justify-content: safe center; gap: 14px; overflow-y: auto; overflow-x: hidden; }
.split { display: grid; grid-template-columns: minmax(280px, 0.8fr) 1.6fr; gap: 4vw; align-items: safe center; }
.text h2 { margin-top: 12px; }
h2 { font: 600 clamp(28px, 3vw, 52px) / 1.1 'Space Grotesk', system-ui; }
.lead { max-width: 70ch; font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-soft)); margin-bottom: 14px; }
.def { margin-top: 18px; font: 400 clamp(19px, 1.6vw, 28px) / 1.45 'Inter', system-ui; color: rgb(var(--c-text)); }
.note { margin-top: 18px; font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-data-soft)); line-height: 1.5; }
.src { margin-top: 16px; font-size: 13px; color: rgb(var(--c-faint)); }
.hint { margin-top: 26px; font-size: 13px; color: rgb(var(--c-faint)); }
.vis { height: min(68vh, 620px); }
.rise-enter-active, .rise-leave-active { transition: opacity .6s ease, transform .6s ease; }
.rise-enter-from { opacity: 0; transform: translateY(18px); }
.rise-leave-to { opacity: 0; transform: translateY(-10px); }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; padding-top: 80px; } .vis { height: 46vh; } }
@media (prefers-reduced-motion: reduce) { .rise-enter-active, .rise-leave-active { transition: none; } }
</style>
