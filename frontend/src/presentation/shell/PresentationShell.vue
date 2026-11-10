<script setup lang="ts">
import { SHOW_EXTRA_PAGES } from '../../features'
/**
 * The one global presentation shell. Owns: the ambient data field, a transition overlay canvas, section routing,
 * step navigation, keyboard control, progress, the section index, settings, and auto-hiding chrome.
 * Keys: → / Space / PageDown next · ← / PageUp previous · Home first step · I index · F full screen · M mute · Esc close
 */
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ChevronLeft, ChevronRight, Expand, LayoutList, Volume2, VolumeX, Accessibility, X, Sun, Moon } from 'lucide-vue-next'
import { themeVars } from '../theme'
import { usePresentation } from '../store'
import { CORE_MINUTES, SECTIONS, THROUGH_LINE, sectionById } from '../sections'
import { FieldRenderer } from '../../visualizations/shared/ParticleField'
import { SHELL, type Embed, type ShellApi } from './shellApi'
import EmbedLayer from './EmbedLayer.vue'
import { toggleFullscreen } from '../../engine/InteractionController'

const store = usePresentation()
const route = useRoute()
const router = useRouter()
const root = ref<HTMLElement | null>(null)
const fieldCanvas = ref<HTMLCanvasElement | null>(null)
const overlayCanvas = ref<HTMLCanvasElement | null>(null)
const immersive = ref(false)
const embed = ref<Embed | null>(null)
const chromeVisible = ref(true)
const field = { alpha: 0 }
let renderer: FieldRenderer | null = null
let raf = 0
let hideTimer = 0
const keyHandlers: ((e: KeyboardEvent) => boolean)[] = []

// ------------------------------------------------------------------ routing <-> store
function sync() {
  const id = route.meta.sectionId as string | undefined
  if (!id) return
  const q = Number(route.query.step)
  store.enter(id, Number.isFinite(q) ? q : undefined)
}
watch(() => route.fullPath, sync, { immediate: true })
watch(() => [store.section, store.step] as const, ([id, s]) => {
  if (route.meta.sectionId === id && Number(route.query.step ?? 0) !== s) void router.replace({ query: { ...route.query, step: String(s) } })
})

function go(section: string, step = 0) {
  const def = sectionById(section)
  if (!def) return
  store.setStep(section, step)
  void router.push({ path: `/presentation/${def.path}`, query: { step: String(step) } })
}
function next() { const t = store.next(); if (t) go(t.section, t.step); poke() }
function prev() { const t = store.prev(); if (t) go(t.section, t.step); poke() }

const api: ShellApi = {
  setFieldAlpha(a, seconds = 1.2) { gsap.to(field, { alpha: a, duration: store.reducedMotion ? 0 : seconds, ease: 'sine.inOut', overwrite: true }) },
  overlayCanvas,
  immersive,
  next,
  prev,
  go,
  openEmbed(e) { embed.value = e },
  embed,
  onKey(fn) { keyHandlers.unshift(fn); return () => { const i = keyHandlers.indexOf(fn); if (i >= 0) keyHandlers.splice(i, 1) } },
}
provide(SHELL, api)

// ------------------------------------------------------------------ keyboard + chrome
function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  // keys stay with text-entry fields only; checkboxes, radios, sliders and buttons keep presenter navigation working
  const typing = el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
    (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit'].includes((el as HTMLInputElement).type)))
  if (typing) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (embed.value) return // embedded content owns every key (Esc closes it there)
  poke()
  for (const h of keyHandlers) if (h(e)) { e.preventDefault(); return }
  const k = e.key
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); next() }
  else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev() }
  else if (k === 'Home') { e.preventDefault(); store.setStep(store.section, 0) }
  else if (k.toLowerCase() === 'i') store.indexOpen = !store.indexOpen
  else if (k.toLowerCase() === 'f') void toggleFullscreen(root.value)
  else if (k.toLowerCase() === 'm') store.muted = !store.muted
  else if (k.toLowerCase() === 'l') store.theme = store.theme === 'light' ? 'warm' : 'light'
  else if (k === 'Escape') store.indexOpen = false
}
function poke() {
  chromeVisible.value = true
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { if (!store.indexOpen) chromeVisible.value = false }, 3000)
}

