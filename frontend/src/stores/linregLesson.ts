/**
 * State of the Shah Ch. 8 regression / gradient-descent lessons, shared by Story, Lab and Math (same shape as the
 * K-Means store, so the shared lesson shell can play it). The playhead lives in LessonTimelineController.
 */
import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { errorMessage, http } from '../api/client'
import { learnerId, lessonsApi } from '../api/lessons'
import { LessonTimelineController } from '../engine/LessonTimelineController'
import { NarrationSynchronizer } from '../engine/NarrationSynchronizer'
import { SceneTransitionManager, stepAt, stepBoundaries } from '../engine/SceneTransitionManager'
import type { LessonMode } from '../engine/types'
import { buildTimeline, type GdTimeline } from '../lessons/linreg-gd/timeline'
import type { GdManifest, LinRegConfig, LinRegTrace } from '../lessons/linreg-gd/types'

export const runLinRegGd = (cfg: LinRegConfig) =>
  http.post<{ algorithm: string; config: LinRegConfig; trace: LinRegTrace }>('/simulations/linreg-gd', cfg).then((r) => r.data)

export const useLinregLessonStore = defineStore('linregLesson', () => {
  const manifest = shallowRef<GdManifest | null>(null)
  const traces = shallowRef<LinRegTrace[]>([])
  const configs = ref<LinRegConfig[]>([])
  const timeline = shallowRef<GdTimeline | null>(null)
  const scenes = shallowRef<SceneTransitionManager | null>(null)
  const narration = shallowRef<NarrationSynchronizer | null>(null)
  const mode = ref<LessonMode>('story')
  const presenter = ref(false)
  const voice = ref(false)
  const position = ref(0)
  const playing = ref(false)
  const rate = ref(1)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const controller = markRaw(new LessonTimelineController(1))
  controller.subscribe((s) => { position.value = s.t; playing.value = s.playing; rate.value = s.rate })

  const duration = computed(() => timeline.value?.duration ?? 1)
  const scene = computed(() => scenes.value?.sceneAt(position.value) ?? null)
  const step = computed(() => (timeline.value ? stepAt(timeline.value.steps, position.value) : null))
  const cue = computed(() => narration.value?.cueAt(position.value) ?? null)

  function install(trs: LinRegTrace[], keepScene?: string) {
    if (!manifest.value) return
    const tl = buildTimeline(manifest.value, trs)
    traces.value = markRaw(trs)
    timeline.value = markRaw(tl)
    scenes.value = markRaw(new SceneTransitionManager(tl.scenes))
    narration.value = markRaw(new NarrationSynchronizer(tl.cues))
    controller.pause()
    controller.setDuration(tl.duration, stepBoundaries(tl.steps, tl.duration))
    const s = keepScene ? tl.scenes.find((x) => x.id === keepScene) : null
    controller.seek(s ? s.start : 0)
  }

  async function load(lessonId: string) {
    loading.value = true
    error.value = null
    try {
      const m = (await lessonsApi.lesson(lessonId)) as unknown as GdManifest
      manifest.value = markRaw(m)
      configs.value = m.parts.map((p) => ({ ...p.config }))
      install(await Promise.all(configs.value.map((c) => runLinRegGd(c).then((r) => r.trace))))
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  /** Re-run one part with a new learning rate / iteration count (the backend computes; cached by config). */
  async function rerun(part: number, patch: Partial<LinRegConfig>, jumpTo?: string) {
    loading.value = true
    error.value = null
    try {
      configs.value = configs.value.map((c, i) => (i === part ? { ...c, ...patch } : c))
      const tr = (await runLinRegGd(configs.value[part])).trace
      install(traces.value.map((t, i) => (i === part ? tr : t)), jumpTo ?? `${manifest.value!.parts[part].id}-descend`)
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  function setMode(m: LessonMode) { mode.value = m; if (m === 'lab') controller.pause() }
  function seekScene(id: string) { const s = timeline.value?.scenes.find((x) => x.id === id); if (s) controller.seek(s.start) }
  function restartScene() { if (scene.value) controller.seek(scene.value.start) }

  let lastSaved = ''
  async function saveProgress() {
    if (!scene.value || !manifest.value) return
    const sig = `${scene.value.id}:${mode.value}`
    if (sig === lastSaved) return
    lastSaved = sig
    const idx = scenes.value?.indexAt(position.value) ?? 0
    try {
      await lessonsApi.progress({ learner_id: learnerId(), lesson_id: manifest.value.id, scene_id: scene.value.id, position: position.value,
        mode: mode.value, completed_scenes: timeline.value!.scenes.slice(0, idx).map((s) => s.id) })
    } catch { /* best-effort */ }
  }

  return { manifest, traces, configs, timeline, scenes, narration, mode, presenter, voice, position, playing, rate, loading, error, controller,
    duration, scene, step, cue, load, rerun, setMode, seekScene, restartScene, saveProgress }
})
