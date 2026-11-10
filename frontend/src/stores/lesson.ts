/**
 * SimulationStateManager — the single source of lesson state shared by Story, Lab and Math modes.
 * The playhead lives in LessonTimelineController; this store mirrors it reactively and owns trace/config/mode.
 */
import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { errorMessage } from '../api/client'
import { learnerId, lessonsApi, type IrisDataset } from '../api/lessons'
import { LessonTimelineController } from '../engine/LessonTimelineController'
import { NarrationSynchronizer } from '../engine/NarrationSynchronizer'
import { SceneTransitionManager, stepAt, stepBoundaries } from '../engine/SceneTransitionManager'
import type { LessonMode } from '../engine/types'
import { buildTimeline, type KTimeline } from '../lessons/kmeans-iris/timeline'
import type { KMeansConfig, LessonManifest, Simulation } from '../lessons/kmeans-iris/types'

export const useLessonStore = defineStore('lesson', () => {
  const manifest = shallowRef<LessonManifest | null>(null)
  const dataset = shallowRef<IrisDataset | null>(null)
  const simulation = shallowRef<Simulation | null>(null)
  const timeline = shallowRef<KTimeline | null>(null)
  const scenes = shallowRef<SceneTransitionManager | null>(null)
  const narration = shallowRef<NarrationSynchronizer | null>(null)
  const config = ref<KMeansConfig>({ dataset: 'iris', features: ['sepal_length_cm', 'sepal_width_cm'], k: 3, init: 'k-means++', seed: 7, max_iter: 50, tol: 1e-6, standardize: false })
  const mode = ref<LessonMode>('story')
  const presenter = ref(false)
  const voice = ref(false)
  const position = ref(0)
  const playing = ref(false)
  const rate = ref(1)
  const selectedPoint = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const completed = ref<string[]>([])
  const controller = markRaw(new LessonTimelineController(1))
  controller.subscribe((s) => {
    position.value = s.t
    playing.value = s.playing
    rate.value = s.rate
  })

  const duration = computed(() => timeline.value?.duration ?? 1)
  const scene = computed(() => scenes.value?.sceneAt(position.value) ?? null)
  const step = computed(() => (timeline.value ? stepAt(timeline.value.steps, position.value) : null))
  const cue = computed(() => narration.value?.cueAt(position.value) ?? null)

  function install(sim: Simulation, keepScene?: string) {
    if (!manifest.value) return
    const tl = buildTimeline(sim.trace, manifest.value)
    simulation.value = sim
    timeline.value = markRaw(tl)
    scenes.value = markRaw(new SceneTransitionManager(tl.scenes))
    narration.value = markRaw(new NarrationSynchronizer(tl.cues))
    controller.pause()
    controller.setDuration(tl.duration, stepBoundaries(tl.steps, tl.duration))
    const s = keepScene ? tl.scenes.find((x) => x.id === keepScene) : null
    controller.seek(s ? s.start : 0)
  }

  async function load(lessonId = 'kmeans-iris') {
    loading.value = true
    error.value = null
    try {
      const [m, ds] = await Promise.all([lessonsApi.lesson(lessonId), lessonsApi.iris()])
      manifest.value = markRaw(m)
      dataset.value = markRaw(ds)
      config.value = { ...config.value, ...m.default_config }
      install(await lessonsApi.kmeans(config.value))
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  /** Re-run K-Means with new parameters (backend computes; results cached by config). */
  async function rerun(patch: Partial<KMeansConfig>, jumpTo = 'init') {
    loading.value = true
    error.value = null
    try {
      config.value = { ...config.value, ...patch }
      install(await lessonsApi.kmeans(config.value), jumpTo)
      selectedPoint.value = null
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  function setMode(m: LessonMode) {
    mode.value = m
    if (m === 'lab') controller.pause()
  }

  function seekScene(id: string) {
    const s = timeline.value?.scenes.find((x) => x.id === id)
    if (s) controller.seek(s.start)
  }

  function restartScene() {
    if (scene.value) controller.seek(scene.value.start)
  }

  let lastSaved = ''
  async function saveProgress() {
    if (!scene.value || !manifest.value) return
    const sig = `${scene.value.id}:${mode.value}`
    if (sig === lastSaved) return
    lastSaved = sig
    if (!completed.value.includes(scene.value.id) && scenes.value) {
      const idx = scenes.value.indexAt(position.value)
      completed.value = timeline.value!.scenes.slice(0, idx).map((s) => s.id)
    }
    try {
      await lessonsApi.progress({ learner_id: learnerId(), lesson_id: manifest.value.id, scene_id: scene.value.id, position: position.value,
        mode: mode.value, completed_scenes: completed.value, simulation_id: simulation.value?.id })
    } catch {
      /* progress is best-effort; never interrupt the lesson */
    }
  }

  return { manifest, dataset, simulation, timeline, scenes, narration, config, mode, presenter, voice, position, playing, rate,
    selectedPoint, loading, error, duration, scene, step, cue, controller, load, rerun, setMode, seekScene, restartScene, saveProgress }
})
