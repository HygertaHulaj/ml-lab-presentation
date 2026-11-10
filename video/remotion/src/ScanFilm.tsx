/**
 * The film, frame-accurate. The 3D world is the SAME FilmWorld used by the Vue interactive story
 * (frontend/src/experiences/cinematic/world), rendered at t = frame / fps. Captions, title and scene cards are
 * React layers driven by shared/story/narration.json.
 */
import { useEffect, useRef, useState } from 'react'
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FilmWorld } from '../../../frontend/src/experiences/cinematic/world/FilmWorld'
import { cueAt, sceneAt, SPEAKER_NAME, storyboard, transitionOverlayAt } from '../../../frontend/src/experiences/cinematic/story'
import { clamp, window01 } from '../../../frontend/src/experiences/cinematic/world/math'

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@400;500;600;700&display=block'

function useFonts() {
  const [handle] = useState(() => delayRender('fonts'))
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_CSS
    document.head.appendChild(link)
    const done = () => continueRender(handle)
    link.onload = () => {
      Promise.all(['600 40px "Space Grotesk"', '500 20px Inter', '500 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))).then(done, done)
    }
    link.onerror = done
    const timer = setTimeout(done, 8000)
    return () => clearTimeout(timer)
  }, [handle])
}

export const ScanFilm: React.FC<{ vertical: boolean; startAt: number; audioSrc?: string | null }> = ({ vertical, startAt, audioSrc = null }) => {
  useFonts()
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const t = startAt + frame / fps
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef<FilmWorld | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const h = delayRender('world')
    const start = () => {
      if (!canvas.current) return
      world.current = new FilmWorld({ canvas: canvas.current, width, height, pixelRatio: 1, quality: 'high', preserveDrawingBuffer: true })
      setReady(true)
      continueRender(h)
    }
    document.fonts.ready.then(start, start)
    return () => { world.current?.dispose(); world.current = null }
  }, [width, height])

  useEffect(() => {
    if (!ready || !world.current) return
    const h = delayRender(`frame ${frame}`)
    world.current.render(t, transitionOverlayAt(t).amount)
    requestAnimationFrame(() => continueRender(h))
  }, [t, ready, frame])

  const sc = sceneAt(t)
  const cue = cueAt(t)
  const title = window01(t, storyboard.titleCard.start, storyboard.titleCard.end, 1, 1)
  const card = sc.n === 1 ? 0 : window01(t, sc.start + 0.3, sc.start + 3.2, 0.6, 0.8)
  const reveal = window01(t, 158.5, 172, 1.2, 0.01)
  const end = clamp((t - 170.2) / 1.2)
  const s = vertical ? 1.25 : 1
  const words = cue ? cue.text.split(/\s+/) : []
  const shown = cue ? Math.ceil(clamp((t - cue.start) / ((cue.end - cue.start) * 0.8)) * words.length) : 0

  return (
    <AbsoluteFill style={{ background: '#04070e', fontFamily: 'Inter, system-ui, sans-serif', color: '#e8eef8' }}>
      <canvas ref={canvas} width={width} height={height} style={{ position: 'absolute', inset: 0, width, height }} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 220px rgba(0,0,0,0.55)' }} />
      {/* title */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: title, padding: 80 }}>
        <div style={{ font: `600 ${18 * s}px 'Space Grotesk'`, letterSpacing: '0.38em', color: '#38d6f0', textTransform: 'uppercase' }}>A story about machine learning</div>
        <div style={{ font: `600 ${(vertical ? 88 : 96)}px/1.02 'Space Grotesk'`, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '20px 0 14px', textShadow: '0 0 40px rgba(56,214,240,.35)' }}>{storyboard.title}</div>
        <div style={{ font: `400 ${30 * s}px Inter`, color: '#9fb0c8' }}>{storyboard.subtitle}</div>
      </AbsoluteFill>
      {/* scene card */}
      <div style={{ position: 'absolute', top: 60, left: 80, opacity: card, font: `500 ${22 * s}px 'Space Grotesk'`, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#cfe8f5' }}>
        <span style={{ color: '#38d6f0', marginRight: 16 }}>{String(sc.n).padStart(2, '0')}</span>{sc.title}
      </div>
      {/* reveal subtitle + end card */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.52, textAlign: 'center', opacity: reveal * (1 - end), font: `400 ${30 * s}px Inter`, letterSpacing: '0.08em', color: '#cfe8f5' }}>
        Learning Patterns. Making Predictions. Improving with Data.
      </div>
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: height * 0.06, opacity: end }}>
        <div style={{ font: `600 ${16 * s}px 'Space Grotesk'`, letterSpacing: '0.38em', color: '#38d6f0' }}>WELCOME TO MACHINE LEARNING</div>
        <div style={{ font: `600 ${64 * s}px 'Space Grotesk'`, letterSpacing: '0.12em', marginTop: 10 }}>INSIDE MACHINE LEARNING</div>
        <div style={{ font: `400 ${22 * s}px Inter`, color: '#9fb0c8', marginTop: 12 }}>150 real Iris flowers · sepal length × sepal width · unlabelled</div>
      </AbsoluteFill>
      {/* captions */}
      {cue && (
        <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: vertical ? '14%' : '8%', textAlign: 'center' }}>
          {cue.speaker !== 'narrator' && (
            <div style={{ font: `600 ${18 * s}px 'Space Grotesk'`, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, color: cue.speaker === 'noe' ? '#5fd3c8' : cue.speaker === 'salizar' ? '#f2b54a' : '#9fb0c8' }}>{SPEAKER_NAME[cue.speaker]}</div>
          )}
          <span style={{ font: `500 ${(cue.speaker === 'note' ? 26 : 36) * s}px/1.45 Inter`, fontStyle: cue.speaker === 'note' ? 'italic' : 'normal', background: 'rgba(4,7,14,.58)', padding: '6px 18px', borderRadius: 12, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
            {words.map((w, i) => (
              <span key={i} style={{ color: i < shown ? (cue.speaker === 'note' ? '#f2b54a' : cue.keywords.some((k) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(k)) ? '#7fe3ff' : '#f2f6fc') : 'rgba(232,238,248,.32)' }}>{w + ' '}</span>
            ))}
          </span>
        </div>
      )}
      {t > 49 && t < 136 && (
        <div style={{ position: 'absolute', right: 40, bottom: 28, font: `500 ${15 * s}px Inter`, letterSpacing: '0.08em', color: 'rgba(159,176,200,.75)' }}>Fictional system · synthetic images · not a medical device</div>
      )}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
    </AbsoluteFill>
  )
}
