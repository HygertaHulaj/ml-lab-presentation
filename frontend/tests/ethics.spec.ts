import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { ACT_ACCENT } from '../src/presentation/theme'
import { BIASES, DECISIONS, GENDER_SHADES, POLICE_CHAIN, SUMMARY } from '../src/presentation/sections/10-ethics/content'

describe('Ethics in Practice (DS4A pp. 394–395)', () => {
  it('sits between Section 8.6 and the conclusion, with 10 steps', () => {
    const i = SECTIONS.findIndex((s) => s.id === 'ethics')
    expect(SECTIONS[i - 1].id).toBe('section-8-6')
    expect(SECTIONS[i + 1].id).toBe('conclusion')
    expect(SECTIONS[i].steps).toHaveLength(10)
    expect(SECTIONS.map((s) => s.n)).toEqual(SECTIONS.map((_, k) => k + 1))
    expect(ACT_ACCENT.ethics).toBeDefined()
  })
  it('keeps the book\'s lists and cites the one outside source', () => {
    expect(DECISIONS).toHaveLength(4)
    expect(BIASES).toEqual(['gender', 'sexual orientation', 'disability', 'location', 'ethnicity', 'race'])
    expect(GENDER_SHADES.cite).toContain('2018')
    expect(GENDER_SHADES.finding).toContain('34.7 %')
    expect(POLICE_CHAIN[POLICE_CHAIN.length - 1].k).toContain('trust')
    expect(SUMMARY).toHaveLength(5)
  })
})
