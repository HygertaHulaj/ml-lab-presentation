import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { ACT_ACCENT } from '../src/presentation/theme'
import { DIMENSIONS, PRACTICE, PRACTICE_OPTIONS, SUMMARY } from '../src/presentation/sections/09-section-8-6/content'

describe('Section 8.6 (DS4A pp. 392–393)', () => {
  it('sits between the recent-research section and the ethics section, with 8 steps', () => {
    const i = SECTIONS.findIndex((s) => s.id === 'section-8-6')
    expect(SECTIONS[i - 1].id).toBe('research')
    expect(SECTIONS[i + 1].id).toBe('ethics')
    expect(SECTIONS[i].steps).toHaveLength(8)
    expect(SECTIONS.map((s) => s.n)).toEqual(SECTIONS.map((_, k) => k + 1))
    expect(ACT_ACCENT['section-8-6']).toBeDefined()
  })
  it('has the four dimensions in the book\'s order, with the RadiologyML examples', () => {
    expect(DIMENSIONS.map((d) => d.k)).toEqual(['Freshness', 'Volume', 'Diversity', 'Quality'])
    expect(DIMENSIONS[2].radiology).toContain('Noé')
    expect(DIMENSIONS[3].radiology).toContain('resolution')
  })
  it('has practice items whose answers are dimensions', () => {
    PRACTICE.forEach((p) => expect(PRACTICE_OPTIONS).toContain(p.answer))
    expect(new Set(PRACTICE.map((p) => p.answer)).size).toBe(4)
    expect(SUMMARY).toHaveLength(5)
  })
})
