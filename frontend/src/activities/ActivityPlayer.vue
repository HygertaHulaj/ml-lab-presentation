<script setup lang="ts">
/**
 * Cinematic activity player: one end-of-chapter exercise as a short film.
 * Story = narrated scenes (captions always on); the visual is a pure function of (scene, p, line) and the playhead t
 * is the only thing GSAP moves. Try = the student answers, checked against the backend solver. Solution = the worked,
 * computed answer with the book's interpretation, common mistakes and Python code.
 * Keys: Space play/pause · ←/→ previous/next caption · PageUp/PageDown previous/next scene · 1/2/3 Story/Try/Solution · F full screen · L light/dark · Esc hub.
 */
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, type Component, inject } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import type { ExerciseDetail, SolveResult } from '../types'
import { usePresentation } from '../presentation/store'
import { themeVars } from '../presentation/theme'
import { EMBED_CLOSE } from '../presentation/shell/shellApi'
import { ACTIVITIES, activityById } from './registry'
import { lineStart, locate, sceneStarts, totalDuration } from './timing'
import type { Scene } from './types'
import TryPanel from './TryPanel.vue'
import SolutionPanel from './SolutionPanel.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
/** set when the activity is embedded in the presentation: close returns to the same step */
const embedClose = inject(EMBED_CLOSE, null)
const store = usePresentation()
const def = computed(() => activityById(props.id))
const detail = ref<ExerciseDetail | null>(null)
const solve = ref<SolveResult | null>(null)
const error = ref<string | null>(null)
const mode = ref<'story' | 'try' | 'solution'>('story')
const visual = shallowRef<Component | null>(null)
const reduced = computed(() => store.reducedMotion)
const vars = computed(() => themeVars(store.theme, 'lab'))

const clock = reactive({ t: 0 })
const playing = ref(false)
let tween: gsap.core.Tween | null = null
const scenes = computed<Scene[]>(() => (def.value && detail.value && solve.value ? def.value.script(detail.value, solve.value) : []))
const total = computed(() => totalDuration(scenes.value))
const starts = computed(() => sceneStarts(scenes.value))
const at = computed(() => locate(scenes.value, clock.t))
const scene = computed(() => scenes.value[at.value.index])
const caption = computed(() => scene.value?.lines[at.value.line] ?? '')
const vp = computed(() => (reduced.value ? 1 : at.value.p))

function kill() { tween?.kill(); tween = null; playing.value = false }
function play() {
  kill()
  if (clock.t >= total.value - 0.01) clock.t = 0
  if (reduced.value) { goScene(Math.min(scenes.value.length - 1, at.value.index + 1)); return }
  playing.value = true
  tween = gsap.to(clock, { t: total.value, duration: total.value - clock.t, ease: 'none', onComplete: () => { playing.value = false } })
}
function toggle() { if (playing.value) kill(); else play() }
function goScene(i: number) {
  const k = Math.max(0, Math.min(scenes.value.length - 1, i))
  const wasPlaying = playing.value
  kill()
  clock.t = starts.value[k] + (reduced.value ? 0.001 : 0)
  if (wasPlaying) play()
}
/** → / ←: step caption by caption (then scene by scene), so every line can be shown and discussed */
function step(dir: 1 | -1) {
  const sc = scenes.value[at.value.index]
  if (!sc) return
  const nextLine = at.value.line + dir
  kill()
  if (nextLine >= 0 && nextLine < sc.lines.length) clock.t = lineStart(scenes.value, at.value.index, nextLine) + 0.001
  else if (dir > 0 && at.value.index < scenes.value.length - 1) clock.t = starts.value[at.value.index + 1] + 0.001
  else if (dir < 0 && at.value.index > 0) { const k = at.value.index - 1; clock.t = lineStart(scenes.value, k, scenes.value[k].lines.length - 1) + 0.001 }
}
function seek(e: Event) { kill(); clock.t = Number((e.target as HTMLInputElement).value) }

