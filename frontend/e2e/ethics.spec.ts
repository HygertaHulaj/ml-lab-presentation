import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Ethics in Practice, in source order. The measured numbers on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')
const pct = (v: number) => `${(v * 100).toFixed(1)} %`

test('Ethics in practice: social justice in data science', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const ev = await (await request.get('http://localhost:8000/api/v1/concepts/ethics', { timeout: 60_000 })).json()
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`/ethics\\?step=${n}$`))

  await page.goto('/presentation/ethics?step=0')
  await expect(page.getByTestId('section-ethics')).toBeVisible()
  await page.waitForTimeout(1200); await shot(page, '130-eth-intro')

  // 1 where bias enters: → reveals the bias list
  await right(page); await step(1)
  await expect(page.getByTestId('ethics-biases')).toHaveClass(/hide/)
  await right(page)
  await expect(page.getByTestId('ethics-biases')).not.toHaveClass(/hide/)
  await page.waitForTimeout(600); await shot(page, '131-eth-challenges')

  // 2 facial recognition: → the cited measurement
  await right(page); await step(2)
  await right(page)
  await expect(page.getByTestId('ethics-gendershades')).toContainText('34.7 %')
  await page.waitForTimeout(600); await shot(page, '132-eth-faces')

  // 3 the mechanism, measured: the slider moves through the backend's sweep
  await right(page); await step(3)
  const at5 = ev.sweep.find((s: { n_minority: number }) => s.n_minority === ev.mitigation.n_minority)
  await expect(page.getByTestId('rd-min')).toHaveText(pct(at5.minority_error))
  await expect(page.getByTestId('rd-maj')).toHaveText(pct(at5.majority_error))
  await expect(page.getByTestId('rd-acc')).toHaveText(pct(at5.overall_accuracy))
  await page.waitForTimeout(500); await shot(page, '133-eth-mechanism')
  await page.getByTestId('rd-slider').fill('0')
  await expect(page.getByTestId('rd-min')).toHaveText(pct(ev.sweep[0].minority_error))
  await page.getByTestId('rd-slider').fill(String(ev.sweep.length - 1))
  await expect(page.getByTestId('rd-k')).toHaveText(String(ev.train_counts.Chinstrap))
  await page.getByTestId('rd-slider').blur()

  // 4 policing: → builds the chain
  await right(page); await step(4)
  for (let k = 0; k < 4; k++) await right(page)
  await expect(page.getByTestId('ethics-chain-4')).not.toHaveClass(/hide/)
  await page.waitForTimeout(600); await shot(page, '134-eth-police')

  // 5 mitigation: → the reweighted model
  await right(page); await step(5)
  await right(page)
  await expect(page.getByTestId('md-row-1')).toContainText(pct(ev.mitigation.after_reweighting.minority_error))
  await expect(page.getByTestId('md-row-0')).toContainText(pct(ev.mitigation.before.minority_error))
  await page.waitForTimeout(700); await shot(page, '135-eth-mitigation')

  // 6 benefits, 7 college admissions (→ the caveat), 8 discussion, 9 summary
  await right(page); await step(6)
  await page.waitForTimeout(800); await shot(page, '136-eth-benefits')
  await right(page); await step(7)
  await right(page)
  await expect(page.getByTestId('ethics-college-note')).not.toHaveClass(/hide/)
  await page.waitForTimeout(600); await shot(page, '137-eth-college')
  await right(page); await step(8)
  await expect(page.getByTestId('m-discussion')).toBeVisible()
  await page.waitForTimeout(500); await shot(page, '138-eth-discussion')
  await right(page); await step(9)
  await expect(page.getByTestId('ethics-summary')).toBeVisible()
  await page.waitForTimeout(1000); await shot(page, '139-eth-summary')
  // the answer/"Next" box was removed (presenter's choice, 9 Nov)
  await expect(page.getByTestId('section-bridge')).toHaveCount(0)
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/conclusion/)
  expect(errors).toEqual([])
})
