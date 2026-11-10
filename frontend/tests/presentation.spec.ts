import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CORE_MINUTES, SECTIONS } from '../src/presentation/sections'
import { activityById } from '../src/activities/registry'
import { CLUSTER_HEX, CLUSTER_TOKENS, SPECIES_HEX, SPECIES_TOKEN, themeVars } from '../src/presentation/theme'
import { usePresentation } from '../src/presentation/store'
import { fieldPoints, fieldPos } from '../src/visualizations/shared/ParticleField'
import { FIELDS, IDENTIFY_AI } from '../src/presentation/sections/02-artificial-intelligence/content'

describe('section registry', () => {
  it('follows the chapter, with the worked example after 8.3 and recent research after 8.5, ending on the conclusion', () => {
    // the Algorithm Lab appendix is hidden with the classic lab (features.ts, SHOW_EXTRA_PAGES)
    expect(SECTIONS.map((s) => s.path)).toEqual(['intro', 'ai', 'machine-learning', 'how-learning-works', 'section-8-2', 'section-8-3', 'worked-example-movies', 'section-8-4', 'section-8-5', 'research', 'section-8-6', 'ethics', 'conclusion'])
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length)
    SECTIONS.forEach((s, i) => { expect(s.n).toBe(i + 1); expect(s.steps.length).toBeGreaterThan(0) })
  })
  it('tells one story: every core section answers its question and gives a reason for the next', () => {
    const core = SECTIONS.filter((s) => s.track === 'core')
    expect(core.at(-1)!.id).toBe('conclusion')
    for (const s of core) { expect(s.question.endsWith('?')).toBe(true); expect(s.takeaway.length).toBeGreaterThan(20) }
    for (const s of core.slice(0, -1)) expect(s.bridge?.endsWith('?')).toBe(true)
    expect(CORE_MINUTES).toBe(80)
    expect(SECTIONS.filter((s) => s.track === 'appendix').map((s) => s.id)).toEqual([])
    expect(SECTIONS.some((s) => s.status === 'in-development')).toBe(false)
    expect(SECTIONS.find((s) => s.id === 'movies')!.source).toContain('Shah')
  })
  it('embeds only real activities and lessons, inside the core route', () => {
    const lessons = ['kmeans-iris', 'shah-8-1-restaurants', 'shah-8-2-airlines', 'shah-8-3-rock', 'shah-8-4-movies']
    for (const s of SECTIONS) for (const e of s.embeds ?? []) {
      expect(s.track).toBe('core')
      if (e.kind === 'activity') expect(activityById(e.id), e.id).toBeDefined()
      else expect(lessons).toContain(e.id)
    }
    expect(SECTIONS.flatMap((s) => s.embeds ?? []).length).toBeGreaterThanOrEqual(12)
  })
  it('defines the semantic colour roles once, for both themes', () => {
    for (const t of ['warm', 'light'] as const) {
      const v = themeVars(t, 'movies')
      for (const r of ['obs', 'pred', 'ref', 'err']) expect(v[`--c-${r}`]).toMatch(/^\d+, \d+, \d+$/)
    }
  })
  it('gives Iris one species palette, and clusters hues no species uses', () => {
    const sp = Object.values(SPECIES_TOKEN)
    expect(new Set(sp).size).toBe(3)
    for (const c of CLUSTER_TOKENS) expect(sp).not.toContain(c)
    expect(CLUSTER_HEX.slice(0, 3).some((h) => Object.values(SPECIES_HEX).includes(h))).toBe(false)
  })
  it('never presents unbuilt sections as finished', () => {
    for (const s of SECTIONS.filter((x) => x.status === 'in-development')) expect(s.planned?.length).toBeGreaterThan(0)
    expect(SECTIONS.find((s) => s.id === 'section-8-2')!.source).toContain('pp. 365–368')
  })
})

describe('presentation store navigation', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
  it('steps inside a section, then crosses to the next section', () => {
    const s = usePresentation()
    s.enter('intro', 0)
    expect(s.next()).toBeNull()
    expect(s.step).toBe(1)
    s.setStep('intro', 2)
    expect(s.next()).toEqual({ section: 'ai', step: 0 })
  })
  it('going back from step 0 lands on the last step of the previous section', () => {
    const s = usePresentation()
    s.enter('machine-learning', 0)
    expect(s.prev()).toEqual({ section: 'ai', step: SECTIONS[1].steps.length - 1 })
  })
  it('clamps steps and persists settings', () => {
    const s = usePresentation()
    s.enter('ai', 99)
    expect(s.step).toBe(SECTIONS[1].steps.length - 1)
    s.muted = true
    return Promise.resolve().then(() => {
      expect(JSON.parse(localStorage.getItem('mllab.presentation.v1')!).muted).toBe(true)
    })
  })
})

