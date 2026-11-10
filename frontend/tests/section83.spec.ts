/** Section 8.3 follows DS4A pp. 368–379: source order, the book's exercise items, and honest labelling. */
import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { STEPS_83, REG_CLASS, INF_PRED, INF_PRED_OPTIONS, CARSEAT_VARS, TRADEOFF, DEFS } from '../src/presentation/sections/06-section-8-3/content'

describe('Section 8.3 modules', () => {
  it('are registered in source order, before the movie worked example and Section 8.4', () => {
    const i = SECTIONS.findIndex((s) => s.id === 'section-8-3')
    expect(SECTIONS[i - 1].id).toBe('section-8-2')
    expect(SECTIONS[i + 1].id).toBe('movies')
    expect(SECTIONS[i + 2].id).toBe('section-8-4')
    expect(SECTIONS[i].steps).toEqual([...STEPS_83])
    expect(SECTIONS.map((s) => s.n)).toEqual(SECTIONS.map((_, k) => k + 1))
  })
  it('keeps the book definitions and exercise items', () => {
    expect(DEFS.regression).toContain('quantitative')
    expect(DEFS.classification).toContain('categorical')
    expect(REG_CLASS.map((r) => r.answer)).toEqual(['Classification', 'Regression', 'Regression', 'Classification', 'Classification', 'Regression'])
    expect(INF_PRED.map((r) => r.answer)).toEqual(['Regression · inference', 'Classification · prediction', 'Regression · inference'])
    for (const r of INF_PRED) expect(INF_PRED_OPTIONS).toContain(r.answer)
  })
  it('marks sales as a surrogate of sales_cat (Quick Tip, p. 370)', () => {
    expect(CARSEAT_VARS.find((v) => v.v === 'sales')!.role).toBe('surrogate')
    expect(CARSEAT_VARS.find((v) => v.v === 'sales_cat')!.role).toBe('response')
  })
  it('places only the methods the text names on the trade-off, more complex = less interpretable', () => {
    expect(TRADEOFF.map((t) => t.name)).toEqual(['Traditional linear regression', 'Decision trees', 'Deep learning'])
    const byC = [...TRADEOFF].sort((a, b) => a.complexity - b.complexity)
    expect(byC.map((t) => t.interp)).toEqual([...byC.map((t) => t.interp)].sort((a, b) => b - a))
  })
})