async function load() {
  error.value = null
  const d = def.value
  if (!d) { error.value = `Unknown activity "${props.id}"`; return }
  try {
    const [det, sol] = await Promise.all([api.exercise(d.id), api.solve(d.id, {})])
    detail.value = det; solve.value = sol
    visual.value = defineAsyncComponent(d.visual)
    clock.t = 0
    if (!reduced.value) window.setTimeout(play, 600)
  } catch (e) { error.value = errorMessage(e) }
}
watch(() => props.id, () => { kill(); mode.value = 'story'; load() })

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'range' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return
  if (e.key === ' ' && mode.value === 'story') { e.preventDefault(); toggle() }
  else if (e.key === 'ArrowRight' && mode.value === 'story') step(1)
  else if (e.key === 'ArrowLeft' && mode.value === 'story') step(-1)
  else if (e.key === 'PageDown' && mode.value === 'story') goScene(at.value.index + 1)
  else if (e.key === 'PageUp' && mode.value === 'story') goScene(at.value.index - 1)
  else if (e.key === '1') mode.value = 'story'
  else if (e.key === '2') { kill(); mode.value = 'try' }
  else if (e.key === '3') { kill(); mode.value = 'solution' }
  else if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}) }
  else if (e.key === 'l' || e.key === 'L') store.theme = store.theme === 'light' ? 'warm' : 'light'
  else if (e.key === 'Escape') { if (embedClose) embedClose(); else router.push('/activities') }
}
onMounted(() => { window.addEventListener('keydown', onKey); load() })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); kill() })
const idx = computed(() => ACTIVITIES.findIndex((a) => a.id === props.id))
const nextAct = computed(() => ACTIVITIES[idx.value + 1] ?? null)
</script>

<template>
  <div class="ap" :style="vars" :data-theme="store.theme" data-testid="activity-player">
    <header class="top">
      <button v-if="embedClose" class="back" data-testid="embed-close" @click="embedClose()">← Back to the presentation (Esc)</button>
      <RouterLink v-else to="/activities" class="back" data-testid="ap-back">← All activities</RouterLink>
      <div v-if="def" class="ttl">
        <span class="lab">{{ def.book === 'DS4A' ? 'Data Science for All' : 'Hands-On Intro to Data Science' }} · {{ def.label }} · {{ def.page }}</span>
        <h1 data-testid="ap-title">{{ def.title }}</h1>
      </div>
      <RouterLink v-if="def?.lesson && !embedClose" :to="`/lessons/${def.lesson}`" class="lesson" data-testid="ap-lesson">▶ 3D lesson</RouterLink>
      <nav class="modes" role="tablist">
        <button v-for="(m, i) in (['story', 'try', 'solution'] as const)" :key="m" role="tab" :aria-selected="mode === m" :class="{ on: mode === m }" :data-testid="`ap-mode-${m}`" @click="kill(); mode = m">
          <kbd>{{ i + 1 }}</kbd>{{ m === 'story' ? 'Story' : m === 'try' ? 'Try it' : 'Solution' }}
        </button>
      </nav>
    </header>

    <main class="stage">
      <div v-if="error" class="msg err" data-testid="ap-error">{{ error }}. Is the backend running?</div>
      <div v-else-if="!detail || !solve || !def" class="msg">Loading the activity…</div>
      <template v-else>
        <section v-show="mode === 'story'" class="story" data-testid="ap-story">
          <div class="scene-title" data-testid="ap-scene">{{ at.index + 1 }} / {{ scenes.length }} · {{ scene?.title }}</div>
          <div class="vis"><component :is="visual" v-if="visual && scene" :scene="scene.id" :p="vp" :line="at.line" :lp="reduced ? 1 : at.lp" :detail="detail" :solve="solve" /></div>
          <p class="caption" aria-live="polite" data-testid="ap-caption">{{ caption }}</p>
          <div class="ctrl">
            <button class="c" aria-label="Previous scene" data-testid="ap-prev" @click="goScene(at.index - 1)">⏮</button>
            <button class="c main" :aria-label="playing ? 'Pause' : 'Play'" data-testid="ap-play" @click="toggle">{{ playing ? '❚❚' : '▶' }}</button>
            <button class="c" aria-label="Next scene" data-testid="ap-next" @click="goScene(at.index + 1)">⏭</button>
            <div class="scrub">
              <input type="range" min="0" :max="total" step="0.05" :value="clock.t" aria-label="Story position" data-testid="ap-scrub" @input="seek" />
              <div class="marks"><span v-for="(s, i) in starts" :key="i" :style="{ left: (s / total) * 100 + '%' }" :class="{ on: i <= at.index }" /></div>
            </div>
            <button v-if="at.index === scenes.length - 1 && !playing" class="c txt" data-testid="ap-to-try" @click="mode = 'try'">Try it yourself →</button>
          </div>
        </section>
        <TryPanel v-if="mode === 'try'" :items="def.tryItems(detail, solve)" @solution="mode = 'solution'" />
        <SolutionPanel v-if="mode === 'solution'" :detail="detail" :solve="solve" :next="nextAct" />
      </template>
    </main>
  </div>
