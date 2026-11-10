import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildTimeline, fillTemplate } from '../src/lessons/linreg-gd/timeline'
import { makeCoords, stateAt } from '../src/lessons/linreg-gd/state'
import type { GdManifest, LinRegTrace } from '../src/lessons/linreg-gd/types'

const fx = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/lessons/shah-8-4-movies.json`, 'utf8')) as { manifest: GdManifest; traces: LinRegTrace[] }
const { manifest, traces } = fx
const tl = buildTimeline(manifest, traces)

describe('regression / gradient-descent lesson timeline (Shah 8.4)', () => {
  it('orders scenes: intro, part (a) plane + models, part (c) line with the bowl, outro', () => {
    expect(tl.scenes[0].id).toBe('intro')
    expect(tl.scenes.at(-1)!.id).toBe('outro')
    expect(tl.scenes.map((s) => s.id)).toEqual(expect.arrayContaining(['a-rise', 'a-descend', 'a-models', 'c-bowl', 'c-descend', 'c-converged']))
    tl.scenes.forEach((s, i) => { if (i) expect(s.start).toBeCloseTo(tl.scenes[i - 1].end, 6) })
    expect(tl.duration).toBeCloseTo(tl.scenes.at(-1)!.end, 6)
  })
  it('fills every narration placeholder from the trace', () => {
    for (const c of tl.cues) expect(c.text).not.toMatch(/\{[a-z0-9_]+\}/)
    const all = tl.cues.map((c) => c.text).join(' ')
    expect(all).toContain(`Stopped after ${traces[1].iterations_run} iterations`)
    expect(all).toContain('change in cost fell below the tolerance')
    expect(all).toContain(`${traces[0].single_predictors![0].predictor} comes first: r = ${traces[0].single_predictors![0].r.toFixed(3)}`)
    expect(all).not.toMatch(/prediction improves|more than chance/)
    expect(tl.scenes.find((x) => x.id === 'c-converged')!.title).toBe(traces[1].stop_reason === 'converged' ? 'Converged within tolerance' : 'Iteration limit reached')
    expect(all).toContain(traces[0].models![1].r2.toFixed(3))
    expect(all).toContain(`R² = ${traces[1].ols.r2.toFixed(3)}`)
    expect(fillTemplate('{n} {units}', manifest.parts[1], traces[1])).toBe(`${traces[1].n} movies`)
  })
  it('does not claim convergence for divergent or unfinished runs', () => {
    for (const stop_reason of ['diverged', 'max_iterations'] as const) {
      const trace = { ...traces[1], stop_reason }
      const narration = fillTemplate('{reference_sentence} {stop_sentence}', manifest.parts[1], trace)
      expect(narration).toContain('has not converged')
      expect(narration).not.toContain('should be close')
      expect(narration).not.toMatch(/\{[a-z_]+\}/)
    }
  })
  it('the camera has keys and the descents are marked', () => {
    expect(tl.cameraKeys.length).toBeGreaterThan(5)
    expect(tl.markers.map((m) => m.label)).toEqual(['a: descent', 'c: descent'])
  })
})

describe('pure visual state', () => {
  const at = (id: string, k = 0.5) => { const s = tl.scenes.find((x) => x.id === id)!; return s.start + (s.end - s.start) * k }
  it('is a pure function of t (forward and backward seeking agree)', () => {
    const ts = [0.5, at('a-descend', 0.3), at('c-bowl'), at('c-descend', 0.6), at('outro')]
    const fwd = ts.map((t) => stateAt(tl, manifest.parts, traces, t))
    const back = [...ts].reverse().map((t) => stateAt(tl, manifest.parts, traces, t)).reverse()
    expect(back).toEqual(fwd)
  })
  it('starts from θ = 0, descends, and ends on the recorded final frame', () => {
    const before = stateAt(tl, manifest.parts, traces, at('c-guess'))
    expect(before.frame.iteration).toBe(0)
    expect(before.drawTheta).toEqual([0, 0])
    const mid = stateAt(tl, manifest.parts, traces, at('c-descend', 0.5))
    expect(mid.frame.iteration).toBeGreaterThan(0)
    expect(mid.frame.cost).toBeLessThan(traces[1].initial_cost)
    const end = stateAt(tl, manifest.parts, traces, at('c-read'))
    expect(end.frame).toEqual(traces[1].frames.at(-1))
    expect(end.olsOpacity).toBe(1)
    expect(end.bowlOpacity).toBe(1)
  })
  it('numbers come from recorded frames only, never from the tween', () => {
    for (let k = 0; k <= 1; k += 0.05) {
      const s = stateAt(tl, manifest.parts, traces, at('c-descend', k))
      expect(traces[1].frames).toContain(s.frame)
    }
  })
  it('maps data into the scene box; non-negative data never get a negative axis end', () => {
    const c = makeCoords(manifest.parts[1], traces[1])
    expect(c.x1.lo).toBeGreaterThanOrEqual(0)
    const p = c.point(c.x1.hi, null, c.y.hi)
    expect(p[0]).toBeCloseTo(c.box.x[1], 6)
    expect(c.bowl).toBeDefined()
    const m = traces[1].surface!.minimum
    expect(c.bowl!.at(m.theta0, m.theta1, m.cost)[1]).toBeCloseTo(c.bowl!.y[0], 1)
  })
})
