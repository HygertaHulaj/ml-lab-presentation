<script setup lang="ts">
/**
 * "The Scan That Changed Everything" — cinematic introduction to Machine Learning.
 * Mode B (interactive story): the whole film is a Three.js world rendered from the playhead `t` (LessonTimelineController).
 * Mode A (rendered film): plays the Remotion MP4 when public/film/the-scan-that-changed-everything.mp4 exists.
 * Shortcuts: SPACE play/pause · ←/→ previous/next scene · F full screen · C captions · M mute · V voice · S skip · R restart · P presenter
 */
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { Captions, CaptionsOff, ChevronLeft, ChevronRight, Expand, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX, Mic, MicOff } from 'lucide-vue-next'
import { LessonTimelineController } from '../engine/LessonTimelineController'
import { toggleFullscreen, useLessonShortcuts, usePrefersReducedMotion } from '../engine/InteractionController'
import { cueAt, narration, sceneAt, sceneIndexAt, SPEAKER_NAME, storyboard, transitionOverlayAt, type StoryCue } from '../experiences/cinematic/story'
import { AmbientScore } from '../experiences/cinematic/audio/AmbientScore'
import ConceptPreview from '../experiences/cinematic/components/ConceptPreview.vue'
import { clamp, smooth, span, window01 } from '../experiences/cinematic/world/math'
import type { FilmWorld } from '../experiences/cinematic/world/FilmWorld'

const route = useRoute()
const router = useRouter()
const SB = storyboard
const END = 170.6
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const world = shallowRef<FilmWorld | null>(null)
const controller = markRaw(new LessonTimelineController(SB.duration))
controller.setDuration(SB.duration, SB.scenes.map((s) => s.start))
const t = ref(0)
const playing = ref(false)
const rate = ref(1)
controller.subscribe((s) => { t.value = s.t; playing.value = s.playing; rate.value = s.rate })

const started = ref(false)
const loading = ref(true)
const webgl = ref(true)
const captions = ref(true)
const voice = ref(false)
const muted = ref(false)
const volume = ref(0.7)
const presenter = ref(false)
const lowQuality = ref(route.query.quality === 'low')
const showControls = ref(true)
const mode = ref<'interactive' | 'video'>('interactive')
const videoAvailable = ref(false)
const VIDEO_URL = '/film/the-scan-that-changed-everything.mp4'
const reducedPref = usePrefersReducedMotion()
const reducedOverride = ref<boolean | null>(null)
const reduced = computed(() => reducedOverride.value ?? reducedPref.value)
const score = new AmbientScore()

const scene = computed(() => sceneAt(t.value))
const sceneIdx = computed(() => sceneIndexAt(t.value))
const cue = computed<StoryCue | null>(() => cueAt(t.value))
const words = computed(() => {
  const c = cue.value
  if (!c) return []
  const toks = c.text.split(/\s+/)
  const p = clamp((t.value - c.start) / ((c.end - c.start) * 0.8))
  const n = Math.ceil(p * toks.length)
  const kws = c.keywords.map((k) => k.toLowerCase())
  return toks.map((w, i) => ({ w, on: i < n, kw: kws.some((k) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(k)) }))
})
const titleOpacity = computed(() => window01(t.value, SB.titleCard.start, SB.titleCard.end, 1.0, 1.0))
const sceneCardOpacity = computed(() => (sceneIdx.value === 0 ? 0 : window01(t.value, scene.value.start + 0.3, scene.value.start + 3.2, 0.6, 0.8)))
const stages = SB.scenes.find((s) => s.id === 's5-machine')!.stages!
const stageIdx = computed(() => { const x = t.value; return x < 72 ? 0 : x < 76.4 ? 1 : x < 81 ? 2 : x < 85.5 ? 3 : x < 90.2 ? 4 : 5 })
const stageHud = computed(() => window01(t.value, 70.4, 95, 0.6, 0.6))
const revealText = computed(() => window01(t.value, 158.5, 166.5, 1.2, 1))
const conceptsOn = computed(() => window01(t.value, 160, 167.2, 0.8, 0.8))
const conceptP = computed(() => smooth(span(t.value, 160.5, 165.5)))
const hub = computed(() => t.value >= END - 0.4)
const pct = computed(() => (t.value / SB.duration) * 100)
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const CONCEPTS = [
  { kind: 'classification' as const, title: 'Classification', caption: 'Learn a boundary between labelled groups (setosa vs versicolor petals).' },
  { kind: 'regression' as const, title: 'Regression', caption: 'Predict a number: petal width from petal length, fitted by least squares.' },
  { kind: 'clustering' as const, title: 'Clustering', caption: 'No labels: find structure from similarity (each flower → its nearest neighbour).' },
  { kind: 'evaluation' as const, title: 'Model Evaluation', caption: 'Count right and wrong: a confusion matrix for versicolor vs virginica.' },
]
const PATHS = [
  { title: 'Classification', text: 'Features, labels, decision boundaries, accuracy. Train classifiers on real data.', to: '/training', cta: 'Training Studio' },
  { title: 'Clustering', text: 'K-Means on these 150 Iris flowers. Every step is computed by the FastAPI backend: play, pause, step and inspect.', to: '/lessons/kmeans-iris?from=film', cta: 'Start the K-Means lab', primary: true },
  { title: 'Regression', text: 'Continuous predictions, fitted lines, residuals and gradient descent.', to: '/gradient-descent', cta: 'Regression lab' },
  { title: 'Model Evaluation', text: 'Train/test split, confusion matrix, precision, recall, false positives and false negatives.', to: '/evaluation', cta: 'Evaluation lab' },
]

