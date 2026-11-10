import { expect, test, type Page } from '@playwright/test'
import { SHOW_EXTRA_PAGES } from '../src/features'

// this page is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES); its tests run again when it is shown
test.skip(!SHOW_EXTRA_PAGES, 'page hidden')
import { mkdirSync } from 'node:fs'

/**
 * Main journey of "The Scan That Changed Everything" at 1920×1080: start → play → captions → scene navigation →
 * skip → "Inside Machine Learning" → the real K-Means lab. Also captures key frames for visual review.
 */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })

const SHOTS_DIR = '../docs/06-the-scan/keyframes' // kept outside test-results (Playwright clears it on every run)

async function open(page: Page, query = '') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION_REFUSED')) errors.push(m.text()) })
  await page.goto('/film' + query)
  return errors
}
async function seek(page: Page, t: number) {
  await page.getByTestId('film-scrubber').evaluate((el, v) => {
    const input = el as HTMLInputElement
    input.value = String(v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, t)
}
/** Mean luminance and spread of the WebGL canvas (needs ?preserve=1). */
async function canvasStats(page: Page) {
  return page.getByTestId('film-canvas').evaluate((c) => {
    const src = c as HTMLCanvasElement
    const o = document.createElement('canvas')
    o.width = 160; o.height = 90
    const g = o.getContext('2d')!
    g.drawImage(src, 0, 0, 160, 90)
    const d = g.getImageData(0, 0, 160, 90).data
    let s = 0, s2 = 0
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l }
    const n = d.length / 4
    return { mean: s / n, sd: Math.sqrt(s2 / n - (s / n) ** 2) }
  })
}

test('start screen, playback, captions and controls', async ({ page }) => {
  const errors = await open(page)
  await expect(page.getByTestId('film-start')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/scan that changed everything/i)
  await page.getByTestId('film-play').click()
  await expect(page.getByTestId('film-start')).toBeHidden()
  // narration begins at 4.8 s
  await expect(page.getByTestId('caption')).toContainText('hospitals produce thousands', { timeout: 30_000 })
  await page.keyboard.press('Space')
  const t1 = await page.getByTestId('film-time').innerText()
  await page.waitForTimeout(1200)
  expect(await page.getByTestId('film-time').innerText()).toBe(t1) // paused
  // scene navigation with the arrow key
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('film-scene')).toContainText('Meet Noé')
  // dialogue carries a speaker label
  await seek(page, 37)
  await expect(page.getByTestId('caption')).toContainText('Noé')
  await expect(page.getByTestId('caption')).toContainText('nothing important is missed')
  await seek(page, 44)
  await expect(page.getByTestId('caption')).toContainText('Dr. Salizar')
  // captions toggle
  await page.keyboard.press('c')
  await expect(page.getByTestId('caption')).toBeHidden()
  await page.keyboard.press('c')
  await expect(page.getByTestId('caption')).toBeVisible()
  expect(errors).toEqual([])
})

test('key frames render real content and match the storyboard', async ({ page }) => {
  mkdirSync(SHOTS_DIR, { recursive: true })
  const errors = await open(page, '?preserve=1&t=0.1')
  await expect(page.getByTestId('film-canvas')).toBeVisible()
  const frames: [number, string, RegExp | null][] = [
    [8, '01-hospital-exterior', /Every day/],
    [13.8, '02-through-window', /Each one/],
    [22, '03-meet-noe', /He works weekends/],
    [32.5, '04-noe-concern', /How does anyone/],
    [39, '05-the-question', /nothing important/],
    [48.8, '06-screen-dive', null],
    [62, '07-radiologyml-panels', /Instead of examining/],
    [74.5, '08-pixels-rise', /begins as numbers/],
    [80, '09-numbers-patch', /During training/],
    [84, '10-feature-maps', /During training/],
    [92.5, '11-prediction-vs-label', /may become/],
    [99, '12-possible-finding', /make mistakes/],
    [110, '13-correction-loop', /validation/],
    [119, '14-flagged-for-review', /flags an unusual/],
    [126, '15-specialist', /specialist/],
    [150, '16-data-landscape', /recognize patterns/],
    [164, '17-ml-reveal', null],
  ]
  for (const [t, name, caption] of frames) {
    await seek(page, t)
    await page.waitForTimeout(900)
    if (caption) await expect(page.getByTestId('caption'), `caption at ${t}s`).toContainText(caption)
    const st = await canvasStats(page)
    expect(st.sd, `frame ${name} is not blank`).toBeGreaterThan(6)
    await page.screenshot({ path: `${SHOTS_DIR}/${name}.png` })
  }
  await seek(page, 171)
  await expect(page.getByTestId('hub')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOTS_DIR}/18-inside-machine-learning.png` })
  expect(errors).toEqual([])
})

test('skip lands on Inside Machine Learning and opens the real K-Means lab', async ({ page }) => {
  const errors = await open(page)
  await page.getByTestId('film-skip-start').click()
  const hub = page.getByTestId('hub')
  await expect(hub).toBeVisible()
  await expect(hub).toContainText('INSIDE MACHINE LEARNING')
  for (const p of ['classification', 'clustering', 'regression', 'model-evaluation']) await expect(page.getByTestId('path-' + p)).toBeVisible()
  const sim = page.waitForResponse((r) => r.url().includes('/api/v1/simulations/kmeans') && r.request().method() === 'POST')
  await page.getByTestId('path-clustering').click()
  await expect(page).toHaveURL(/\/lessons\/kmeans-iris\?from=film/)
  expect((await sim).ok()).toBe(true)
  // from the film, the lesson starts immediately (no start screen) and plays
  await expect(page.getByTestId('begin')).toBeHidden()
  await expect(page.getByTestId('scene-title')).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})
