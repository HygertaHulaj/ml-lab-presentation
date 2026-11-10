/** Shared types for the Cinematic Algorithm Experience Engine (algorithm-agnostic). */

export type Vec3 = [number, number, number]
export type LessonMode = 'story' | 'lab' | 'math'

/** One timed event on the lesson timeline. `kind` and payload are lesson-specific. */
export interface TimelineStep<K extends string = string, P = unknown> {
  id: string
  kind: K
  sceneId: string
  start: number
  duration: number
  label: string
  payload: P
}

export interface SceneSpan {
  id: string
  title: string
  start: number
  end: number
}

export interface NarrationCue {
  start: number
  end: number
  text: string
  /** words to highlight (case-insensitive) */
  keywords?: string[]
}

export interface CameraPose {
  position: Vec3
  target: Vec3
  fov: number
}

export interface CameraKey extends CameraPose {
  t: number
}

/** Marker drawn on the timeline (e.g. each iteration start). */
export interface TimelineMarker {
  t: number
  label: string
}

/** Everything a lesson builds from a trace; the engine plays it without knowing the algorithm. */
export interface LessonTimeline<S extends TimelineStep = TimelineStep> {
  steps: S[]
  scenes: SceneSpan[]
  cues: NarrationCue[]
  cameraKeys: CameraKey[]
  markers: TimelineMarker[]
  duration: number
}