// ------------------------------------------------------------------ rendering loop
let raf = 0
let lastT = -1
let dirty = true
let frames = 0, fpsStart = 0
const fps = ref(0)
function loop(now: number) {
  raf = requestAnimationFrame(loop)
  const w = world.value
  if (!w) return
  const x = controller.t
  if (x !== lastT || dirty || playing.value) {
    w.render(x, reduced.value ? Math.min(0.6, transitionOverlayAt(x).amount) : transitionOverlayAt(x).amount)
    lastT = x
    dirty = false
  }
  score.update(x, playing.value)
  speak(x)
  // adaptive quality: if the first seconds of playback run below ~28 fps, drop bloom and pixel ratio
  if (playing.value) {
    if (!fpsStart) fpsStart = now
    frames++
    if (now - fpsStart > 2500) {
      fps.value = Math.round((frames * 1000) / (now - fpsStart))
      if (fps.value < 28 && !lowQuality.value) setLowQuality(true)
      frames = 0
      fpsStart = now
    }
  }
}
function setLowQuality(v: boolean) {
  lowQuality.value = v
  const w = world.value
  if (!w) return
  w.setQuality(v ? 'low' : 'high')
  w.renderer.setPixelRatio(v ? 1 : Math.min(2, window.devicePixelRatio || 1))
  resize()
}
function resize() {
  const w = world.value, c = canvas.value
  if (!w || !c) return
  w.setSize(c.clientWidth, c.clientHeight)
  dirty = true
}
let ro: ResizeObserver | null = null

// ------------------------------------------------------------------ narration voice (optional, Web Speech)
let spokenId = ''
function speak(x: number) {
  if (!voice.value || !playing.value || typeof speechSynthesis === 'undefined') return
  const c = cueAt(x)
  if (!c || c.id === spokenId || c.speaker === 'note') return
  spokenId = c.id
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(c.text.replace(/^\(.*?\)\s*/, ''))
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  if (voices.length) u.voice = voices[c.speaker === 'salizar' ? Math.min(1, voices.length - 1) : 0]
  u.pitch = c.speaker === 'noe' ? 1.15 : c.speaker === 'salizar' ? 1.05 : 0.95
  u.rate = Math.min(1.6, 0.95 * rate.value)
  speechSynthesis.speak(u)
}
function stopSpeech() { spokenId = ''; if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() }

