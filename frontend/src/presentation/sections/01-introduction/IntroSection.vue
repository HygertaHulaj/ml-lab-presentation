<script setup lang="ts">
import { SHOW_EXTRA_PAGES } from '../../../features'
/**
 * Section 1 — the finished opening film (not re-rendered), then the hand-off: the film's final frame dissolves
 * into the presentation's data field and the AI section begins.
 * Steps: 0 title + Start · 1 the film · 2 pixels → data points (auto-continues to Section 2).
 * The MP4's captions are burned in by the Remotion render, so no caption track is attached (it would show them twice).
 */
import { THROUGH_LINE, sectionById } from '../../sections'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import CinematicVideoPlayer from '../../media/CinematicVideoPlayer.vue'
import { PixelDissolve } from '../../media/PixelDissolve'
import { storyboard } from '../../../experiences/cinematic/story'

const FILM = '/film/the-scan-that-changed-everything.mp4'
const POSTER = '/film/poster.jpg'
const LAST = '/film/last-frame.jpg'

const store = usePresentation()
const shell = useShell()
const player = ref<InstanceType<typeof CinematicVideoPlayer> | null>(null)
const failed = ref(false)
const handoffText = ref(0)
let tween: gsap.core.Tween | null = null
let continueTimer = 0

const step = () => store.stepOf('intro')

function start() { store.setStep('intro', 1) }
function skip() { store.setStep('intro', 2) }

/** Source for the dissolve: the live video frame when the film was watched to the end, else its saved last frame. */
async function frameSource(): Promise<{ src: CanvasImageSource; w: number; h: number }> {
  const v = player.value?.video
  if (v && v.readyState >= 2 && v.ended) return { src: v, w: v.videoWidth, h: v.videoHeight }
  const img = new Image()
  img.src = LAST
  try { await img.decode() } catch { /* blank source → the field simply fades in */ }
  return { src: img, w: img.naturalWidth || 1920, h: img.naturalHeight || 1080 }
}

async function handoff() {
  tween?.kill()
  window.clearTimeout(continueTimer)
  const canvas = shell.overlayCanvas.value
  if (!canvas) return
  const d = new PixelDissolve(canvas)
  const { src, w, h } = await frameSource()
  d.prepare(src, w, h)
  const prog = { p: 0 }
  shell.setFieldAlpha(0, 0)
  if (store.reducedMotion) {
    d.clear()
    shell.setFieldAlpha(1, 0)
    handoffText.value = 1
  } else {
    tween = gsap.to(prog, {
      p: 1, duration: 3.6, ease: 'none',
      onUpdate: () => {
        d.render(prog.p)
        if (prog.p > 0.7) shell.setFieldAlpha(1, 1.1)
        handoffText.value = Math.min(1, Math.max(0, (prog.p - 0.35) / 0.3))
      },
      onComplete: () => d.clear(),
    })
  }
  continueTimer = window.setTimeout(() => { if (store.section === 'intro' && step() === 2) shell.go('ai', 0) }, store.reducedMotion ? 2600 : 5200)
}

function enter(s: number) {
  shell.immersive.value = s === 1
  if (s === 0 || s === 1) { shell.setFieldAlpha(0, 0.6); handoffText.value = 0 }
  if (s === 1) void nextTick(() => player.value?.play())
  if (s !== 1) player.value?.pause()
  if (s === 2) void handoff()
}
watch(() => store.stepOf('intro'), enter)
onMounted(() => enter(step()))
onBeforeUnmount(() => {
  tween?.kill()
  window.clearTimeout(continueTimer)
  shell.immersive.value = false
  const c = shell.overlayCanvas.value
  c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
})

// during the film: Space toggles playback, Escape/S skips, → also skips to the hand-off
useSectionKeys((e) => {
  if (step() !== 1) return false
  if (e.key === ' ') { player.value?.toggle(); return true }
  if (e.key === 'Escape' || e.key.toLowerCase() === 's') { skip(); return true }
  return false
})
const INTRO_BRIDGE = sectionById('intro')!.bridge
</script>

