import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 4: one real dataset through every stage; every number on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 150_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })

test('how ML works: collect, prepare, features, split, train, predict, evaluate', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const j = await (await request.get('http://localhost:8000/api/v1/concepts/learning-journey')).json()
  const pc = (v: number) => `${(v * 100).toFixed(1)} %`
  const set = (v: number) => page.getByTestId('journey-scrub').evaluate((el, x) => { const i = el as HTMLInputElement; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })) }, v)
  const section = page.getByTestId('section-learning')

  await page.goto('/presentation/how-learning-works?step=0')
  await expect(section).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, '22-journey-overview')

  await page.getByTestId('stage-collect').click()
  await expect(page).toHaveURL(/step=1/)
  await set(0.5)
  await shot(page, '23-journey-collect')
  await page.keyboard.press('ArrowRight') // completes the stage, stays
  await expect(page).toHaveURL(/step=1/)
  await page.keyboard.press('ArrowRight') // → prepare
  await expect(page.getByTestId('stage-lead')).toContainText(`leaving ${j.prepare.n_clean}`)
  await set(0.6)
  await shot(page, '24-journey-prepare-duplicate')
  await set(1)
  await expect(page.locator(`[data-id="${j.prepare.duplicates[0].removed}"]`)).toHaveAttribute('opacity', '0')

  await page.keyboard.press('ArrowRight') // → features
  await set(1)
  await expect(page.getByTestId('feature-scores')).toContainText('petal length')
  await shot(page, '25-journey-features')

  await page.keyboard.press('ArrowRight') // → split
  await expect(page.getByTestId('stage-lead')).toContainText(`(${j.split.test_ids.length})`)
  await set(1)
  await shot(page, '26-journey-split')

  await page.keyboard.press('ArrowRight') // → train
  await set(0.45)
  await expect(page.getByTestId('split-0')).toHaveAttribute('opacity', '1')
  await shot(page, '27-journey-train-first-split')
  await set(1)
  await expect(page.getByTestId('tree-diagram')).toContainText(`≤ ${j.model.splits[1].threshold}`)
  await shot(page, '28-journey-trained')
  await set(0.1) // reversible: the second split disappears again
  await expect(page.getByTestId('split-1')).toHaveAttribute('opacity', '0')
  await set(1)

  await page.keyboard.press('ArrowRight') // → predict
  await set(1)
  const wrong = j.predictions.find((p: { correct: boolean }) => !p.correct)
  await page.locator(`[data-id="${wrong.id}"]`).dispatchEvent('click')
  await expect(page.getByTestId('inspect')).toContainText(`actually ${wrong.truth}`)
  await page.getByTestId('journey-explain').click()
  await expect(page.getByTestId('explain')).toContainText('Inference')
  await shot(page, '29-journey-predict-inspect')

  await page.keyboard.press('ArrowRight') // → evaluate
  await set(1)
  await expect(page.getByTestId('test-accuracy')).toHaveText(pc(j.evaluation.test_accuracy))
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) await expect(page.getByTestId(`cm-${r}-${c}`)).toHaveText(String(j.evaluation.confusion[r][c]))
  await shot(page, '30-journey-evaluate')

  // controls: reset, speed, play
  await page.getByTestId('journey-reset').click()
  await expect(section).toHaveAttribute('data-progress', '0.000')
  await page.getByTestId('journey-speed').selectOption('2')
  await page.getByTestId('journey-play').click()
  await expect.poll(async () => Number(await section.getAttribute('data-progress'))).toBeGreaterThan(0.2)
  expect(errors).toEqual([])
})