// ------------------------------------------------------------------ actions
function begin() {
  started.value = true
  score.start()
  score.setVolume(volume.value)
  score.setMuted(muted.value)
  if (controller.t >= END - 0.5) controller.seek(0)
  controller.play()
  poke()
}
function togglePlay() {
  if (!started.value) return begin()
  if (playing.value) { controller.pause(); stopSpeech() } else { score.start(); controller.play() }
  poke()
}
function seek(x: number) { started.value = true; stopSpeech(); controller.seek(x); dirty = true; poke() }
function nextScene() { const i = sceneIdx.value; seek(i < SB.scenes.length - 1 ? SB.scenes[i + 1].start : END) }
function prevScene() { const s = scene.value; seek(t.value - s.start > 1.5 ? s.start : SB.scenes[Math.max(0, sceneIdx.value - 1)].start) }
function skip() { started.value = true; controller.pause(); stopSpeech(); controller.seek(END); dirty = true }
function restart() { seek(0); controller.play() }
function toggleMute() { muted.value = !muted.value; score.setMuted(muted.value); if (muted.value) stopSpeech() }
function setVolume(v: number) { volume.value = v; score.setVolume(v) }
let hideTimer = 0
function poke() {
  showControls.value = true
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { if (playing.value) showControls.value = false }, 2600)
}
function enterLab(to: string) {
  controller.pause()
  stopSpeech()
  void router.push(to)
}

useLessonShortcuts({
  space: togglePlay,
  right: nextScene,
  left: prevScene,
  f: () => toggleFullscreen(stage.value),
  m: toggleMute,
  r: restart,
  p: () => (presenter.value = !presenter.value),
  escape: () => (presenter.value = false),
})
function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'c') captions.value = !captions.value
  else if (k === 'v') { voice.value = !voice.value; if (!voice.value) stopSpeech() }
  else if (k === 's') skip()
}

// ------------------------------------------------------------------ lifecycle
onMounted(async () => {
  window.addEventListener('keydown', onKey)
  // keep the playhead on the wall clock even when a frame is slow (audio/voice stay in sync); restored on unmount
  gsap.ticker.lagSmoothing(0)
  try {
    const probe = document.createElement('canvas')
    webgl.value = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch { webgl.value = false }
  // rendered film present? (dev servers answer unknown paths with index.html, so check the content type)
  fetch(VIDEO_URL, { method: 'HEAD' }).then((r) => { videoAvailable.value = r.ok && (r.headers.get('content-type') ?? '').includes('video') }).catch(() => {})
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) } catch { /* fonts optional */ }
  if (webgl.value && canvas.value) {
    const { FilmWorld } = await import('../experiences/cinematic/world/FilmWorld')
    const c = canvas.value
    world.value = markRaw(new FilmWorld({ canvas: c, width: c.clientWidth || 1280, height: c.clientHeight || 720, quality: lowQuality.value ? 'low' : 'high', reducedMotion: reduced.value, preserveDrawingBuffer: route.query.preserve === '1' }))
    if (lowQuality.value) setLowQuality(true)
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); webgl.value = false })
    ro = new ResizeObserver(resize)
    ro.observe(c)
  }
  const q = Number(route.query.t)
  if (Number.isFinite(q) && q > 0) { started.value = true; controller.seek(q) }
  loading.value = false
  raf = requestAnimationFrame(loop)
  if (route.query.autoplay === '1') begin()
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__film = { seek: (x: number) => seek(x), pause: () => controller.pause(), play: () => controller.play(), state: () => ({ t: controller.t, shot: world.value?.lastShot, scene: sceneAt(controller.t).id }) }
})
onBeforeUnmount(() => {
  gsap.ticker.lagSmoothing(500, 33)
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(hideTimer)
  ro?.disconnect()
  controller.dispose()
  stopSpeech()
  score.dispose()
  world.value?.dispose()
  world.value = null
})
function setReduced(v: boolean) { reducedOverride.value = v; world.value?.setReducedMotion(v); dirty = true }
const fullTranscript = narration
</script>

