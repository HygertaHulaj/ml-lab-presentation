<script setup lang="ts">
/**
 * The shared cinematic-lesson shell: title and modes, the 3D stage with projected labels, scene title cards, word-by-word
 * subtitles, the start screen, the side panel and the playback bar with the scene scrubber. Story / Lab / Math share one
 * playhead (store.position), so switching never loses the place. The lesson supplies its store and three slots:
 * #scene (inside <TresCanvas>), #math and #lab.
 * Shortcuts (same meaning as the presentation where they overlap): SPACE play/pause · ←/→ previous/next step · 1/2/3 Story/Explore/Math
 * · L light/dark (the presenter's theme) · F full screen · R restart scene · P presenter · legacy aliases E explore, M math.
 * Theme and reduced motion come from the presentation store, so a lesson opened from the talk looks and moves like it.
 * The 3D stage is always a dark inset (its materials are tuned for a dark ground), in both themes.
 */
import { computed, onBeforeUnmount, provide, ref, shallowRef, watch, inject } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { ArrowLeft, ChevronLeft, ChevronRight, Expand, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { toggleFullscreen, useLessonShortcuts, usePrefersReducedMotion } from '../../engine/InteractionController'
import type { LessonMode, Vec3 } from '../../engine/types'
import type { OverlayLabel } from '../../lessons/kmeans-iris/KMeansScene.vue'
import type { ShellStore } from './shell'
import { usePresentation } from '../../presentation/store'
import { themeVars } from '../../presentation/theme'
import { EMBED_CLOSE } from '../../presentation/shell/shellApi'

const props = withDefaults(defineProps<{ store: ShellStore; loadingText?: string; startLabel?: string; backTo?: string; camera?: Vec3; initiallyStarted?: boolean; accent?: string }>(),
  { loadingText: 'Computing on the server…', startLabel: 'Cinematic lesson', backTo: '/', initiallyStarted: false, camera: () => [0, -2.6, 15] as Vec3, accent: 'movies' })
const store = props.store
/** ?return=/presentation/... (from a presentation link) wins over the default back target; only same-site paths */
const backLink = computed(() => { const q = route.query.return; return typeof q === 'string' && q.startsWith('/') && !q.startsWith('//') ? q : props.backTo })
const backLabel = computed(() => (backLink.value.startsWith('/presentation') ? 'Back to the presentation' : 'Back'))
const presentation = usePresentation()
/** set when the lesson is embedded in the presentation: back returns to the same step */
const embedClose = inject(EMBED_CLOSE, null)
const osReduced = usePrefersReducedMotion()
/** the presenter's setting wins; it already follows the OS when unset */
const reducedMotion = computed(() => presentation.reducedMotionSetting ?? osReduced.value)
/** lesson type scale: reaches ~20–22 px at 1920 px wide for essential text, unchanged on small screens */
const LESSON_SCALE = { '--l-xs': 'clamp(12px, 0.9vw, 18px)', '--l-sm': 'clamp(14px, 1.06vw, 21px)', '--l-base': 'clamp(16px, 1.17vw, 23px)', '--l-lg': 'clamp(18px, 1.3vw, 26px)' }
const rootVars = computed(() => ({ ...themeVars(presentation.theme, props.accent), ...LESSON_SCALE }))
const stageVars = computed(() => themeVars('warm', props.accent))
const toggleTheme = () => { presentation.theme = presentation.theme === 'light' ? 'warm' : 'light' }
const overlay = shallowRef<OverlayLabel[]>([])
provide('lessonOverlay', overlay)
const orbitTarget = shallowRef<Vec3>([0, 0, 0])
provide('orbitTarget', orbitTarget)
const stage = ref<HTMLElement | null>(null)
const started = ref(props.initiallyStarted)
const contextLost = ref(false)
const webgl = ref(true)
try {
  const c = document.createElement('canvas')
  webgl.value = !!(c.getContext('webgl2') || c.getContext('webgl'))
} catch { webgl.value = false }

// arriving from the film's last scene (?from=film): skip the start screen and begin the story at once
const route = useRoute()
const stopFromFilm = watch(() => store.timeline, (tl) => {
  if (tl && route.query.from === 'film' && !started.value) { begin(); stopFromFilm() }
})
onBeforeUnmount(() => {
  store.controller.pause()
  store.narration?.stopSpeech()
})
const scenes = computed(() => store.timeline?.scenes ?? [])
const sceneIndex = computed(() => (store.scene ? scenes.value.findIndex((s) => s.id === store.scene!.id) : 0))
const titleOpacity = computed(() => store.scenes?.titleOpacity(store.position) ?? 0)
const cutFade = computed(() => (reducedMotion.value ? 0 : store.scenes?.cutFade(store.position) ?? 0))
const pct = computed(() => (store.position / store.duration) * 100)

function begin() {
  started.value = true
  store.setMode('story')
  store.controller.play()
}
function setMode(m: LessonMode) {
  store.setMode(m)
  started.value = true
}
function togglePlay() {
  started.value = true
  if (store.mode === 'lab') store.setMode('story')
  store.controller.toggle()
}
function onScrub(e: Event) {
  started.value = true
  store.controller.seek(+(e.target as HTMLInputElement).value)
}
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// narration voice (optional) and progress persistence
watch(() => store.position, (t) => {
  if (store.playing && store.mode !== 'lab') store.narration?.speak(t, store.voice, store.rate)
})
watch(() => store.playing, (p) => { if (!p) store.narration?.stopSpeech() })
watch(() => [store.scene?.id, store.mode], () => store.saveProgress())

useLessonShortcuts({
  space: togglePlay,
  right: () => { started.value = true; store.controller.next() },
  left: () => { started.value = true; store.controller.prev() },
  f: () => toggleFullscreen(stage.value),
  e: () => setMode(store.mode === 'lab' ? 'story' : 'lab'),
  r: () => store.restartScene(),
  m: () => setMode(store.mode === 'math' ? 'story' : 'math'),
  '1': () => setMode('story'),
  '2': () => setMode('lab'),
  '3': () => setMode('math'),
  l: toggleTheme,
  p: () => (store.presenter = !store.presenter),
  escape: () => { if (store.presenter) store.presenter = false; else embedClose?.() },
})
</script>

<template>
  <div ref="stage" class="lesson-root relative flex h-screen w-screen flex-col overflow-hidden bg-[rgb(var(--c-ground))] text-[rgb(var(--c-strong))]" :class="store.presenter && 'presenter'" :style="rootVars" :data-theme="presentation.theme">
    <!-- TOP: title · modes · progress · presenter -->
    <header v-show="!store.presenter" class="z-20 flex items-center gap-3 border-b border-[rgba(var(--c-text),.05)] bg-[rgba(var(--c-ground),.8)] px-4 py-2.5 backdrop-blur">
      <button v-if="embedClose" class="rounded-md px-2 py-1.5 text-[length:var(--l-sm)] text-[rgb(var(--c-dim))] hover:bg-[rgba(var(--c-text),.05)]" data-testid="embed-close" @click="embedClose()">← Back to the presentation (Esc)</button>
      <RouterLink v-else :to="backLink" class="rounded-md p-1.5 text-[rgb(var(--c-dim))] hover:bg-[rgba(var(--c-text),.05)] hover:text-[rgb(var(--c-strong))]" :aria-label="backLabel" :title="backLabel" data-testid="lesson-back"><ArrowLeft class="h-4 w-4" /></RouterLink>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-[length:var(--l-sm)] font-semibold tracking-wide sm:text-[length:var(--l-base)]">{{ store.manifest?.title ?? 'Loading lesson…' }}</h1>
        <div class="flex items-center gap-2 text-[length:var(--l-xs)] text-[rgb(var(--c-dim))]">
          <span>Scene {{ sceneIndex + 1 }}/{{ scenes.length }} · {{ store.scene?.title }}</span>
          <span class="hidden h-1 w-24 overflow-hidden rounded bg-[rgba(var(--c-text),.1)] sm:block"><span class="block h-1 bg-[rgb(var(--c-accent))]" :style="{ width: pct + '%' }" /></span>
        </div>
      </div>
      <div class="flex rounded-lg bg-[rgba(var(--c-text),.05)] p-0.5 text-[length:var(--l-xs)] font-medium" role="tablist" aria-label="Lesson mode">
        <button v-for="m in (['story', 'lab', 'math'] as const)" :key="m" role="tab" :aria-selected="store.mode === m" :aria-label="m === 'lab' ? 'Explore mode' : m === 'math' ? 'Math mode' : 'Story mode'" :data-testid="'mode-' + m"
                :class="['rounded-md px-3 py-1.5 capitalize', store.mode === m ? 'bg-[rgb(var(--c-accent))] text-[rgb(var(--c-ink))]' : 'text-[rgb(var(--c-soft))] hover:text-[rgb(var(--c-strong))]']" @click="setMode(m)">
          {{ m === 'lab' ? 'Explore' : m }}</button>
      </div>
      <button class="hidden rounded-md px-2 py-1.5 text-[length:var(--l-xs)] text-[rgb(var(--c-soft))] hover:bg-[rgba(var(--c-text),.05)] sm:block" title="Presenter mode (P)" @click="store.presenter = true">Presenter</button>
    </header>

    <div class="relative flex min-h-0 flex-1">
      <!-- CENTER: visualization -->
      <div class="relative min-w-0 flex-1 bg-[rgb(var(--c-ground))] text-[rgb(var(--c-strong))]" data-testid="stage" :style="stageVars">
        <TresCanvas v-if="webgl && store.timeline" clear-color="#0c1622" :antialias="true" :dpr="[1, 2]" class="!absolute inset-0">
          <TresPerspectiveCamera :position="camera" :fov="50" :near="0.1" :far="200" />
          <slot name="scene" :reduced-motion="reducedMotion" :on-context-lost="() => (contextLost = true)" />
          <OrbitControls v-if="store.mode === 'lab'" :target="orbitTarget" :enable-damping="true" make-default />
        </TresCanvas>

        <!-- projected labels -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span v-for="l in overlay" :key="l.id" :class="['lbl', 'lbl-' + l.kind]" :style="{ left: l.x + 'px', top: l.y + 'px', opacity: l.opacity, color: l.color }">{{ l.text }}</span>
        </div>
        <div class="pointer-events-none absolute inset-0 bg-[rgb(var(--c-ground2))] transition-opacity" :style="{ opacity: cutFade * 0.35 }" />
        <!-- lesson-specific heads-up display -->
        <slot v-if="started" name="hud" />

        <!-- scene title card -->
        <div v-if="store.scene && started" class="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 text-center" :style="{ opacity: titleOpacity }">
          <div class="text-[length:var(--l-xs)] font-semibold tracking-[0.3em] text-[rgba(var(--c-accent),.8)] uppercase">Scene {{ sceneIndex + 1 }}</div>
          <div class="mt-1 text-2xl font-light tracking-wide sm:text-3xl" data-testid="scene-title">{{ store.scene.title }}</div>
        </div>

        <!-- step label (always visible, used by tests and presenters) -->
        <div class="absolute top-3 left-3 rounded-full bg-[rgba(var(--c-ground2),.4)] px-3 py-1 text-[length:var(--l-xs)] text-[rgb(var(--c-soft))] backdrop-blur" data-testid="step-label">{{ store.step?.label ?? '' }}</div>

        <!-- subtitles -->
        <div v-if="store.cue && started" class="pointer-events-none absolute right-0 bottom-4 left-0 flex justify-center px-6" aria-live="polite">
          <p class="subtitle max-w-3xl rounded-xl bg-[rgba(var(--c-ground2),.45)] px-5 py-3 text-center backdrop-blur" data-testid="subtitle">
            <span v-for="(w, i) in store.cue.words" :key="i" class="word" :class="[w.spoken ? (w.keyword ? 'text-[rgb(var(--c-accent))]' : 'text-[rgb(var(--c-strong))]') : 'text-[rgb(var(--c-faint))]']">{{ w.text + ' ' }}</span>
          </p>
        </div>

        <!-- start screen -->
        <div v-if="!started && !store.loading && store.timeline" class="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(var(--c-ground),.7)] text-center backdrop-blur-sm">
          <div class="text-[length:var(--l-xs)] font-semibold tracking-[0.35em] text-[rgb(var(--c-accent))] uppercase">{{ startLabel }}</div>
          <h2 class="mt-3 max-w-xl px-6 text-3xl font-light sm:text-4xl">{{ store.manifest?.title }}</h2>
          <p class="mt-3 max-w-lg px-6 text-[length:var(--l-sm)] text-[rgb(var(--c-dim))]">{{ store.manifest?.summary }}</p>
          <div class="mt-6 flex gap-3">
            <button class="rounded-full bg-[rgb(var(--c-accent))] px-6 py-2.5 font-semibold text-[rgb(var(--c-ink))] hover:bg-[rgb(var(--c-accent))]" data-testid="begin" @click="begin">▶ Begin the story</button>
            <button class="rounded-full border border-[rgba(var(--c-text),.2)] px-6 py-2.5 text-[length:var(--l-sm)] hover:bg-[rgba(var(--c-text),.05)]" @click="setMode('lab')">Go straight to Explore</button>
          </div>
          <p class="mt-6 text-[length:var(--l-xs)] text-[rgb(var(--c-faint))]">SPACE play · ← → steps · 1 2 3 Story / Explore / Math · L light or dark · F full screen · P presenter</p>
        </div>

        <div v-if="store.loading" class="absolute inset-0 flex items-center justify-center text-[length:var(--l-sm)] text-[rgb(var(--c-dim))]" role="status">{{ loadingText }}</div>
        <div v-if="store.error" class="absolute inset-x-6 top-14 rounded-lg border border-[rgba(var(--c-err),.4)] bg-[rgba(var(--c-err),.16)] px-4 py-3 text-[length:var(--l-sm)] text-[rgb(var(--c-err))]" role="alert">{{ store.error }}</div>
        <div v-if="!webgl || contextLost" class="absolute inset-x-6 top-14 rounded-lg border border-[rgba(var(--c-ref),.4)] bg-[rgba(var(--c-ref),.16)] px-4 py-3 text-[length:var(--l-sm)] text-[rgb(var(--c-ref))]" role="alert">
          {{ contextLost ? 'The graphics context was lost (GPU reset).' : 'WebGL is not available in this browser.' }} The math panel still works.
          <button v-if="contextLost" class="ml-2 underline" @click="$router.go(0)">Reload</button>
        </div>
        <button v-if="store.presenter" class="absolute top-3 right-3 rounded-full bg-[rgba(var(--c-ground2),.4)] px-3 py-1 text-[length:var(--l-xs)] text-[rgb(var(--c-soft))]" @click="store.presenter = false">Exit presenter (Esc)</button>
      </div>

      <!-- RIGHT: contextual panel -->
      <aside v-show="!store.presenter || store.mode === 'math'" :class="['z-10 overflow-y-auto border-l border-[rgba(var(--c-text),.05)] bg-[rgba(var(--c-surface2),.9)] p-4 backdrop-blur', store.mode === 'math' ? 'w-full max-w-[min(44rem,42vw)]' : 'hidden w-[clamp(22rem,26vw,34rem)] md:block']" aria-label="Explanation panel">
        <template v-if="store.mode === 'lab'">
          <h2 class="mb-3 text-[length:var(--l-xs)] font-semibold tracking-[0.2em] text-[rgb(var(--c-accent))] uppercase">Explore</h2>
          <slot name="lab" />
          <hr class="my-4 border-[rgba(var(--c-text),.1)]" />
          <slot name="math" :large="false" />
        </template>
        <template v-else>
          <h2 class="mb-1 text-[length:var(--l-xs)] font-semibold tracking-[0.2em] text-[rgb(var(--c-accent))] uppercase">{{ store.mode === 'math' ? 'Mathematics' : 'What is happening' }}</h2>
          <p class="mb-3 text-[length:var(--l-sm)] text-[rgb(var(--c-soft))]">{{ store.step?.label }}</p>
          <slot name="math" :large="store.mode === 'math' && store.presenter" />
          <button v-if="store.mode === 'story'" class="mt-4 w-full rounded-lg border border-[rgba(var(--c-accent),.4)] px-3 py-2 text-[length:var(--l-sm)] text-[rgb(var(--c-accent))] hover:bg-[rgba(var(--c-accent),.1)]" data-testid="explore-here" @click="setMode('lab')">
            Explore this moment (E)</button>
        </template>
      </aside>
    </div>

    <!-- BOTTOM: playback -->
    <footer class="z-20 border-t border-[rgba(var(--c-text),.05)] bg-[rgba(var(--c-ground),.9)] px-3 py-2 backdrop-blur">
      <div class="relative mx-1 mb-1.5 h-5">
        <div class="absolute inset-x-0 top-2 h-1 rounded bg-[rgba(var(--c-text),.1)]" />
        <div v-for="s in scenes.slice(1)" :key="s.id" class="absolute top-1 h-3 w-px bg-[rgba(var(--c-text),.3)]" :style="{ left: (s.start / store.duration) * 100 + '%' }" :title="s.title" />
        <div v-for="m in store.timeline?.markers ?? []" :key="m.t" class="absolute top-2.5 h-1 w-1 -translate-x-1/2 rounded-full bg-[rgba(var(--c-ref),.7)]" :style="{ left: (m.t / store.duration) * 100 + '%' }" :title="m.label" />
        <input type="range" class="scrub absolute inset-0 w-full" min="0" :max="store.duration" step="0.01" :value="store.position" aria-label="Lesson timeline" data-testid="scrubber" @input="onScrub" />
      </div>
      <div class="flex items-center gap-1.5 text-[rgb(var(--c-soft))]">
        <button class="ctl" aria-label="Previous step (←)" data-testid="prev" @click="started = true; store.controller.prev()"><ChevronLeft class="h-4 w-4" /></button>
        <button class="ctl bg-[rgba(var(--c-text),.1)]" :aria-label="store.playing ? 'Pause (Space)' : 'Play (Space)'" data-testid="play" @click="togglePlay"><Pause v-if="store.playing" class="h-4 w-4" /><Play v-else class="h-4 w-4" /></button>
        <button class="ctl" aria-label="Next step (→)" data-testid="next" @click="started = true; store.controller.next()"><ChevronRight class="h-4 w-4" /></button>
        <button class="ctl" aria-label="Restart scene (R)" data-testid="restart" @click="store.restartScene()"><RotateCcw class="h-4 w-4" /></button>
        <span class="ml-1 font-mono text-[length:var(--l-xs)] text-[rgb(var(--c-dim))] tabular-nums whitespace-nowrap" data-testid="time">{{ fmtTime(store.position) }} / {{ fmtTime(store.duration) }}</span>
        <div class="chips ml-2 hidden min-w-0 gap-1 overflow-x-auto sm:flex">
          <button v-for="(s, i) in scenes" :key="s.id" :class="['rounded px-2 py-0.5 text-[length:var(--l-xs)] whitespace-nowrap', i === sceneIndex ? 'bg-[rgba(var(--c-accent),.2)] text-[rgb(var(--c-accent))]' : 'text-[rgb(var(--c-faint))] hover:text-[rgb(var(--c-text))]']"
                  @click="started = true; store.seekScene(s.id)">{{ i + 1 }}. {{ s.title }}</button>
        </div>
        <div class="ml-auto flex items-center gap-1">
          <select class="rounded bg-[rgba(var(--c-text),.05)] px-1.5 py-1 text-[length:var(--l-xs)]" aria-label="Playback speed" :value="store.rate" @change="store.controller.setRate(+($event.target as HTMLSelectElement).value)">
            <option v-for="r in [0.5, 0.75, 1, 1.5, 2]" :key="r" :value="r">{{ r }}×</option>
          </select>
          <button class="ctl" :aria-label="store.voice ? 'Narration voice on' : 'Narration voice off'" :title="'Narration voice (optional)'" @click="store.voice = !store.voice"><Volume2 v-if="store.voice" class="h-4 w-4" /><VolumeX v-else class="h-4 w-4" /></button>
          <button class="ctl" aria-label="Full screen (F)" @click="toggleFullscreen(stage)"><Expand class="h-4 w-4" /></button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.ctl { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 0.5rem; }
.ctl:hover { background: rgba(var(--c-text), 0.08); }
.ctl:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid rgb(var(--c-accent)); outline-offset: 2px; }
.lbl { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; font-size: clamp(12px, 0.85vw, 17px); text-shadow: 0 0 6px #000, 0 0 2px #000; }
.lbl-axis { font-size: clamp(13px, 0.95vw, 18px); color: rgb(var(--c-data-soft)); letter-spacing: 0.04em; }
.lbl-axis-y { font-size: clamp(13px, 0.95vw, 18px); color: rgb(var(--c-data-soft)); letter-spacing: 0.04em; transform: translate(-50%, -50%) rotate(-90deg); }
.lbl-tick { font-size: 10px; color: #64748b; }
.lbl-centroid { font-weight: 700; font-size: 15px; }
.lbl-distance { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: rgba(7, 11, 20, 0.7); padding: 1px 6px; border-radius: 6px; }
.lbl-focus { font-family: ui-monospace, Consolas, monospace; font-size: 11px; color: #fff; background: rgba(7, 11, 20, 0.75); padding: 1px 6px; border-radius: 6px; transform: translate(-50%, 0); }
.subtitle { font-size: clamp(17px, 1.25vw, 26px); line-height: 1.5; }
.word { transition: color 0.15s; }
.chips { scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.presenter .subtitle { font-size: clamp(24px, 1.7vw, 36px); }
.presenter .lbl-centroid { font-size: 22px; }
.presenter .lbl-distance { font-size: 18px; }
.scrub { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
.scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 9999px; background: rgb(var(--c-accent)); box-shadow: 0 0 10px rgb(var(--c-accent)); }
.scrub::-moz-range-thumb { width: 14px; height: 14px; border-radius: 9999px; background: rgb(var(--c-accent)); border: 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
