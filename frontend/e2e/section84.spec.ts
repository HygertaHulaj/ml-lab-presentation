import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 8.4, in source order. Every number on screen must equal the backend's, and Table 8.3 must be reproduced. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const key = (o: string) => o.replace(/\W+/g, '').toLowerCase()

test('Section 8.4: machine learning method evaluation', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const ev = await (await request.get('http://localhost:8000/api/v1/concepts/evaluation')).json()
  const m = ev.classification.metrics
  expect({ tp: m.tp, fp: m.fp, fn: m.fn, tn: m.tn }).toEqual({ tp: 22, fp: 11, fn: 11, tn: 37 })
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`section-8-4\\?step=${n}$`))

  await page.goto('/presentation/section-8-4?step=0')
  await expect(page.getByTestId('section-84')).toBeVisible()
  await page.waitForTimeout(1400)
  await shot(page, '80-s84-intro')

  // 1 validation: → splits the 400 stores
  await right(page); await step(1)
  await right(page); await page.waitForTimeout(3000)
  await expect(page.getByTestId('vs-ratio')).toContainText(`${ev.classification.n_train} / ${ev.classification.n_test}`)
  await shot(page, '81-s84-validation')

  // 2 accuracy: → reveals the 81 predictions
  await right(page); await step(2)
  await right(page); await page.waitForTimeout(4400)
  await expect(page.getByTestId('ts-correct')).toContainText(`${m.tp + m.tn}`)
  await expect(page.getByTestId('ts-accuracy')).toHaveText(pct(m.accuracy))
  await shot(page, '82-s84-accuracy')

  // 3 two kinds of mistakes: → reveals TP, FP, TN, FN, then the point
  await right(page); await step(3)
  for (let k = 0; k < 4; k++) await right(page)
  await expect(page.getByTestId('mt-point')).not.toHaveClass(/hide/)
  await shot(page, '83-s84-mistakes')

  // 4 confusion matrix: the 81 stores fly into the cells; identical to Table 8.3
  await right(page); await step(4)
  await right(page); await page.waitForTimeout(3300)
  for (const c of ['tp', 'fp', 'fn', 'tn']) await expect(page.getByTestId(`ts-${c}`)).toHaveText(String(m[c]))
  await expect(page.getByTestId('ts-match')).toContainText('identical to Table 8.3')
  await shot(page, '84-s84-matrix')

  // 5 metrics: → cycles accuracy, precision, recall, specificity
  await right(page); await step(5)
  for (const k of ['accuracy', 'precision', 'recall', 'specificity']) {
    await expect(page.getByTestId('me-value')).toHaveText(`= ${m[k].toFixed(2)}`)
    if (k === 'precision') await shot(page, '85-s84-metrics')
    if (k !== 'specificity') await right(page)
  }

  // 6 try it: compute the metrics
  await right(page); await step(6)
  for (const [i, k] of ['accuracy', 'precision', 'recall', 'specificity'].entries()) await page.getByTestId(`metricquiz-${i}-${key(m[k].toFixed(2))}`).click()
  await right(page)
  await expect(page.getByTestId('metricquiz-score')).toHaveText('4 / 4 correct')
  await shot(page, '86-s84-metricquiz')

  // 7 regression: points → residuals → MSE and R²
  await right(page); await step(7)
  await right(page); await right(page)
  await expect(page.getByTestId('re-mse')).toHaveText(ev.regression.test.mse.toFixed(2))
  await expect(page.getByTestId('re-r2')).toHaveText(ev.regression.test.r2.toFixed(2))
  await page.waitForTimeout(800)
  await shot(page, '87-s84-regression')

  // 8 No Free Lunch: a different winner per problem
  await right(page); await step(8)
  await right(page); await right(page)
  for (const [i, p] of ev.no_free_lunch.entries()) await expect(page.getByTestId(`nfl-best-${i}`)).toContainText(p.best)
  await page.waitForTimeout(600)
  await shot(page, '88-s84-nfl')

  // 9 cookies
  await right(page); await step(9)
  await expect(page.getByTestId('m-cookies')).toBeVisible()
  await page.waitForTimeout(900)
  await shot(page, '89-s84-cookies')

  // 10 Fig. 8.17: truth → gold → green → blue; the slider shows any model's MSE
  await right(page); await step(10)
  for (let k = 0; k < 3; k++) await right(page)
  await expect(page.getByTestId('fc-caption')).toContainText('Fig. 8.21')
  const blue = ev.fit_curve.models[1]
  await expect(page.getByTestId('fc-blue')).toContainText(`test ${blue.test_mse.toFixed(2)}`)
  await page.waitForTimeout(700)
  await shot(page, '90-s84-fitcurve')
  await page.getByTestId('fc-slider').fill('23')
  const s23 = ev.fit_curve.sweep.find((s: { complexity: number }) => s.complexity === 23)
  await expect(page.getByTestId('fc-custom-test')).toHaveText(s23.test_mse.toFixed(2))
  await page.getByTestId('fc-slider').blur()

  // 11 real data: depth sweep
  await right(page); await step(11)
  for (let k = 0; k < 3; k++) await right(page)
  const best = ev.depth_sweep.find((r: { depth: number }) => r.depth === ev.depth_selection.selected_depth)
  await expect(page.getByTestId('ds-mark-1')).toContainText(`depth ${best.depth}`)
  await expect(page.getByTestId('ds-mark-1')).toContainText(pct(best.test_accuracy))
  await page.waitForTimeout(500)
  await shot(page, '91-s84-depth')

  // 12 try it: three models
  await right(page); await step(12)
  const cells = ['Predicted = 1, Actual = 1', 'Predicted = 0, Actual = 0', 'Predicted = 1, Actual = 0', 'Predicted = 0, Actual = 1']
  for (const [i, c] of cells.entries()) await page.getByTestId(`fitex-${i}-${key(c)}`).click()
  for (const [i, mm] of ev.fit_exercise.entries()) await page.getByTestId(`fitex-${4 + i}-${key(mm.verdict)}`).click()
  await right(page)
  await expect(page.getByTestId('fitex-score')).toHaveText('7 / 7 correct')
  await expect(page.getByTestId('fx-acc-1-testing')).toHaveText('accuracy 0.42')
  await expect(page.getByTestId('fx-acc-2-training')).toHaveText('accuracy 0.70')
  await page.waitForTimeout(600)
  await shot(page, '92-s84-fitexercise')

  // 13 back to the movies: fitted versus held-out, with the class's movie
  await right(page); await step(13)
  const ho = await (await request.get('http://localhost:8000/api/v1/concepts/movie-holdout')).json()
  await expect(page.getByTestId('movies-holdout-table')).toBeVisible()
  await expect(page.getByTestId('holdout-budget')).toContainText(ho.models[0].fitted_r2_all.toFixed(3))
  await right(page); await right(page)
  await expect(page.getByTestId('holdout-budget')).toContainText(ho.models[0].test_r2.toFixed(3))
  await expect(page.getByTestId('movies-return-spread')).toContainText(ho.budget_test_r2_over_seeds.median.toFixed(3))
  await page.waitForTimeout(500)
  await shot(page, '925-s84-movies-return')

  // 14 summary, then on to 8.5
  await right(page); await step(14)
  await expect(page.getByTestId('s84-summary')).toBeVisible()
  await page.waitForTimeout(1000)
  await shot(page, '93-s84-summary')
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/section-8-5/)
  expect(errors).toEqual([])
})
