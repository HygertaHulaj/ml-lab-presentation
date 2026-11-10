/**
 * What the shared cinematic-lesson shell needs from a lesson's store. The K-Means store (stores/lesson.ts) and the
 * gradient-descent store (stores/linregLesson.ts) both satisfy it; the shell never knows which algorithm it plays.
 */
import type { ActiveCue } from '../../engine/NarrationSynchronizer'
import type { LessonMode, LessonTimeline, SceneSpan, TimelineStep } from '../../engine/types'

export interface ShellStore {
  manifest: { title: string; summary: string } | null
  timeline: LessonTimeline | null
  scenes: { titleOpacity(t: number): number; cutFade(t: number): number } | null
  narration: { speak(t: number, enabled: boolean, rate?: number): void; stopSpeech(): void } | null
  scene: SceneSpan | null
  step: TimelineStep | null
  cue: ActiveCue | null
  mode: LessonMode
  presenter: boolean
  voice: boolean
  position: number
  playing: boolean
  rate: number
  duration: number
  loading: boolean
  error: string | null
  controller: { play(): void; pause(): void; toggle(): void; seek(t: number): void; next(): void; prev(): void; setRate(r: number): void }
  setMode(m: LessonMode): void
  seekScene(id: string): void
  restartScene(): void
  saveProgress(): void
}
