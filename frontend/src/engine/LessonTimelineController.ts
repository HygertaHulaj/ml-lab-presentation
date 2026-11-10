import { gsap } from 'gsap'
import { clamp } from './easing'

export interface TimelineSnapshot {
  t: number
  playing: boolean
  rate: number
  direction: 1 | -1
}

type Listener = (s: TimelineSnapshot) => void

/**
 * Owns the lesson playhead. GSAP tweens a single number `t` from the current position to the end (or to 0 when
 * reversing). Every visual is computed from `t`, so seeking, speed changes and reverse play are always consistent.
 */
export class LessonTimelineController {
  private proxy = { t: 0 }
  private tween: gsap.core.Tween | null = null
  private listeners = new Set<Listener>()
  private _playing = false
  private _rate = 1
  private _direction: 1 | -1 = 1
  private stops: number[] = [0]

  constructor(private _duration: number) {}

  get t() { return this.proxy.t }
  get duration() { return this._duration }
  get playing() { return this._playing }
  get rate() { return this._rate }

  snapshot(): TimelineSnapshot {
    return { t: this.proxy.t, playing: this._playing, rate: this._rate, direction: this._direction }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => this.listeners.delete(fn)
  }

  /** Replace the timeline (e.g. after parameters changed) and keep the playhead inside the new range. */
  setDuration(d: number, stops: number[] = [0, d]) {
    this._duration = d
    this.stops = [...stops].sort((a, b) => a - b)
    this.seek(Math.min(this.proxy.t, d))
  }

  play(direction: 1 | -1 = 1) {
    this._direction = direction
    const target = direction === 1 ? this._duration : 0
    if (Math.abs(this.proxy.t - target) < 1e-6) {
      if (direction === 1) this.proxy.t = 0
      else return this.pause()
    }
    this.kill()
    const span = Math.abs(target - this.proxy.t)
    this._playing = true
    this.tween = gsap.to(this.proxy, {
      t: target, duration: span / this._rate, ease: 'none',
      onUpdate: () => this.emit(),
      onComplete: () => { this._playing = false; this.tween = null; this.emit() },
    })
    this.emit()
  }

  pause() {
    this.kill()
    this._playing = false
    this.emit()
  }

  toggle() {
    if (this._playing) this.pause()
    else this.play(1)
  }

  seek(t: number) {
    const wasPlaying = this._playing
    this.kill()
    this.proxy.t = clamp(t, 0, this._duration)
    this._playing = false
    if (wasPlaying) this.play(this._direction)
    else this.emit()
  }

  setRate(rate: number) {
    this._rate = clamp(rate, 0.25, 4)
    if (this._playing) this.play(this._direction)
    else this.emit()
  }

  /** Jump to the next step boundary after the playhead (keeps play/pause state). */
  next() {
    const n = this.stops.find((s) => s > this.proxy.t + 1e-3)
    this.seek(n ?? this._duration)
  }

  /** Jump to the previous step boundary; pressing twice quickly goes further back, like a media player. */
  prev() {
    const before = this.stops.filter((s) => s < this.proxy.t - 0.35)
    this.seek(before.length ? before[before.length - 1] : 0)
  }

  dispose() {
    this.kill()
    this.listeners.clear()
  }

  private kill() {
    this.tween?.kill()
    this.tween = null
  }

  private emit() {
    const s = this.snapshot()
    this.listeners.forEach((fn) => fn(s))
  }
}
