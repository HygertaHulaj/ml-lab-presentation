/**
 * Procedural score and sound design (Web Audio, synthesised at runtime, so there are no licensing questions).
 * - music: a slow pad whose chord, brightness and level follow each scene's `audio.music` intensity
 * - ambience: rain (exterior), room tone (lab), "data air" (digital)
 * - sfx: short synthesised cues at the storyboard's sfx times, fired only while playing forward
 * The film never depends on audio: captions and visuals carry all the content.
 */
import { sceneAt, storyboard, type SetId } from '../story'

const CHORDS: Record<string, number[]> = {
  's1-hospital': [110, 164.81, 220, 277.18],
  's2-noe': [98, 146.83, 196, 246.94],
  's3-question': [87.31, 130.81, 174.61, 220],
  's4-radiologyml': [110, 164.81, 207.65, 329.63],
  's5-machine': [123.47, 185, 246.94, 369.99],
  's6-mistakes': [98, 146.83, 196, 233.08],
  's7-second-eyes': [110, 164.81, 220, 261.63],
  's8-what-learned': [130.81, 196, 261.63, 329.63],
  's9-reveal': [146.83, 220, 293.66, 369.99],
}

export class AmbientScore {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private music!: GainNode
  private filter!: BiquadFilterNode
  private oscs: OscillatorNode[] = []
  private rain!: GainNode
  private room!: GainNode
  private air!: GainNode
  private lastT = -1
  private chordKey = ''
  volume = 0.7
  muted = false

  get started() { return !!this.ctx }

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) { void this.ctx.resume(); return }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    this.master.connect(comp).connect(ctx.destination)

    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 600
    this.filter.Q.value = 0.4
    this.music = ctx.createGain()
    this.music.gain.value = 0
    this.filter.connect(this.music).connect(this.master)
    for (let i = 0; i < 8; i++) {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'triangle' : 'sine'
      o.detune.value = (i % 2 ? 1 : -1) * 6
      const g = ctx.createGain()
      g.gain.value = 0.07
      o.connect(g).connect(this.filter)
      o.start()
      this.oscs.push(o)
    }
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoG = ctx.createGain()
    lfoG.gain.value = 180
    lfo.connect(lfoG).connect(this.filter.frequency)
    lfo.start()

    const noise = (brown: boolean) => {
      const len = ctx.sampleRate * 3
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      src.start()
      return src
    }
    const bus = (src: AudioNode, type: BiquadFilterType, f: number, q = 0.7) => {
      const flt = ctx.createBiquadFilter()
      flt.type = type
      flt.frequency.value = f
      flt.Q.value = q
      const g = ctx.createGain()
      g.gain.value = 0
      src.connect(flt).connect(g).connect(this.master)
      return g
    }
    this.rain = bus(noise(false), 'bandpass', 2400, 0.4)
    this.room = bus(noise(true), 'lowpass', 220)
    this.air = bus(noise(true), 'bandpass', 900, 2)
    this.applyVolume()
  }

  setVolume(v: number) { this.volume = v; this.applyVolume() }
  setMuted(m: boolean) { this.muted = m; this.applyVolume() }
  private applyVolume() {
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.15)
  }

  /** Call every frame with the film time. */
  update(t: number, playing: boolean) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const sc = sceneAt(t)
    const set: SetId = t < 13.6 ? 'exterior' : sc.set
    const level = playing ? sc.audio.music : sc.audio.music * 0.4
    this.music.gain.setTargetAtTime(0.18 + level * 0.32, now, 0.8)
    this.filter.frequency.setTargetAtTime(380 + level * 1500, now, 1.2)
    if (this.chordKey !== sc.id) {
      this.chordKey = sc.id
      const ch = CHORDS[sc.id] ?? CHORDS['s1-hospital']
      this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i % ch.length] * (i >= 4 ? 2 : 1), now, 1.5))
    }
    this.rain.gain.setTargetAtTime(set === 'exterior' ? 0.12 : 0, now, set === 'exterior' ? 0.5 : 0.25)
    this.room.gain.setTargetAtTime(set === 'lab' ? 0.08 : 0, now, 0.6)
    this.air.gain.setTargetAtTime(set === 'digital' || set === 'journey' || set === 'landscape' ? 0.035 : 0, now, 0.6)
    // sfx while playing forward through a cue time
    if (playing && this.lastT >= 0 && t > this.lastT && t - this.lastT < 0.5) {
      for (const s of storyboard.scenes) for (const c of s.audio.sfx) if (c.t > this.lastT && c.t <= t) this.sfx(c.cue)
    }
    this.lastT = t
  }

  private sfx(cue: string) {
    const ctx = this.ctx!
    const now = ctx.currentTime
    const env = (g: GainNode, a: number, peak: number, d: number) => {
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(peak, now + a)
      g.gain.exponentialRampToValueAtTime(0.0001, now + a + d)
    }
    const tone = (f0: number, f1: number, dur: number, peak = 0.08, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f0, now)
      o.frequency.exponentialRampToValueAtTime(f1, now + dur)
      const g = ctx.createGain()
      env(g, 0.02, peak, dur)
      o.connect(g).connect(this.master)
      o.start(now)
      o.stop(now + dur + 0.1)
    }
    const whoosh = (dur: number, f0: number, f1: number, peak = 0.12) => {
      const len = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      src.buffer = buf
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 1.2
      f.frequency.setValueAtTime(f0, now)
      f.frequency.exponentialRampToValueAtTime(f1, now + dur)
      const g = ctx.createGain()
      env(g, dur * 0.4, peak, dur * 0.6)
      src.connect(f).connect(g).connect(this.master)
      src.start(now)
    }
    switch (cue) {
      case 'glass-whoosh': case 'dive': whoosh(1.4, 300, 3200, 0.16); break
      case 'door': tone(180, 120, 0.3, 0.05, 'triangle'); break
      case 'ui-stream': tone(1200, 1800, 0.12, 0.03); tone(1500, 2200, 0.12, 0.02); break
      case 'boot': tone(220, 880, 0.9, 0.06); break
      case 'panel': tone(880, 1320, 0.18, 0.035); break
      case 'rise': whoosh(2.2, 200, 1400, 0.1); break
      case 'pulse': tone(330, 660, 0.4, 0.05, 'triangle'); break
      case 'compare': tone(660, 990, 0.25, 0.05); break
      case 'warn': tone(440, 370, 0.4, 0.05, 'triangle'); break
      case 'correct': tone(523, 784, 0.35, 0.05); break
      case 'validate': tone(587, 880, 0.5, 0.05); break
      case 'flag': tone(700, 520, 0.35, 0.05, 'triangle'); break
      case 'confirm': tone(392, 392, 0.6, 0.04); break
      case 'shimmer': for (let i = 0; i < 4; i++) tone(1200 + i * 300, 1600 + i * 300, 0.6, 0.015); break
      case 'assemble': whoosh(3, 150, 2000, 0.1); break
      case 'resolve': tone(293.66, 293.66, 1.6, 0.05); tone(440, 440, 1.6, 0.04); break
    }
  }

  dispose() {
    void this.ctx?.close()
    this.ctx = null
  }
}