// ------------------------------------------------------------------ ambient field loop
function loop(now: number) {
  raf = requestAnimationFrame(loop)
  renderer?.draw(now / 1000, field.alpha, store.reducedMotion)
}

onMounted(() => {
  if (fieldCanvas.value) renderer = new FieldRenderer(fieldCanvas.value)
  raf = requestAnimationFrame(loop)
  window.addEventListener('keydown', onKey)
  poke()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(hideTimer)
  gsap.killTweensOf(field)
})

const current = computed(() => store.current)
const progress = computed(() => SECTIONS.map((s, i) => ({ s, done: i < store.position, active: i === store.position, frac: i === store.position ? (store.step + 1) / s.steps.length : i < store.position ? 1 : 0 })))
const atEnd = computed(() => store.position === SECTIONS.length - 1 && store.step === current.value.steps.length - 1)
const atStart = computed(() => store.position === 0 && store.step === 0)
const vars = computed(() => themeVars(store.theme, store.section))
const transitionName = computed(() => (store.reducedMotion ? 'cut' : 'fade-section'))
</script>

<template>
  <div ref="root" class="pres-root" :class="{ 'chrome-hidden': !chromeVisible || immersive, reduced: store.reducedMotion, light: store.theme === 'light' }" :style="vars" :data-theme="store.theme" data-testid="presentation" @mousemove="poke">
    <canvas ref="fieldCanvas" class="field" aria-hidden="true" />

    <main class="stage" :aria-label="current.title">
      <RouterView v-slot="{ Component }">
        <Transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="current.id" />
        </Transition>
      </RouterView>
    </main>

    <canvas ref="overlayCanvas" class="overlay" aria-hidden="true" />
    <EmbedLayer v-if="embed" :embed="embed" @close="embed = null" />

    <!-- chrome: progress + section label -->
    <header v-show="!immersive" class="top">
      <button class="sec-label" data-testid="section-label" :aria-label="'Section index (I). Current: ' + current.title" @click="store.indexOpen = true">
        <span class="n">{{ String(current.n).padStart(2, '0') }}</span>{{ current.short }}
        <span class="step">{{ current.steps[store.step] }}</span>
      </button>
      <div class="progress" role="progressbar" :aria-valuenow="store.position + 1" aria-valuemin="1" :aria-valuemax="SECTIONS.length" data-testid="progress">
        <button v-for="p in progress" :key="p.s.id" class="seg" :class="{ active: p.active }" :title="p.s.n + '. ' + p.s.title" :aria-label="'Go to ' + p.s.title" @click="go(p.s.id)">
          <span :style="{ width: p.frac * 100 + '%' }" />
        </button>
      </div>
    </header>

    <!-- chrome: controls -->
    <nav v-show="!immersive" class="controls" aria-label="Presentation controls">
      <button class="ctl" :disabled="atStart" aria-label="Previous (←)" data-testid="pres-prev" @click="prev"><ChevronLeft class="ic" /></button>
      <button class="ctl main" :disabled="atEnd" aria-label="Next (→)" data-testid="pres-next" @click="next"><ChevronRight class="ic" /></button>
      <span class="sep" />
      <button class="ctl" :aria-label="store.muted ? 'Unmute (M)' : 'Mute (M)'" data-testid="pres-mute" @click="store.muted = !store.muted"><VolumeX v-if="store.muted" class="ic" /><Volume2 v-else class="ic" /></button>
      <input v-model.number="store.volume" class="vol" type="range" min="0" max="1" step="0.05" aria-label="Volume" />
      <button class="ctl" :class="{ on: store.reducedMotion }" :aria-pressed="store.reducedMotion" aria-label="Reduced motion" data-testid="pres-reduced" @click="store.reducedMotionSetting = !store.reducedMotion"><Accessibility class="ic" /></button>
      <button class="ctl" aria-label="Section index (I)" data-testid="pres-index" @click="store.indexOpen = true"><LayoutList class="ic" /></button>
      <button class="ctl" :aria-label="store.theme === 'light' ? 'Dark theme (L)' : 'Light theme for bright rooms (L)'" data-testid="pres-theme" @click="store.theme = store.theme === 'light' ? 'warm' : 'light'"><Moon v-if="store.theme === 'light'" class="ic" /><Sun v-else class="ic" /></button>
      <button class="ctl" aria-label="Full screen (F)" @click="toggleFullscreen(root)"><Expand class="ic" /></button>
    </nav>

    <!-- section index -->
    <Transition name="fade-section">
      <div v-if="store.indexOpen" class="index" role="dialog" aria-modal="true" aria-labelledby="idx-title" data-testid="section-index" @click.self="store.indexOpen = false">
        <div class="index-card">
          <div class="index-head">
            <div><h2 id="idx-title">Machine Learning · Chapter 8</h2><p class="plan">{{ THROUGH_LINE }} · core route {{ CORE_MINUTES }} min (planned, to rehearse)</p></div>
            <button class="ctl" aria-label="Close index (Esc)" @click="store.indexOpen = false"><X class="ic" /></button>
          </div>
          <ol>
            <li v-for="s in SECTIONS" :key="s.id" :class="{ active: s.id === store.section }">
              <button @click="go(s.id); store.indexOpen = false">
                <span class="n">{{ String(s.n).padStart(2, '0') }}</span>
                <span class="t">{{ s.title }}<small>{{ s.source }}</small></span>
                <span v-if="s.track === 'appendix'" class="badge app">appendix</span>
                <span v-else class="mins">{{ s.minutes }} min</span>
                <span v-if="s.status === 'in-development'" class="badge">in development</span>
                <span v-else-if="store.visited.includes(s.id)" class="badge seen">visited</span>
              </button>
            </li>
          </ol>
          <p class="keys">→ next · ← back · I index · F full screen · M mute · reduced motion: <button class="link" @click="store.reducedMotionSetting = !store.reducedMotion">{{ store.reducedMotion ? 'on' : 'off' }}</button></p>
          <RouterLink v-if="SHOW_EXTRA_PAGES" class="link" to="/">Open the classic ML Lab ↗</RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* The grey source lines (.src) are hidden in the whole presentation (presenter's choice, 10 Nov 2026). Their text stays in
   the components: delete this rule to show them again. A line marked .keep (a key that explains a picture) stays visible. */
.pres-root .src:not(.keep) { display: none !important; }
</style>

<style scoped>
/* reading sizes (audit §5): --up-A grows from A px at 1366 px wide to 22 px at 1920 px wide; sections use max(their size, var(--up-A)) */
.pres-root { --up-10: min(calc(10px + 12 * (100vw - 1366px) / 554), 26px); --up-11: min(calc(11px + 11 * (100vw - 1366px) / 554), 26px); --up-12: min(calc(12px + 10 * (100vw - 1366px) / 554), 26px); --up-13: min(calc(13px + 9 * (100vw - 1366px) / 554), 26px); --up-14: min(calc(14px + 8 * (100vw - 1366px) / 554), 26px); --up-15: min(calc(15px + 7 * (100vw - 1366px) / 554), 26px); --up-16: min(calc(16px + 6 * (100vw - 1366px) / 554), 26px); --up-17: min(calc(17px + 5 * (100vw - 1366px) / 554), 26px); --up-18: min(calc(18px + 4 * (100vw - 1366px) / 554), 26px); --up-19: min(calc(19px + 3 * (100vw - 1366px) / 554), 26px); --up-20: min(calc(20px + 2 * (100vw - 1366px) / 554), 26px); --up-21: min(calc(21px + 1 * (100vw - 1366px) / 554), 26px); }
.pres-root { position: fixed; inset: 0; overflow: hidden; background: radial-gradient(ellipse at 50% 38%, rgba(var(--c-accent), .10) 0%, rgb(var(--c-ground)) 48%, rgb(var(--c-ground2)) 100%); background-color: rgb(var(--c-ground)); transition: background .8s; color: rgb(var(--c-text)); font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.field, .overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.overlay { z-index: 30; }
.stage { position: absolute; inset: 0; z-index: 10; }
.top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 24px; padding: 18px 28px; transition: opacity .5s, transform .5s; }
.sec-label { display: flex; align-items: baseline; gap: 12px; font: 500 14px 'Space Grotesk', system-ui; letter-spacing: .16em; text-transform: uppercase; color: rgb(var(--c-soft)); white-space: nowrap; }
.sec-label .n { color: rgb(var(--c-accent)); }
.sec-label .step { color: rgb(var(--c-faint)); letter-spacing: .08em; text-transform: none; font-family: 'Inter', system-ui; }
.progress { flex: 1; display: flex; gap: 6px; max-width: 520px; margin-left: auto; }
.seg { flex: 1; height: 14px; position: relative; }
.seg::before, .seg span { content: ''; position: absolute; left: 0; top: 6px; height: 2px; border-radius: 2px; }
.seg::before { right: 0; background: rgba(var(--c-text), .14); }
.seg span { background: rgb(var(--c-accent)); transition: width .4s, background .6s; }
.controls { position: absolute; right: 24px; bottom: 22px; z-index: 20; display: flex; align-items: center; gap: 4px; padding: 6px; border-radius: 14px; background: rgba(var(--c-surface), .6); border: 1px solid rgba(var(--c-data), .14); backdrop-filter: blur(10px); transition: opacity .5s, transform .5s; }
.chrome-hidden .top, .chrome-hidden .controls { opacity: 0; transform: translateY(6px); pointer-events: none; }
.ctl { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; color: rgb(var(--c-soft)); }
.ctl:hover:not(:disabled) { background: rgba(var(--c-text), .08); }
.ctl:disabled { opacity: .35; }
.ctl.main { background: rgba(var(--c-accent), .2); }
.ctl.on { color: rgb(var(--c-human)); }
.ic { width: 19px; height: 19px; }
.sep { width: 1px; height: 22px; background: rgba(var(--c-text), .12); margin: 0 4px; }
.vol { width: 76px; accent-color: rgb(var(--c-data)); }
.index { position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: rgba(var(--c-ground2), .72); backdrop-filter: blur(6px); }
.index-card { width: min(760px, 92vw); max-height: 88vh; overflow: auto; padding: 28px; border-radius: 20px; background: rgba(var(--c-surface), .95); border: 1px solid rgba(var(--c-data), .2); }
.index-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.index-head h2 { font: 600 22px 'Space Grotesk', system-ui; letter-spacing: .06em; }
.index ol { list-style: none; padding: 0; margin: 0; }
.index li button { width: 100%; display: flex; align-items: center; gap: 16px; text-align: left; padding: 12px 14px; border-radius: 12px; }
.index li button:hover { background: rgba(var(--c-text), .05); }
.index li.active button { background: rgba(var(--c-data), .1); }
.index .n { font: 600 16px 'Space Grotesk'; color: rgb(var(--c-data)); width: 28px; }
.index .t { flex: 1; font: 500 17px 'Space Grotesk', system-ui; }
.index small { display: block; font: 400 12px 'Inter', system-ui; color: rgb(var(--c-faint)); margin-top: 2px; }
.badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; border: 1px solid rgba(var(--c-human), .5); color: rgb(var(--c-human)); white-space: nowrap; }
.badge.seen { border-color: rgba(var(--c-ok), .45); color: rgb(var(--c-ok)); }
.plan { margin-top: 4px; font-size: 13px; color: rgb(var(--c-soft)); }
.mins { font-size: 12px; color: rgb(var(--c-dim)); white-space: nowrap; font-variant-numeric: tabular-nums; }
.badge.app { border-color: rgba(var(--c-data), .5); color: rgb(var(--c-data)); }
.keys { margin-top: 16px; font-size: 13px; color: rgb(var(--c-faint)); }
.link { color: rgb(var(--c-data)); text-decoration: underline; text-underline-offset: 3px; font-size: 13px; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid rgb(var(--c-data)); outline-offset: 2px; }
.fade-section-enter-active, .fade-section-leave-active { transition: opacity .6s ease, filter .6s ease; }
.fade-section-enter-from, .fade-section-leave-to { opacity: 0; filter: blur(6px); }
.cut-enter-active, .cut-leave-active { transition: none; }
@media (max-width: 720px) { .top { padding: 12px 14px; gap: 12px; } .sec-label .step, .vol { display: none; } .controls { right: 10px; bottom: 10px; } }
</style>
