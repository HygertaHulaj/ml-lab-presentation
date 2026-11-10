import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 8.6, in source order. Every measured number on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')
const pct1 = (v: number) => `${(v * 100).toFixed(1)} %`
const key = (o: string) => o.replace(/\W+/g, '').toLowerCase()

test('Section 8.6: use high-quality data', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const dq = await (await request.get('http://localhost:8000/api/v1/concepts/data-quality', { timeout: 60_000 })).json()
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`section-8-6\\?step=${n}$`))

  await page.goto('/presentation/section-8-6?step=0')
  await expect(page.getByTestId('section-86')).toBeVisible()
  await page.waitForTimeout(1200)
  await shot(page, '120-s86-intro')

  // 1 freshness: the drop, then retraining
  await right(page); await step(1)
  await expect(page.getByTestId('m-fresh')).toBeVisible()
  await right(page); await right(page)
  await expect(page.getByTestId('fd-bar-1')).toContainText(pct1(dq.freshness.retraining[0].accuracy_new_scanner))
  await expect(page.getByTestId('fd-bar-4')).toContainText(pct1(dq.freshness.retraining[3].accuracy_new_scanner))
  await page.waitForTimeout(700); await shot(page, '121-s86-freshness')

  // 2 volume
  await right(page); await step(2)
  await expect(page.getByTestId('m-volume')).toContainText(pct1(dq.volume[dq.volume.length - 1].accuracy))
  await page.waitForTimeout(500); await shot(page, '122-s86-volume')

  // 3 diversity: one island never sees a Chinstrap
  await right(page); await step(3)
  await right(page); await right(page)
  await expect(page.getByTestId('dv-0-Chinstrap')).toHaveText('0 %')
  await expect(page.getByTestId('dv-1-Chinstrap')).toHaveText(`${Math.round(dq.diversity.models[1].recall.Chinstrap * 100)} %`)
  await page.waitForTimeout(700); await shot(page, '123-s86-diversity')

  // 4 quality: resolution, then wrong labels
  await right(page); await step(4)
  for (const r of dq.quality.resolution) await expect(page.getByTestId(`qd-res-${r.side}`)).toContainText(pct1(r.accuracy))
  await right(page)
  await expect(page.getByTestId('qd-noise-4')).toContainText(pct1(dq.quality.label_noise[4].accuracy))
  await page.waitForTimeout(700); await shot(page, '124-s86-quality')

  // 5 representative data
  await right(page); await step(5)
  await expect(page.getByTestId('m-representative')).toBeVisible()
  await page.waitForTimeout(500); await shot(page, '125-s86-representative')

  // 6 practice
  await right(page); await step(6)
  const answers = ['Freshness', 'Diversity', 'Volume', 'Quality', 'Diversity', 'Quality']
  for (const [i, a] of answers.entries()) await page.getByTestId(`practice-${i}-${key(a)}`).click()
  await right(page)
  await expect(page.getByTestId('practice-score')).toHaveText('6 / 6 correct')
  await page.waitForTimeout(500); await shot(page, '126-s86-practice')

  // 7 summary, then the ethics section
  await right(page); await step(7)
  await expect(page.getByTestId('s86-summary')).toBeVisible()
  await page.waitForTimeout(1000); await shot(page, '127-s86-summary')
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/ethics/)
  expect(errors).toEqual([])
})
