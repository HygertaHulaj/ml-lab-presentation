import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { ACT_ACCENT } from '../src/presentation/theme'
import { CELL_ITEMS, CELL_OPTIONS, COOKIES, DEFS, FIT_RULES, OUTCOMES, SUMMARY } from '../src/presentation/sections/07-section-8-4/content'

describe('Section 8.4 (DS4A pp. 380–388)', () => {
  it('follows the movie worked example, precedes 8.5, with 15 steps in source order', () => {
    const i = SECTIONS.findIndex((s) => s.id === 'section-8-4')
    expect(SECTIONS[i - 1].id).toBe('movies')
    expect(SECTIONS[i + 1].id).toBe('section-8-5')
    expect(SECTIONS[i].steps).toHaveLength(15)
    expect(SECTIONS[i].steps[13]).toBe('Back to the movies')
    expect(SECTIONS[i].steps[4]).toBe('Confusion matrix')
    expect(SECTIONS[i].source).toContain('380–388')
    expect(ACT_ACCENT['section-8-4']).toBeDefined()
  })
  it('keeps the book definitions', () => {
    expect(DEFS.validation).toMatch(/training data.*test data/)
    expect(DEFS.precision).toContain('positive predictions')
    expect(DEFS.recall).toContain('actual positives')
    expect(DEFS.specificity).toContain('actual negatives')
    expect(DEFS.nfl).toContain('no single machine learning method')
  })
  it('has the four outcomes with the two mistakes, and consistent exercise items', () => {
    expect(OUTCOMES.map((o) => o.k)).toEqual(['TP', 'FP', 'TN', 'FN'])
    expect(OUTCOMES.filter((o) => !o.ok).map((o) => o.k)).toEqual(['FP', 'FN'])
    expect(new Set(CELL_ITEMS.map((c) => c.answer)).size).toBe(4)
    CELL_ITEMS.forEach((c) => expect(CELL_OPTIONS).toContain(c.answer))
    expect(CELL_ITEMS[0].answer).toBe('Predicted = 1, Actual = 1')
    expect(COOKIES).toHaveLength(3)
    expect(FIT_RULES.map((r) => r.k)).toEqual(['Overfitting', 'Good fit', 'Underfitting'])
    expect(SUMMARY).toHaveLength(5)
  })
})