<template>
  <section class="intro" data-testid="section-intro">
    <!-- step 0: title -->
    <div v-if="step() === 0" class="title" :style="{ backgroundImage: `url(${POSTER})` }">
      <div class="veil" />
      <div class="content">
        <div class="kicker">Machine Learning · Data Science for All, Chapter 8</div>
        <h1>{{ storyboard.title }}</h1>
        <p class="sub">{{ storyboard.subtitle }}</p>
        <button class="primary" data-testid="start-presentation" @click="start">▶ Start presentation</button>
        <div class="alt">
          <button class="ghost" data-testid="skip-film" @click="skip">Skip the film</button>
          <RouterLink v-if="SHOW_EXTRA_PAGES" class="ghost" to="/film">Interactive 3D version</RouterLink>
        </div>
        <p class="hint">→ next · ← back · I index · F full screen · M mute</p>
      </div>
    </div>

    <!-- step 1: the film -->
    <CinematicVideoPlayer
      v-else-if="step() === 1"
      ref="player" :src="FILM" :poster="POSTER"
      v-model:captions="store.captions" v-model:muted="store.muted" v-model:volume="store.volume"
      @ended="skip" @skip="skip" @error="failed = true">
      <template #fallback>
        <div class="alt">
          <RouterLink v-if="SHOW_EXTRA_PAGES" class="ghost" to="/film">Watch the interactive version</RouterLink>
          <button class="ghost" @click="skip">Continue the presentation</button>
        </div>
      </template>
    </CinematicVideoPlayer>

    <!-- step 2: pixels become data -->
    <div v-else class="handoff" data-testid="handoff">
      <p :style="{ opacity: handoffText }">Every scan is data.<br /><span>{{ INTRO_BRIDGE }}</span></p>
      <p class="through" :style="{ opacity: handoffText }" data-testid="through-line">Today's question: {{ THROUGH_LINE }}</p>
      <div class="handoff-actions" :style="{ opacity: handoffText }">
        <button class="ghost" @click="store.setStep('intro', 1)">↺ Replay the film</button>
        <button class="primary small" data-testid="continue-ai" @click="shell.go('ai', 0)">Continue →</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.intro { position: absolute; inset: 0; }
.title { position: absolute; inset: 0; background-size: cover; background-position: center; }
.veil { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(var(--c-ground2), .35), rgba(var(--c-ground2), .92)); }
.content { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .34em; text-transform: uppercase; color: rgb(var(--c-accent)); }
h1 { font: 600 clamp(36px, 5.6vw, 92px) / 1.02 'Space Grotesk', system-ui; letter-spacing: .04em; text-transform: uppercase; margin: 18px 0 12px; text-shadow: 0 0 40px rgba(var(--c-data), .35); max-width: 16ch; }
.sub { font: 400 clamp(17px, 1.7vw, 28px) 'Inter', system-ui; color: rgb(var(--c-soft)); }
.primary { margin-top: 36px; font: 600 max(clamp(16px, 1.25vw, 20px), var(--up-16, 16px)) 'Space Grotesk', system-ui; letter-spacing: .06em; padding: 16px 34px; border-radius: 999px; background: rgb(var(--c-data)); color: rgb(var(--c-ink)); box-shadow: 0 0 44px rgba(var(--c-data), .4); }
.primary:hover { background: rgb(var(--c-data-soft)); }
.primary.small { margin-top: 0; padding: 12px 24px; font-size: max(16px, var(--up-16, 16px)); }
.alt { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; justify-content: center; }
.ghost { font: 500 max(15px, var(--up-15, 15px)) 'Inter', system-ui; padding: 11px 20px; border-radius: 999px; border: 1px solid rgba(var(--c-text), .28); color: rgb(var(--c-text)); background: rgba(var(--c-ground2), .4); }
.ghost:hover { background: rgba(var(--c-text), .08); }
.hint { margin-top: 28px; font-size: 13px; color: rgb(var(--c-faint)); }
.handoff { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; text-align: center; pointer-events: none; }
.handoff p { font: 500 clamp(26px, 3vw, 52px) / 1.25 'Space Grotesk', system-ui; letter-spacing: .02em; }
.handoff p span { color: rgb(var(--c-data-soft)); font-weight: 400; font-size: .7em; }
.handoff-actions { display: flex; gap: 12px; pointer-events: auto; }
button:focus-visible, a:focus-visible { outline: 2px solid rgb(var(--c-data)); outline-offset: 2px; }
.handoff p.through { margin-top: 18px; max-width: 46ch; text-align: center; font: 500 clamp(17px, 1.4vw, 24px) / 1.4 'Inter', system-ui; color: rgb(var(--c-human)); }
</style>
