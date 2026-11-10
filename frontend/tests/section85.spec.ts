import { describe, expect, it } from 'vitest'
import { SECTIONS } from '../src/presentation/sections'
import { ACT_ACCENT } from '../src/presentation/theme'
import { encodeDrawing } from '../src/presentation/sections/08-section-8-5/encode'
import { APPLICATIONS, COSTS, DEFS, SUMMARY } from '../src/presentation/sections/08-section-8-5/content'

describe('Section 8.5 (DS4A pp. 389–392)', () => {
  it('sits between Section 8.4 and the recent-research section, with 12 steps', () => {
    const i = SECTIONS.findIndex((s) => s.id === 'section-8-5')
    expect(SECTIONS[i - 1].id).toBe('section-8-4')
    expect(SECTIONS[i + 1].id).toBe('research')
    expect(SECTIONS[i].steps).toHaveLength(12)
    expect(SECTIONS.map((s) => s.n)).toEqual(SECTIONS.map((_, k) => k + 1))
    expect(ACT_ACCENT['section-8-5']).toBeDefined()
  })
  it('keeps the book definitions and lists', () => {
    expect(DEFS.ann).toContain('human brain')
    expect(DEFS.deep).toContain('multiple layers')
    expect(APPLICATIONS).toHaveLength(6)
    expect(COSTS.some((c) => c.includes('interpretability'))).toBe(true)
    expect(SUMMARY).toHaveLength(5)
  })
})

describe('encodeDrawing (optdigits preprocessing)', () => {
  it('returns 64 zeros for an empty drawing', () => {
    expect(encodeDrawing(() => false, 100, 100)).toEqual(new Array(64).fill(0))
  })
  it('counts ink per 4×4 block of a centred 32×32 bitmap (values 0–16)', () => {
    const full = encodeDrawing((x, y) => x >= 20 && x < 80 && y >= 20 && y < 80, 100, 100)
    expect(full).toHaveLength(64)
    expect(Math.max(...full)).toBe(16)
    expect(full[0]).toBe(4) // a 28-pixel fit leaves a 2-pixel margin: 2 × 2 inked pixels in the corner block
    expect(full[3 * 8 + 3]).toBe(16) // the middle is fully inked
  })
  it('is independent of where and how large the digit is drawn', () => {
    const bar = (x0: number, w: number) => (x: number, y: number) => x >= x0 && x < x0 + w / 5 && y >= 10 && y < 10 + w
    expect(encodeDrawing(bar(5, 50), 200, 200)).toEqual(encodeDrawing(bar(100, 50), 200, 200))
    const small = encodeDrawing(bar(5, 50), 200, 200), big = encodeDrawing(bar(5, 150), 200, 200)
    expect(small.reduce((a, b) => a + b)).toBeCloseTo(big.reduce((a, b) => a + b), -1)
  })
})
