/** Section 8.2 content follows DS4A pp. 365–368 (source order, the book's exercise items and answer key logic). */
import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { STEPS_82, WELLNESS, LANES, PROBLEMS, INGEST_ITEMS, DEFS } from '../src/presentation/sections/05-section-8-2/content'

describe('Section 8.2 modules', () => {
  it('are registered in source order', () => {
    const s = SECTIONS.find((x) => x.id === 'section-8-2')!
    expect(s.status).toBe('ready')
    expect(s.steps).toEqual([...STEPS_82])
    const order = ['Supervised vs. unsupervised', 'A model is a recipe', 'RadiologyML learns', 'The three steps', 'Step 1: Ingest data', 'Tidy data', 'Case: Tesla', 'Step 2: Analyze the data', 'Step 3: Produce results', 'Try it yourself']
    expect(order.map((o) => s.steps.indexOf(o))).toEqual([...order.keys()].map((k) => k + 1))
  })
  it('keep the book\'s definitions of supervised and unsupervised learning', () => {
    expect(DEFS.supervised).toContain('response variable')
    expect(DEFS.unsupervised).toContain('No response variable')
    expect(PROBLEMS.filter((p) => p.supervised)).toHaveLength(3)
  })
  it('Mental Wellness Assistant: the nine features of pp. 367–368 in three lanes', () => {
    expect(WELLNESS.map((w) => w.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(WELLNESS.filter((w) => w.lane === 1).map((w) => w.n)).toEqual([1, 2, 3, 4])
    expect(WELLNESS.filter((w) => w.lane === 2).map((w) => w.n)).toEqual([5, 6])
    expect(WELLNESS.filter((w) => w.lane === 3).map((w) => w.n)).toEqual([7, 8, 9])
    expect(LANES).toHaveLength(3)
  })
  it('ingestion covers both structured and unstructured data', () => {
    expect(INGEST_ITEMS.some((i) => i.structured)).toBe(true)
    expect(INGEST_ITEMS.some((i) => !i.structured)).toBe(true)
  })
})