<template>
  <div ref="stage" class="film-root" :class="{ presenter, 'hide-ui': !showControls && playing && started }" data-testid="film" @mousemove="poke" @touchstart.passive="poke">
    <!-- MODE B: interactive story -->
    <canvas v-show="mode === 'interactive'" ref="canvas" class="film-canvas" data-testid="film-canvas" aria-label="Animated film: The Scan That Changed Everything" />
    <div v-if="!webgl && mode === 'interactive'" class="fallback" role="alert">
      <p>3D graphics are unavailable on this device. The story continues with captions below{{ videoAvailable ? ', or switch to the rendered film' : '' }}.</p>
      <button v-if="videoAvailable" class="btn-ghost" @click="mode = 'video'">Play rendered film</button>
    </div>

    <!-- MODE A: rendered film (Remotion MP4) -->
    <div v-if="mode === 'video'" class="video-wrap">
      <video controls autoplay class="film-video" :src="VIDEO_URL" data-testid="film-video">
        <track kind="captions" src="/film/the-scan-that-changed-everything.en.vtt" srclang="en" label="English" default />
      </video>
      <button class="btn-ghost back-int" @click="mode = 'interactive'">← Interactive story</button>
    </div>

    <template v-if="mode === 'interactive'">
      <!-- vignette bars for scope -->
      <div class="bars" aria-hidden="true" />
      <!-- title card -->
      <div class="title-card" :style="{ opacity: started ? titleOpacity : 0 }" aria-hidden="true">
        <div class="kicker">A story about machine learning</div>
        <h1>{{ SB.title }}</h1>
        <p>{{ SB.subtitle }}</p>
      </div>
      <!-- scene card -->
      <div class="scene-card" :style="{ opacity: started ? sceneCardOpacity : 0 }" data-testid="scene-card">
        <span>{{ String(scene.n).padStart(2, '0') }}</span>{{ scene.title }}
      </div>
      <!-- Scene 5 HUD: the data journey -->
      <ol class="journey-hud" :style="{ opacity: stageHud }" aria-label="Stages inside the model">
        <li v-for="(s, i) in stages" :key="s" :class="{ on: i === stageIdx, done: i < stageIdx }">{{ s }}</li>
      </ol>
      <!-- Scene 9 reveal -->
      <div class="reveal" :style="{ opacity: revealText }" aria-hidden="true">
        <p>Learning Patterns. Making Predictions. Improving with Data.</p>
      </div>
      <div class="concepts" :style="{ opacity: conceptsOn, pointerEvents: 'none' }" data-testid="concepts">
        <ConceptPreview v-for="c in CONCEPTS" :key="c.kind" :kind="c.kind" :title="c.title" :caption="c.caption" :p="conceptP" />
      </div>
      <!-- captions -->
      <div v-if="captions && cue && started" class="captions" aria-live="polite" data-testid="caption">
        <span v-if="cue.speaker !== 'narrator'" class="speaker" :class="cue.speaker">{{ SPEAKER_NAME[cue.speaker] }}</span>
        <p :class="{ note: cue.speaker === 'note', dialogue: cue.speaker === 'noe' || cue.speaker === 'salizar' }">
          <span v-for="(x, i) in words" :key="i" :class="{ on: x.on, kw: x.kw && x.on }">{{ x.w + ' ' }}</span>
        </p>
      </div>
      <!-- disclaimer, shown while medical content is on screen -->
      <div v-if="started && t > 49 && t < 136" class="disclaimer">Fictional system · synthetic images · not a medical device</div>

      <!-- END: Inside Machine Learning -->
      <section v-if="hub" class="hub" data-testid="hub" aria-labelledby="hub-title">
        <div class="hub-head">
          <div class="kicker">Welcome to Machine Learning</div>
          <h2 id="hub-title">INSIDE MACHINE LEARNING</h2>
          <p>In the background: <strong>150 real Iris flowers</strong> plotted by sepal length × sepal width, unlabelled, ready for clustering.
            The hospital story was a conceptual example; Iris is a botany dataset, not medical evidence.</p>
        </div>
        <div class="paths">
          <button v-for="p in PATHS" :key="p.title" class="path" :class="{ primary: p.primary }" :data-testid="'path-' + p.title.toLowerCase().replace(/\s+/g, '-')" @click="enterLab(p.to)">
            <strong>{{ p.title }}</strong>
            <span>{{ p.text }}</span>
            <em>{{ p.cta }} →</em>
          </button>
        </div>
        <div class="hub-foot">
          <button class="btn-ghost" @click="restart">↺ Replay the film</button>
          <RouterLink class="btn-ghost" to="/">ML Lab home</RouterLink>
        </div>
      </section>

      <!-- start screen -->
      <div v-if="!started" class="start" data-testid="film-start">
        <div class="kicker">Cinematic introduction · {{ fmt(SB.duration) }}</div>
        <h1>{{ SB.title }}</h1>
        <p class="sub">{{ SB.subtitle }}</p>
        <div class="start-actions">
          <button class="btn-primary" data-testid="film-play" :disabled="loading" @click="begin">▶ Play the story</button>
          <button v-if="videoAvailable" class="btn-ghost" @click="mode = 'video'; started = true">Rendered film (MP4)</button>
          <button class="btn-ghost" data-testid="film-skip-start" @click="skip">Skip to the ML Lab</button>
        </div>
        <div class="start-opts">
          <label><input v-model="captions" type="checkbox" /> Captions</label>
          <label><input type="checkbox" :checked="!muted" @change="toggleMute" /> Sound</label>
          <label><input v-model="voice" type="checkbox" /> Narration voice (browser)</label>
          <label><input type="checkbox" :checked="reduced" @change="setReduced(($event.target as HTMLInputElement).checked)" /> Reduced motion</label>
          <label><input type="checkbox" :checked="lowQuality" @change="setLowQuality(($event.target as HTMLInputElement).checked)" /> Performance mode</label>
        </div>
        <p class="hint">SPACE play · ← → scenes · C captions · M mute · V voice · S skip · F full screen · P presenter</p>
        <p class="fine">{{ SB.disclaimer }}</p>
      </div>

      <!-- controls -->
      <footer v-if="started" class="controls" :class="{ hidden: !showControls && playing }" @mouseenter="showControls = true">
        <div class="track">
          <div class="rail"><div class="fill" :style="{ width: pct + '%' }" /></div>
          <button v-for="s in SB.scenes.slice(1)" :key="s.id" class="tick" :style="{ left: (s.start / SB.duration) * 100 + '%' }" :title="s.n + '. ' + s.title" :aria-label="'Go to scene ' + s.n + ': ' + s.title" @click="seek(s.start)" />
          <input type="range" min="0" :max="SB.duration" step="0.01" :value="t" aria-label="Film timeline" data-testid="film-scrubber" @input="seek(+($event.target as HTMLInputElement).value)" />
        </div>
        <div class="row">
          <button class="ctl" aria-label="Previous scene (←)" @click="prevScene"><ChevronLeft class="ic" /></button>
          <button class="ctl main" :aria-label="playing ? 'Pause (Space)' : 'Play (Space)'" data-testid="film-toggle" @click="togglePlay"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
          <button class="ctl" aria-label="Next scene (→)" @click="nextScene"><ChevronRight class="ic" /></button>
          <button class="ctl" aria-label="Restart (R)" @click="restart"><RotateCcw class="ic" /></button>
          <span class="time" data-testid="film-time">{{ fmt(t) }} / {{ fmt(SB.duration) }}</span>
          <span class="scene-name" data-testid="film-scene">{{ scene.n }}. {{ scene.title }}</span>
          <div class="right">
            <select :value="rate" aria-label="Playback speed" @change="controller.setRate(+($event.target as HTMLSelectElement).value)">
              <option v-for="r in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="r" :value="r">{{ r }}×</option>
            </select>
            <button class="ctl" :aria-label="captions ? 'Hide captions (C)' : 'Show captions (C)'" @click="captions = !captions"><Captions v-if="captions" class="ic" /><CaptionsOff v-else class="ic" /></button>
            <button class="ctl" :aria-label="voice ? 'Narration voice off (V)' : 'Narration voice on (V)'" @click="voice = !voice; if (!voice) stopSpeech()"><Mic v-if="voice" class="ic" /><MicOff v-else class="ic" /></button>
            <button class="ctl" :aria-label="muted ? 'Unmute (M)' : 'Mute (M)'" @click="toggleMute"><VolumeX v-if="muted" class="ic" /><Volume2 v-else class="ic" /></button>
            <input class="vol" type="range" min="0" max="1" step="0.05" :value="volume" aria-label="Volume" @input="setVolume(+($event.target as HTMLInputElement).value)" />
            <button class="ctl" aria-label="Skip introduction (S)" data-testid="film-skip" @click="skip"><SkipForward class="ic" /></button>
            <button class="ctl" aria-label="Full screen (F)" @click="toggleFullscreen(stage)"><Expand class="ic" /></button>
          </div>
        </div>
      </footer>
      <details class="sr-only"><summary>Transcript</summary><p v-for="c in fullTranscript" :key="c.id">{{ c.speaker === 'narrator' ? '' : SPEAKER_NAME[c.speaker] + ': ' }}{{ c.text }}</p></details>
    </template>
  </div>
