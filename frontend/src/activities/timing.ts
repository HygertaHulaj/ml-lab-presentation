/**
 * Story timing as pure functions of the playhead t (seconds): which scene and caption line are showing and how far
 * through the scene we are. GSAP only moves t, so play, pause, scrub and jumping between scenes always agree.
 */
import type { Scene } from './types'

/** reading time for one caption line: a pause plus about 22 characters a second */
export const lineDuration = (line: string) => 1.6 + line.length * 0.045

export function sceneDurations(scenes: Scene[]): number[] {
  return scenes.map((s) => Math.max(3, s.lines.reduce((a, l) => a + lineDuration(l), 0)))
}

export function sceneStarts(scenes: Scene[]): number[] {
  const d = sceneDurations(scenes)
  const out: number[] = []
  let acc = 0
  for (const x of d) { out.push(acc); acc += x }
  return out
}

export const totalDuration = (scenes: Scene[]) => sceneDurations(scenes).reduce((a, b) => a + b, 0)

export interface Located { index: number; p: number; line: number; /** progress through the current line, 0..1 */ lp: number }

export function locate(scenes: Scene[], t: number): Located {
  if (!scenes.length) return { index: 0, p: 0, line: 0, lp: 0 }
  const d = sceneDurations(scenes)
  const total = d.reduce((a, b) => a + b, 0)
  let rest = Math.min(Math.max(0, t), total)
  let index = 0
  while (index < scenes.length - 1 && rest >= d[index]) { rest -= d[index]; index++ }
  const p = Math.min(1, rest / d[index])
  // which line: cumulative reading time inside the scene, stretched to the scene's duration
  const lines = scenes[index].lines
  const own = lines.map(lineDuration)
  const ownTotal = own.reduce((a, b) => a + b, 0) || 1
  let pos = p * ownTotal, line = 0
  while (line < lines.length - 1 && pos >= own[line]) { pos -= own[line]; line++ }
  return { index, p, line, lp: own.length ? Math.min(1, pos / own[line]) : 1 }
}

/** start time of a caption line (lines are stretched over their scene's duration, as in `locate`) */
export function lineStart(scenes: Scene[], index: number, line: number): number {
  const d = sceneDurations(scenes)
  const start = sceneStarts(scenes)[index] ?? 0
  const own = scenes[index]?.lines.map(lineDuration) ?? []
  const ownTotal = own.reduce((a, b) => a + b, 0) || 1
  const before = own.slice(0, Math.max(0, line)).reduce((a, b) => a + b, 0)
  return start + (before / ownTotal) * d[index]
}

/** numeric answer check, e.g. 0.68 typed for 0.6790 with tolerance 0.005 */
export function numericCorrect(typed: string, answer: number, tolerance = 0.005): boolean {
  const v = Number(typed.replace(',', '.').trim())
  return Number.isFinite(v) && Math.abs(v - answer) <= tolerance + 1e-12
}
