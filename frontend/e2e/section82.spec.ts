import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 8.2, in source order. Numbers on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')

test('Section 8.2: three steps in the machine-learning process', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const fit = await (await request.get('http://localhost:8000/api/v1/concepts/analyze-and-produce')).json()
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`section-8-2\\?step=${n}$`))

  await page.goto('/presentation/section-8-2?step=0')
  await expect(page.getByTestId('section-82')).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, '31-s82-intro')

  // 1 supervised vs unsupervised (real K-Means groups) + problem sort
  await right(page); await step(1)
  await expect(page.getByTestId('su-definition')).toContainText('response variable has been identified')
  await page.waitForTimeout(800)
  await shot(page, '32-s82-supervised')
  await right(page) // → unsupervised
  await expect(page.getByTestId('su-definition')).toContainText('No response variable')
  await right(page) // → groups found
  await expect(page.getByTestId('su-caption')).toContainText('K-Means')
  for (const [i, s] of [[0, 's'], [1, 'u'], [2, 's'], [3, 'u'], [4, 's'], [5, 'u']] as const) await page.getByTestId(`prob-${i}-${s}`).click()
  await right(page) // → check
  await expect(page.getByTestId('prob-score')).toHaveText('6 / 6 correct')
  await page.waitForTimeout(900)
  await shot(page, '33-s82-unsupervised-groups')

  // 2 recipe
  await right(page); await step(2)
  await expect(page.getByTestId('m-recipe')).toBeVisible()
  await page.getByTestId('recipe-scrub').evaluate((el) => { const i = el as HTMLInputElement; i.value = '0.9'; i.dispatchEvent(new Event('input', { bubbles: true })) })
  await shot(page, '34-s82-recipe')
  await right(page) // completes the animation

  // 3 RadiologyML loop: → reveals stages
  await right(page); await step(3)
  for (let k = 0; k < 5; k++) await right(page)
  await expect(page.getByTestId('radiology-detail')).toContainText('Validate, then use')
  await shot(page, '35-s82-radiology')

  // 4 three steps
  await right(page); await step(4)
  await expect(page.getByTestId('three-steps')).toContainText('Produce model-based results')
  await shot(page, '36-s82-three-steps')

  // 5 ingest
  await right(page); await step(5)
  for (const [i, s] of [[0, 's'], [1, 'u'], [2, 'u'], [3, 's'], [4, 'u'], [5, 'u'], [6, 's'], [7, 's']] as const) await page.getByTestId(`ing-${i}-${s}`).click()
  await right(page) // → feed in
  await expect(page.getByTestId('ing-score')).toHaveText('8 / 8 sorted correctly')
  await page.waitForTimeout(900)
  await shot(page, '37-s82-ingest')

  // 6 tidy data
  await right(page); await step(6)
  await page.getByTestId('make-tidy').click()
  await expect(page.getByTestId('tidy-state')).toContainText('Tidy')
  await page.waitForTimeout(1200)
  await shot(page, '38-s82-tidy')

  // 7 Tesla
  await right(page); await step(7)
  await expect(page.getByTestId('m-tesla')).toBeVisible()
  await page.waitForTimeout(1200)
  await shot(page, '39-s82-tesla')

  // 8 analyze: gradient descent from the backend
  await right(page); await step(8)
  await page.getByTestId('gd-scrub').evaluate((el) => { const i = el as HTMLInputElement; i.value = '0.12'; i.dispatchEvent(new Event('input', { bubbles: true })) })
  await expect(page.getByTestId('gd-done')).toHaveCount(0)
  await shot(page, '40-s82-analyze-fitting')
  await right(page) // completes the fit
  await expect(page.getByTestId('gd-done')).toContainText(`${fit.ols.b}`)
  await expect(page.getByTestId('gd-iteration')).toHaveText(fit.frames.at(-1).iteration.toLocaleString('en'))
  await shot(page, '41-s82-analyze-done')

  // 9 produce results: predictions from the backend
  await right(page); await step(9)
  await right(page) // completes the flow
  for (let k = 0; k < fit.new_data.length; k++) await expect(page.getByTestId(`pred-${k}`)).toHaveText(`ŷ = ${fit.new_data[k].prediction}`)
  await right(page) // → automate actions
  await expect(page.getByTestId('act-cards')).toBeVisible()
  await shot(page, '42-s82-produce')

  // 10 Mental Wellness Assistant
  await right(page); await step(10)
  const lanes: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3 }
  for (const [n, l] of Object.entries(lanes)) await page.getByTestId(`well-${n}-${l}`).click()
  await right(page) // → check
  await expect(page.getByTestId('well-score')).toHaveText('9 / 9 correct')
  await page.waitForTimeout(900)
  await shot(page, '43-s82-wellness')

  // the section ends on Try It Yourself (no summary step): → goes on to 8.3
  void fit
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/section-8-3/)

  // the section label has no page numbers, and the three-step boxes are all the same size (intro and step 4)
  for (const s of [0, 4]) {
    await page.goto(`/presentation/section-8-2?step=${s}`)
    await expect(page.locator('.kicker').first()).toHaveText('Section 8.2')
    const boxes = await page.getByTestId('three-steps').first().locator('.step').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }))
    expect(boxes).toHaveLength(3)
    for (const b of boxes) { expect(Math.abs(b[0] - boxes[0][0])).toBeLessThanOrEqual(1); expect(Math.abs(b[1] - boxes[0][1])).toBeLessThanOrEqual(1) }
  }
  await expect(page.locator('main.stage')).not.toContainText('DS4A p.')
  expect(errors).toEqual([])
})