</template>

<style scoped>
.film-root { position: fixed; inset: 0; background: #04070e; color: #e8eef8; overflow: hidden; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.film-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hide-ui { cursor: none; }
.bars { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 160px rgba(0, 0, 0, 0.55); }
.kicker { font: 600 12px 'Space Grotesk', system-ui; letter-spacing: 0.38em; text-transform: uppercase; color: #38d6f0; }
.title-card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.title-card h1, .start h1 { font: 600 clamp(32px, 5.2vw, 84px) / 1.02 'Space Grotesk', system-ui; letter-spacing: 0.04em; text-transform: uppercase; margin: 14px 0 10px; text-shadow: 0 0 40px rgba(56, 214, 240, 0.35); }
.title-card p, .start .sub { font: 400 clamp(16px, 1.7vw, 26px) 'Inter', system-ui; color: #9fb0c8; letter-spacing: 0.04em; }
.scene-card { position: absolute; top: 5.5vh; left: 4vw; font: 500 clamp(13px, 1.1vw, 18px) 'Space Grotesk', system-ui; letter-spacing: 0.24em; text-transform: uppercase; color: #cfe8f5; pointer-events: none; }
.scene-card span { color: #38d6f0; margin-right: 14px; }
.journey-hud { position: absolute; top: 5vh; right: 3vw; display: flex; flex-direction: column; gap: 6px; list-style: none; padding: 0; margin: 0; pointer-events: none; }
.journey-hud li { font: 500 clamp(12px, 1vw, 16px) 'Space Grotesk', system-ui; letter-spacing: 0.06em; color: rgba(159, 176, 200, 0.55); padding: 5px 12px; border-left: 2px solid rgba(159, 176, 200, 0.2); transition: all 0.3s; }
.journey-hud li.done { color: #9fb0c8; border-color: #3b7bff; }
.journey-hud li.on { color: #f2b54a; border-color: #f2b54a; background: rgba(242, 181, 74, 0.08); }
.reveal { position: absolute; left: 0; right: 0; top: 52vh; text-align: center; pointer-events: none; }
.reveal p { font: 400 clamp(16px, 1.7vw, 28px) 'Inter', system-ui; letter-spacing: 0.08em; color: #cfe8f5; text-shadow: 0 0 18px rgba(0, 0, 0, 0.9); }
.concepts { position: absolute; left: 50%; bottom: 13vh; transform: translateX(-50%); display: flex; gap: 14px; }
.captions { position: absolute; left: 50%; bottom: 9vh; transform: translateX(-50%); width: min(1100px, 88vw); text-align: center; pointer-events: none; }
.captions p { display: inline; font: 500 clamp(18px, 1.75vw, 30px) / 1.45 'Inter', system-ui; padding: 6px 16px; background: rgba(4, 7, 14, 0.58); border-radius: 10px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.captions p span { color: rgba(232, 238, 248, 0.32); transition: color 0.12s; }
.captions p span.on { color: #f2f6fc; }
.captions p span.kw { color: #7fe3ff; }
.captions p.dialogue span.on { color: #fff3dc; }
.captions p.note { font-size: clamp(14px, 1.2vw, 20px); font-style: italic; }
.captions p.note span.on { color: #f2b54a; }
.speaker { display: block; margin-bottom: 6px; font: 600 clamp(12px, 0.95vw, 15px) 'Space Grotesk', system-ui; letter-spacing: 0.22em; text-transform: uppercase; }
.speaker.noe { color: #5fd3c8; }
.speaker.salizar { color: #f2b54a; }
.speaker.note { color: #9fb0c8; }
.disclaimer { position: absolute; right: 2vw; bottom: 2.4vh; font: 500 11px 'Inter', system-ui; letter-spacing: 0.08em; color: rgba(159, 176, 200, 0.7); pointer-events: none; }
.controls ~ .disclaimer { bottom: 90px; }
.start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; background: radial-gradient(ellipse at center, rgba(11, 22, 48, 0.55), rgba(4, 7, 14, 0.92)); }
.start-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 28px; }
.btn-primary { font: 600 17px 'Space Grotesk', system-ui; letter-spacing: 0.06em; padding: 14px 30px; border-radius: 999px; background: #38d6f0; color: #04070e; box-shadow: 0 0 40px rgba(56, 214, 240, 0.35); }
.btn-primary:hover { background: #7fe3ff; }
.btn-primary:disabled { opacity: 0.5; }
.btn-ghost { font: 500 15px 'Inter', system-ui; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(232, 238, 248, 0.25); color: #e8eef8; background: rgba(4, 7, 14, 0.4); }
.btn-ghost:hover { background: rgba(232, 238, 248, 0.08); }
.start-opts { display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; margin-top: 26px; font-size: 14px; color: #cbd5e1; }
.start-opts input { accent-color: #38d6f0; margin-right: 6px; }
.hint { margin-top: 22px; font-size: 12px; color: #7a8aa3; letter-spacing: 0.04em; }
.fine { margin-top: 8px; max-width: 640px; font-size: 12px; color: #7a8aa3; }
.controls { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 18px 12px; background: linear-gradient(transparent, rgba(4, 7, 14, 0.92)); transition: opacity 0.4s, transform 0.4s; }
.controls.hidden { opacity: 0; transform: translateY(12px); }
.track { position: relative; height: 18px; margin: 0 4px 6px; }
.rail { position: absolute; left: 0; right: 0; top: 8px; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.14); }
.fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b7bff, #38d6f0); }
.tick { position: absolute; top: 4px; width: 9px; height: 11px; margin-left: -4px; z-index: 2; }
.tick::after { content: ''; position: absolute; left: 4px; top: 0; width: 1px; height: 11px; background: rgba(255, 255, 255, 0.45); }
.track input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; z-index: 1; }
.row { display: flex; align-items: center; gap: 6px; }
.ctl { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; color: #dbe6f5; }
.ctl:hover { background: rgba(255, 255, 255, 0.08); }
.ctl.main { background: rgba(56, 214, 240, 0.16); }
.ic { width: 18px; height: 18px; }
.time { font: 500 13px 'JetBrains Mono', Consolas, monospace; color: #9fb0c8; margin-left: 6px; }
.scene-name { margin-left: 12px; font: 500 13px 'Space Grotesk', system-ui; letter-spacing: 0.08em; color: #cfe8f5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.right select { background: rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 6px; font-size: 13px; color: #e8eef8; }
.right select option { background: #0b1630; }
.vol { width: 80px; accent-color: #38d6f0; }
button:focus-visible, select:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid #38d6f0; outline-offset: 2px; }
.hub { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 4vh 4vw 11vh; background: linear-gradient(rgba(4, 7, 14, 0.85), rgba(4, 7, 14, 0) 28%, rgba(4, 7, 14, 0) 55%, rgba(4, 7, 14, 0.92)); animation: hubIn 1.2s ease both; }
@keyframes hubIn { from { opacity: 0; } to { opacity: 1; } }
.hub-head { text-align: center; }
.hub-head h2 { font: 600 clamp(28px, 3.6vw, 60px) 'Space Grotesk', system-ui; letter-spacing: 0.12em; margin: 8px 0; }
.hub-head p { max-width: 860px; margin: 0 auto; color: #9fb0c8; font-size: clamp(13px, 1vw, 16px); }
.paths { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: auto; }
.path { text-align: left; display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 16px; background: rgba(8, 16, 34, 0.82); border: 1px solid rgba(56, 214, 240, 0.22); backdrop-filter: blur(8px); transition: transform 0.2s, border-color 0.2s; }
.path:hover { transform: translateY(-3px); border-color: #38d6f0; }
.path.primary { border-color: #f2b54a; box-shadow: 0 0 30px rgba(242, 181, 74, 0.18); }
.path strong { font: 600 20px 'Space Grotesk', system-ui; letter-spacing: 0.04em; }
.path span { font-size: 14px; color: #b6c4d8; line-height: 1.45; }
.path em { font-style: normal; font-weight: 600; font-size: 14px; color: #38d6f0; margin-top: auto; }
.path.primary em { color: #f2b54a; }
.hub-foot { display: flex; justify-content: center; gap: 12px; margin-top: 14px; }
.video-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #000; }
.film-video { width: 100%; height: 100%; object-fit: contain; }
.back-int { position: absolute; top: 16px; left: 16px; }
.fallback { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); text-align: center; max-width: 560px; color: #f2b54a; }
.presenter .captions p { font-size: clamp(22px, 2.3vw, 40px); }
.presenter .scene-card { font-size: clamp(16px, 1.4vw, 22px); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) {
  .concepts { display: none; }
  .paths { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vol, .scene-name { display: none; }
}
@media (max-width: 560px) { .paths { grid-template-columns: 1fr; } .path span { display: none; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>
