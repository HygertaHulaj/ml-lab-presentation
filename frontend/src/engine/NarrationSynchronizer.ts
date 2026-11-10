import { clamp } from './easing'
import type { NarrationCue } from './types'

export interface ActiveCue {
  index: number
  cue: NarrationCue
  words: { text: string; spoken: boolean; keyword: boolean }[]
}

/**
 * Subtitles derived from timeline position (pure), plus optional speech through the Web Speech API.
 * Words are revealed proportionally to the cue's progress, giving karaoke-style highlighting that stays
 * correct when the learner scrubs.
 */
export class NarrationSynchronizer {
  private cues: NarrationCue[]
  private lastSpoken = -1

  constructor(cues: NarrationCue[]) {
    this.cues = [...cues].sort((a, b) => a.start - b.start)
  }

  indexAt(t: number): number {
    for (let i = this.cues.length - 1; i >= 0; i--) if (t >= this.cues[i].start && t < this.cues[i].end) return i
    return -1
  }

  cueAt(t: number): ActiveCue | null {
    const i = this.indexAt(t)
    if (i < 0) return null
    const cue = this.cues[i]
    const tokens = cue.text.split(/\s+/).filter(Boolean)
    // finish revealing at 85% of the cue so the last words are readable before it ends
    const p = clamp((t - cue.start) / ((cue.end - cue.start) * 0.85))
    const spokenCount = Math.ceil(p * tokens.length)
    const kws = (cue.keywords ?? []).map((k) => k.toLowerCase())
    return {
      index: i,
      cue,
      words: tokens.map((w, j) => ({ text: w, spoken: j < spokenCount, keyword: kws.some((k) => w.toLowerCase().replace(/[^\p{L}\p{N}=]/gu, '').startsWith(k)) })),
    }
  }

  /** Speak the cue at `t` once when playback enters it. No-op if speech is unavailable or disabled. */
  speak(t: number, enabled: boolean, rate = 1) {
    if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const i = this.indexAt(t)
    if (i < 0 || i === this.lastSpoken) return
    this.lastSpoken = i
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(this.cues[i].text)
    u.rate = Math.min(2, Math.max(0.6, rate))
    window.speechSynthesis.speak(u)
  }

  stopSpeech() {
    this.lastSpoken = -1
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }
}
