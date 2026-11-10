import { clamp } from './easing'
import type { SceneSpan, TimelineStep } from './types'

/** Scene lookup and title-card fades, all derived from timeline position. */
export class SceneTransitionManager {
  constructor(private scenes: SceneSpan[], private fadeSeconds = 0.6) {}

  sceneAt(t: number): SceneSpan {
    return this.scenes.find((s) => t >= s.start && t < s.end) ?? this.scenes[this.scenes.length - 1]
  }

  indexAt(t: number): number {
    return this.scenes.indexOf(this.sceneAt(t))
  }

  /** Opacity of the scene title card: visible during the first ~2 s of each scene. */
  titleOpacity(t: number): number {
    const s = this.sceneAt(t)
    const local = t - s.start
    if (local < 0) return 0
    if (local < this.fadeSeconds) return clamp(local / this.fadeSeconds)
    if (local < 2.2) return 1
    return clamp(1 - (local - 2.2) / this.fadeSeconds)
  }

  /** Vignette strength around a scene cut (0 = none, 1 = strongest), so cuts never feel abrupt. */
  cutFade(t: number): number {
    let best = 0
    for (const s of this.scenes.slice(1)) best = Math.max(best, clamp(1 - Math.abs(t - s.start) / this.fadeSeconds))
    return best
  }
}

/** Sorted, de-duplicated step start times — the "stops" for next/previous navigation. */
export function stepBoundaries(steps: TimelineStep[], duration: number): number[] {
  const set = new Set<number>([0, ...steps.map((s) => +s.start.toFixed(4)), +duration.toFixed(4)])
  return [...set].sort((a, b) => a - b)
}

export function stepAt<S extends TimelineStep>(steps: S[], t: number): S | null {
  let found: S | null = null
  for (const s of steps) if (t >= s.start && t < s.start + s.duration) found = s
  if (!found && steps.length && t >= steps[steps.length - 1].start) found = steps[steps.length - 1]
  return found
}
