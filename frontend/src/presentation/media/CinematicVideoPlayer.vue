<script setup lang="ts">
/**
 * Full-screen player for a pre-rendered film: poster, captions (WebVTT), play/pause, scrubbing, volume, replay,
 * skip, and a fallback when playback fails. Volume and mute are props so the presentation settings stay global.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Captions, CaptionsOff, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-vue-next'

const props = defineProps<{ src: string; poster?: string; captionsSrc?: string; captions: boolean; muted: boolean; volume: number; autoplay?: boolean }>()
const emit = defineEmits<{ ended: []; skip: []; error: [message: string]; 'update:captions': [v: boolean]; 'update:muted': [v: boolean]; 'update:volume': [v: number] }>()

const video = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
const time = ref(0)
const duration = ref(0)
const failed = ref<string | null>(null)
const needsGesture = ref(false)
const controlsVisible = ref(true)
let hideTimer = 0
let endedSent = false
/** emit 'ended' once: on the real event, or when playback reaches the last 0.2 s (some decoders stall right at the end) */
function finish() { if (endedSent) return; endedSent = true; emit('ended') }

function applyCaptions() {
  const tr = video.value?.textTracks?.[0]
  if (tr) tr.mode = props.captions ? 'showing' : 'hidden'
}
async function play() {
  const v = video.value
  if (!v) return
  try {
    await v.play()
    needsGesture.value = false
  } catch {
    needsGesture.value = true // autoplay with sound blocked: wait for a click
  }
}
function pause() { video.value?.pause() }
function toggle() { if (playing.value) pause(); else void play() }
function restart() { if (video.value) { video.value.currentTime = 0; void play() } }
function seek(e: Event) { if (video.value) video.value.currentTime = +(e.target as HTMLInputElement).value }
function poke() {
  controlsVisible.value = true
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { if (playing.value) controlsVisible.value = false }, 2400)
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const pct = computed(() => (duration.value ? (time.value / duration.value) * 100 : 0))

watch(() => props.captions, applyCaptions)
watch(() => [props.muted, props.volume] as const, ([m, v]) => { if (video.value) { video.value.muted = m; video.value.volume = v } })

onMounted(() => {
  const v = video.value!
  v.muted = props.muted
  v.volume = props.volume
  v.addEventListener('play', () => { playing.value = true; poke() })
  v.addEventListener('pause', () => { playing.value = false; controlsVisible.value = true })
  v.addEventListener('timeupdate', () => {
    time.value = v.currentTime
    if (v.duration && v.currentTime >= v.duration - 0.2) finish()
    else if (v.currentTime < v.duration - 1) endedSent = false
  })
  v.addEventListener('loadedmetadata', () => { duration.value = v.duration; applyCaptions() })
  v.addEventListener('ended', finish)
  v.addEventListener('error', () => { failed.value = 'The film could not be played on this device.'; emit('error', failed.value) })
  if (props.autoplay) void play()
})
onBeforeUnmount(() => { window.clearTimeout(hideTimer); video.value?.pause() })

defineExpose({ video, play, pause, toggle, restart })
</script>

<template>
  <div class="player" :class="{ idle: !controlsVisible }" data-testid="cinematic-player" @mousemove="poke" @click.self="toggle">
    <video ref="video" class="v" :src="src" :poster="poster" preload="auto" playsinline crossorigin="anonymous" data-testid="intro-video" @click="toggle">
      <track v-if="captionsSrc" kind="captions" :src="captionsSrc" srclang="en" label="English" default />
    </video>

    <button v-if="needsGesture && !failed" class="big-play" aria-label="Play the film" @click="play"><Play class="ic-lg" /></button>

    <div v-if="failed" class="fail" role="alert">
      <p>{{ failed }}</p>
      <slot name="fallback" />
    </div>

    <div v-else class="bar" :class="{ hidden: !controlsVisible }">
      <input class="scrub" type="range" min="0" :max="duration || 1" step="0.1" :value="time" aria-label="Film position" @input="seek" />
      <div class="fill" :style="{ width: pct + '%' }" />
      <div class="row">
        <button class="ctl" :aria-label="playing ? 'Pause film' : 'Play film'" data-testid="video-toggle" @click="toggle"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
        <button class="ctl" aria-label="Replay film" @click="restart"><RotateCcw class="ic" /></button>
        <span class="time" data-testid="video-time">{{ fmt(time) }} / {{ fmt(duration) }}</span>
        <span class="grow" />
        <button v-if="captionsSrc" class="ctl" :aria-label="captions ? 'Hide captions' : 'Show captions'" @click="emit('update:captions', !captions)"><Captions v-if="captions" class="ic" /><CaptionsOff v-else class="ic" /></button>
        <button class="ctl" :aria-label="muted ? 'Unmute' : 'Mute'" @click="emit('update:muted', !muted)"><VolumeX v-if="muted" class="ic" /><Volume2 v-else class="ic" /></button>
        <input class="vol" type="range" min="0" max="1" step="0.05" :value="volume" aria-label="Film volume" @input="emit('update:volume', +($event.target as HTMLInputElement).value)" />
        <button class="skip" data-testid="video-skip" @click="emit('skip')">Skip intro <SkipForward class="ic" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player { position: absolute; inset: 0; background: #000; }
.player.idle { cursor: none; }
.v { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000; }
.v::cue { font-family: 'Inter', system-ui; font-size: 30px; background: rgba(var(--c-ground2), .6); color: rgb(var(--c-text)); }
.big-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 96px; height: 96px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: rgba(var(--c-data), .9); color: rgb(var(--c-ink)); box-shadow: 0 0 60px rgba(var(--c-data), .5); }
.ic-lg { width: 40px; height: 40px; margin-left: 4px; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 22px 16px; background: linear-gradient(transparent, rgba(0,0,0,.85)); transition: opacity .4s; }
.bar.hidden { opacity: 0; pointer-events: none; }
.scrub { width: 100%; accent-color: rgb(var(--c-data)); position: relative; z-index: 1; opacity: .9; }
.fill { display: none; }
.row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.grow { flex: 1; }
.ctl { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: rgb(var(--c-text)); }
.ctl:hover { background: rgba(var(--c-text), .1); }
.ic { width: 19px; height: 19px; }
.time { font: 500 13px 'JetBrains Mono', Consolas, monospace; color: rgb(var(--c-dim)); margin-left: 6px; }
.vol { width: 90px; accent-color: rgb(var(--c-data)); }
.skip { display: inline-flex; align-items: center; gap: 8px; margin-left: 10px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(var(--c-text), .3); font: 500 14px 'Inter', system-ui; color: rgb(var(--c-text)); }
.skip:hover { background: rgba(var(--c-text), .08); }
.fail { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(var(--c-ground2), .75); color: rgb(var(--c-human)); text-align: center; padding: 24px; }
button:focus-visible, input:focus-visible { outline: 2px solid rgb(var(--c-data)); outline-offset: 2px; }
</style>
