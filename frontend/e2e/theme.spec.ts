import { expect, test } from '@playwright/test'

/**
 * Warm Lab theme (default) and Lecture Hall Light (key L): the toggle works, persists, recolours the shell with the
 * act's accent, and both themes keep body text readable (WCAG AA ≥ 4.5:1 against the stage ground).
 * Also saves key frames of both themes to docs/presentation-keyframes/ for review.
 */
const SHOTS: [string, number][] = [['ai', 1], ['machine-learning', 3], ['how-learning-works', 3], ['section-8-2', 5], ['section-8-3', 2], ['section-8-3', 9], ['research', 1]]

function lum([r, g, b]: number[]) {
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('L toggles Warm Lab ↔ Lecture Hall Light and persists', async ({ page }) => {
  await page.goto('/presentation/ai?step=0')
  const root = page.locator('[data-theme]').first()
  await expect(root).toHaveAttribute('data-theme', 'warm')
  await page.keyboard.press('l')
  await expect(root).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('pres-theme').click()
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'warm')
})

test('each act sets its own accent', async ({ page }) => {
  const accent = async (id: string) => {
    await page.goto(`/presentation/${id}?step=0`)
    return page.locator('[data-theme]').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--c-accent').trim())
  }
  const a = await accent('ai'), b = await accent('section-8-2'), c = await accent('section-8-3')
  expect(new Set([a, b, c]).size).toBe(3)
})

for (const theme of ['warm', 'light'] as const) {
  test(`${theme}: text tokens meet AA contrast and key frames render`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.addInitScript((t) => {
      const k = 'mllab.presentation.v1'
      const s = JSON.parse(localStorage.getItem(k) ?? '{}')
      localStorage.setItem(k, JSON.stringify({ ...s, theme: t }))
    }, theme)
    await page.goto('/presentation/ai?step=0')
    const tokens = await page.locator('[data-theme]').first().evaluate((el) => {
      const cs = getComputedStyle(el)
      const g = (n: string) => cs.getPropertyValue(`--c-${n}`).trim().split(/[ ,]+/).map(Number)
      return Object.fromEntries(['ground', 'surface', 'text', 'soft', 'dim', 'faint', 'data', 'human', 'coral', 'ok', 'warn', 'feature', 'compute', 'accent'].map((k) => [k, g(k)]))
    })
    for (const k of ['text', 'soft', 'dim', 'faint', 'data', 'human', 'coral', 'ok', 'warn', 'feature', 'compute', 'accent']) {
      expect(contrast(tokens[k], tokens.ground), `${theme} ${k} on ground`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens[k], tokens.surface), `${theme} ${k} on surface`).toBeGreaterThanOrEqual(4.5)
    }
    let n = theme === 'warm' ? 60 : 70
    for (const [id, s] of SHOTS) {
      await page.goto(`/presentation/${id}?step=${s}`)
      await page.locator('main.stage section').first().waitFor()
      await page.waitForTimeout(2200)
      await page.screenshot({ path: `../docs/presentation-keyframes/${n++}-${theme}-${id}-${s}.png` })
    }
  })
}