</template>

<style scoped>
.ap { position: fixed; inset: 0; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 30%, rgba(var(--c-accent), .08), rgb(var(--c-ground)) 55%, rgb(var(--c-ground2))); background-color: rgb(var(--c-ground)); color: rgb(var(--c-text)); font-family: 'Inter', system-ui, sans-serif; }
.top { display: flex; align-items: center; gap: 24px; padding: 18px 4vw 10px; }
.back { font-size: 14px; color: rgb(var(--c-dim)); white-space: nowrap; }
.back:hover { color: rgb(var(--c-text)); }
.ttl { flex: 1; min-width: 0; }
.lab { font: 600 12px 'Space Grotesk', system-ui; letter-spacing: .2em; text-transform: uppercase; color: rgb(var(--c-accent)); }
h1 { font: 600 clamp(20px, 2vw, 32px) / 1.15 'Space Grotesk', system-ui; margin-top: 4px; }
.modes { display: flex; gap: 6px; }
.lesson { padding: 8px 14px; border-radius: 999px; border: 1px solid rgb(var(--c-accent)); color: rgb(var(--c-accent)); font: 600 14px 'Space Grotesk', system-ui; white-space: nowrap; }
.modes button { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(var(--c-dim), .35); font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
.modes button.on { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
kbd { font: 600 11px 'JetBrains Mono', monospace; opacity: .7; }
.stage { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 0 4vw 18px; overflow-y: auto; }
.msg { margin: auto; font-size: 18px; color: rgb(var(--c-dim)); }
.msg.err { color: rgb(var(--c-warn)); }
.story { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
.scene-title { font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-dim)); letter-spacing: .05em; }
.vis { flex: 1; min-height: 0; display: flex; align-items: safe center; justify-content: center; overflow: hidden; }
.vis > * { width: 100%; }
.caption { min-height: 2.7em; text-align: center; font: 500 clamp(17px, 1.5vw, 25px) / 1.35 'Inter', system-ui; color: rgb(var(--c-strong)); max-width: 72ch; margin: 0 auto; }
.ctrl { display: flex; align-items: center; gap: 10px; }
.c { width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(var(--c-dim), .35); color: rgb(var(--c-text)); font-size: 14px; flex: none; }
.c.main { background: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); color: rgb(var(--c-ink)); }
.c.txt { width: auto; padding: 0 16px; font: 600 14px 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); border-color: rgb(var(--c-accent)); }
.scrub { position: relative; flex: 1; }
.scrub input { width: 100%; accent-color: rgb(var(--c-accent)); }
.marks { position: absolute; inset: 0; pointer-events: none; }
.marks span { position: absolute; top: -6px; width: 2px; height: 6px; background: rgba(var(--c-dim), .5); }
.marks span.on { background: rgb(var(--c-accent)); }
</style>
