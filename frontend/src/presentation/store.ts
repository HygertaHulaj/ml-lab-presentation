/**
 * Presentation state shared by the shell and every section: where we are (section + step), and the viewer's
 * settings (reduced motion, sound, captions). Persisted per viewer in localStorage as a convenience.
 */
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { SECTIONS, sectionById, sectionIndex } from './sections'
import type { ThemeName } from './theme'

const KEY = 'mllab.presentation.v1'
interface Saved { section?: string; steps?: Record<string, number>; muted?: boolean; volume?: number; captions?: boolean; reducedMotion?: boolean | null; visited?: string[]; theme?: ThemeName; movie?: string | null; moviePrediction?: string | null }

function load(): Saved {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved } catch { return {} }
}

export const usePresentation = defineStore('presentation', () => {
  const saved = load()
  const section = ref<string>(saved.section && sectionById(saved.section) ? saved.section : 'intro')
  const steps = ref<Record<string, number>>(saved.steps ?? {})
  const muted = ref(saved.muted ?? false)
  const volume = ref(saved.volume ?? 0.8)
  const captions = ref(saved.captions ?? true)
  /** null = follow the operating system setting */
  const reducedMotionSetting = ref<boolean | null>(saved.reducedMotion ?? null)
  const osReduced = ref(typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const visited = ref<string[]>(saved.visited ?? [])
  /** 'warm' = Warm Lab (default), 'light' = Lecture Hall Light for bright rooms (key L) */
  const theme = ref<ThemeName>(saved.theme === 'light' ? 'light' : 'warm')
  const indexOpen = ref(false)
  /** the movie the class follows from the worked example into Section 8.4 (its title in the dataset) */
  const movie = ref<string | null>(saved.movie ?? null)
  /** the audience's prediction in the worked example, recalled at the evidence step */
  const moviePrediction = ref<string | null>(saved.moviePrediction ?? null)

  const reducedMotion = computed(() => reducedMotionSetting.value ?? osReduced.value)
  const current = computed(() => sectionById(section.value) ?? SECTIONS[0])
  const step = computed(() => Math.min(steps.value[section.value] ?? 0, current.value.steps.length - 1))
  const position = computed(() => sectionIndex(section.value))

  function stepOf(id: string) { return steps.value[id] ?? 0 }
  function setStep(id: string, s: number) {
    const def = sectionById(id)
    if (!def) return
    steps.value = { ...steps.value, [id]: Math.max(0, Math.min(def.steps.length - 1, s)) }
  }
  function enter(id: string, s?: number) {
    if (!sectionById(id)) return
    section.value = id
    if (s !== undefined) setStep(id, s)
    if (!visited.value.includes(id)) visited.value = [...visited.value, id]
  }
  /** Returns the section to navigate to when the step moves past the end/start, else null. */
  function next(): { section: string; step: number } | null {
    const def = current.value
    if (step.value < def.steps.length - 1) { setStep(def.id, step.value + 1); return null }
    const n = SECTIONS[position.value + 1]
    return n ? { section: n.id, step: 0 } : null
  }
  function prev(): { section: string; step: number } | null {
    if (step.value > 0) { setStep(section.value, step.value - 1); return null }
    const p = SECTIONS[position.value - 1]
    return p ? { section: p.id, step: p.steps.length - 1 } : null
  }

  watch([section, steps, muted, volume, captions, reducedMotionSetting, visited, theme, movie, moviePrediction], () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ section: section.value, steps: steps.value, muted: muted.value, volume: volume.value, captions: captions.value, reducedMotion: reducedMotionSetting.value, visited: visited.value, theme: theme.value, movie: movie.value, moviePrediction: moviePrediction.value }))
    } catch { /* storage unavailable: settings last for this visit only */ }
  }, { deep: true })

  return { section, steps, muted, volume, captions, reducedMotionSetting, reducedMotion, visited, theme, indexOpen, movie, moviePrediction, current, step, position, stepOf, setStep, enter, next, prev }
})