describe('shared particle field (intro → AI hand-off target)', () => {
  it('is deterministic and normalised', () => {
    const a = fieldPoints(), b = fieldPoints()
    expect(a).toBe(b)
    expect(a.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0.02 && p.y <= 0.98)).toBe(true)
  })
  it('does not drift in reduced-motion mode', () => {
    const p = fieldPoints()[3]
    expect(fieldPos(p, 0, 100, 100, true)).toEqual(fieldPos(p, 50, 100, 100, true))
  })
})

describe('AI section content', () => {
  it('nests deep learning inside machine learning inside AI (every example sits in its own field)', () => {
    const inside = (f: (typeof FIELDS)['ai'], x: number, y: number) => ((x - f.cx) / f.rx) ** 2 + ((y - f.cy) / f.ry) ** 2 < 1
    for (const e of FIELDS.ai.examples) { expect(inside(FIELDS.ai, e.x, e.y)).toBe(true); expect(inside(FIELDS.ml, e.x, e.y)).toBe(false) }
    for (const e of FIELDS.ml.examples) { expect(inside(FIELDS.ml, e.x, e.y)).toBe(true); expect(inside(FIELDS.dl, e.x, e.y)).toBe(false) }
    for (const e of FIELDS.dl.examples) expect(inside(FIELDS.dl, e.x, e.y)).toBe(true)
  })
  it('keeps the DS4A exercise items (p. 365)', () => {
    expect(IDENTIFY_AI).toHaveLength(8)
    expect(IDENTIFY_AI.filter((q) => q.ai).map((q) => q.item)).toEqual(['Email spam filters', 'Google Translate', 'Autocorrect when text messaging', 'Plagiarism detection software'])
  })
})

// ------------------------------------------------------------------ Section 3 pipelines
import { absorbPose, LANE, passPose, pickTestSamples, pickTrainSamples, scanIndex, splitFull, tokenProgress } from '../src/presentation/sections/03-machine-learning/pipeline'
import type { RuleVsLearned } from '../src/presentation/api'

const fake: RuleVsLearned = {
  feature: 'petal_length_cm', classes: { negative: 'versicolor', positive: 'virginica' }, rule: '',
  train: { x: [4.0, 4.2, 4.4, 4.6, 5.0, 5.2, 5.6, 6.0], positive: [false, false, false, false, true, true, true, true] },
  test: { x: [4.1, 4.8, 5.3, 5.9, 4.5, 6.2], positive: [false, false, true, true, false, true], pred_learned: [false, true, true, true, false, true], pred_human: [false, false, false, true, false, true] },
  candidates: [{ threshold: 4.5, train_accuracy: 0.75 }, { threshold: 4.8, train_accuracy: 1 }], learned: { threshold: 4.8, train_accuracy: 1, test_accuracy: 0.833 },
  human: { threshold: 5.5, train_accuracy: 0.875, test_accuracy: 0.833 }, split: { test_fraction: 0.3, seed: 1, n_train: 8, n_test: 6 }, source: 'fixture',
}

describe('machine-learning pipelines', () => {
  it('shows real errors: the display subset includes each rule\'s first mistake', () => {
    const s = pickTestSamples(fake)
    expect(s.length).toBe(6)
    expect(s.some((x) => x.predLearned !== x.truth)).toBe(true)
    expect(s.some((x) => x.predHuman !== x.truth)).toBe(true)
    expect(pickTestSamples(fake)).toEqual(s) // deterministic
    expect(pickTrainSamples(fake, 2).map((x) => x.truth)).toEqual([false, false, true, true])
  })
  it('tokens start in the queue and end in their output slot; the path is continuous', () => {
    for (let i = 0; i < 6; i++) {
      expect(passPose(0, i, 6)).toMatchObject({ x: LANE.queueX, stage: 'queue' })
      expect(passPose(1, i, 6)).toMatchObject({ x: LANE.outX, stage: 'out', opacity: 1 })
      expect(absorbPose(1, i, 6).opacity).toBe(0)
      for (let p = 0; p < 1; p += 0.002) {
        const a = passPose(p, i, 6), b = passPose(p + 0.002, i, 6)
        if (a.stage === b.stage) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(30)
      }
    }
    expect(tokenProgress(0.5, 0, 6)).toBeGreaterThan(tokenProgress(0.5, 5, 6))
  })
  it('the comparison trains first, then infers; the scan stays within the candidates', () => {
    expect(splitFull(0.25)).toEqual({ phase: 'training', p: 0.5 })
    expect(splitFull(0.75)).toEqual({ phase: 'inference', p: 0.5 })
    expect(scanIndex(0, 31)).toBe(0)
    expect(scanIndex(1, 31)).toBe(30)
  })
})
