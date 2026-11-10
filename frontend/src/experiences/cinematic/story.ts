/**
 * Typed access to the shared story data (../../../../shared/story). Framework-agnostic: imported by the Vue film
 * and by the Remotion workspace, so scene timing and narration have exactly one source of truth.
 */
import storyboardJson from '../../../../shared/story/storyboard.json'
import narrationJson from '../../../../shared/story/narration.json'
import tokensJson from '../../../../shared/story/visual-tokens.json'
import irisJson from '../../../../shared/story/iris.json'

export type SetId = 'exterior' | 'lab' | 'digital' | 'journey' | 'landscape' | 'reveal'
export type Speaker = 'narrator' | 'noe' | 'salizar' | 'note'
export type TransitionType = 'continuous' | 'screen-dive' | 'flash-cut' | 'dissolve' | 'into-lab'

export interface ShotDef { id: string; start: number; end: number; move: string; lens: number; description: string }
export interface SceneDef {
  id: string; n: number; title: string; start: number; end: number; set: SetId; intent: string
  shots: ShotDef[]
  transition: { type: TransitionType; at?: number; duration?: number; description?: string }
  audio: { music: number; ambience: string; sfx: { t: number; cue: string }[] }
  pipeline?: string[]; stages?: string[]; loop?: string[]; concepts?: string[]
}
export interface Storyboard {
  id: string; title: string; subtitle: string; duration: number; fps: number; disclaimer: string
  titleCard: { start: number; end: number }
  scenes: SceneDef[]
}
export interface StoryCue { id: string; scene: string; speaker: Speaker; start: number; end: number; text: string; keywords: string[] }
export interface IrisData { source: string; features: string[]; classes: string[]; observations: number[][]; labels: number[] }

export const storyboard = storyboardJson as unknown as Storyboard
export const narration = (narrationJson as unknown as { cues: StoryCue[] }).cues
export const tokens = tokensJson as unknown as {
  color: Record<string, string>
  bloom: Record<SetId, number>
  type: Record<string, string | number>
}
export const iris = irisJson as unknown as IrisData

export const SPEAKER_NAME: Record<Speaker, string> = { narrator: '', noe: 'Noé', salizar: 'Dr. Salizar', note: 'Note' }

export function sceneAt(t: number, sb: Storyboard = storyboard): SceneDef {
  const s = sb.scenes
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return s[i]
  return s[0]
}

export function sceneIndexAt(t: number, sb: Storyboard = storyboard): number {
  return sb.scenes.indexOf(sceneAt(t, sb))
}

export function cueAt(t: number, cues: StoryCue[] = narration): StoryCue | null {
  for (const c of cues) if (t >= c.start && t < c.end) return c
  return null
}

/** Amount (0..1) of the full-screen transition overlay at time t, for screen dives / flash cuts / the final fade. */
export function transitionOverlayAt(t: number, sb: Storyboard = storyboard): { amount: number; type: TransitionType | null } {
  for (const s of sb.scenes) {
    const tr = s.transition
    if (tr.at === undefined || !tr.duration || tr.type === 'continuous' || tr.type === 'dissolve' || tr.type === 'into-lab') continue
    const half = tr.duration / 2
    const mid = tr.at + half
    const d = Math.abs(t - mid)
    if (d < half) return { amount: 1 - d / half, type: tr.type }
  }
  return { amount: 0, type: null }
}

/** Validates the shared story data; used by unit tests and in dev mode. Returns a list of problems (empty = OK). */
export function validateStory(sb: Storyboard = storyboard, cues: StoryCue[] = narration): string[] {
  const errs: string[] = []
  sb.scenes.forEach((s, i) => {
    if (i === 0 && s.start !== 0) errs.push('first scene must start at 0')
    if (i > 0 && Math.abs(s.start - sb.scenes[i - 1].end) > 1e-6) errs.push(`${s.id} does not start where ${sb.scenes[i - 1].id} ends`)
    if (s.end <= s.start) errs.push(`${s.id} has no duration`)
    s.shots.forEach((sh, j) => {
      if (sh.start < s.start - 1e-6 || sh.end > s.end + 1e-6) errs.push(`shot ${sh.id} is outside ${s.id}`)
      if (j > 0 && Math.abs(sh.start - s.shots[j - 1].end) > 1e-6) errs.push(`shot ${sh.id} is not contiguous`)
    })
  })
  const last = sb.scenes[sb.scenes.length - 1]
  if (last.end !== sb.duration) errs.push('last scene must end at duration')
  cues.forEach((c, i) => {
    const s = sb.scenes.find((x) => x.id === c.scene)
    if (!s) errs.push(`cue ${c.id} references unknown scene ${c.scene}`)
    else if (c.start < s.start || c.end > s.end) errs.push(`cue ${c.id} is outside its scene`)
    if (c.end <= c.start) errs.push(`cue ${c.id} has no duration`)
    if (i > 0 && c.start < cues[i - 1].end) errs.push(`cue ${c.id} overlaps ${cues[i - 1].id}`)
    const words = c.text.split(/\s+/).length
    if (words / (c.end - c.start) > 3.4) errs.push(`cue ${c.id} is too fast to read (${(words / (c.end - c.start)).toFixed(1)} words/s)`)
  })
  return errs
}
