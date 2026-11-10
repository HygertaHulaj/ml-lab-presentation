import { expect, test, type Page } from '@playwright/test'

/**
 * The Movies worked example inside the presentation (audit C3, §7): one shell, numbers from the backend, the class's
 * movie carried into Section 8.4's held-out check, and the 3D lesson returning to the presentation.
 */
const API = 'http://localhost:8000/api/v1'
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })

test('Worked example: movies, from question to evidence, then into Section 8.4', async ({ page, request }) => {
  test.setTimeout(150_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const man = await (await request.get(`${API}/lessons/shah-8-4-movies`)).json()
  const [a, c] = await Promise.all(man.parts.map(async (p: { config: unknown }) => (await (await request.post(`${API}/simulations/linreg-gd`, { data: p.config })).json()).trace))
  const ho = await (await request.get(`${API}/concepts/movie-holdout`)).json()
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`worked-example-movies\\?step=${n}$`))
  const right = async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250) }

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/presentation/worked-example-movies?step=0')
  await expect(page.getByTestId('section-movies')).toBeVisible()
  await expect(page.getByTestId('movie-scatter')).toBeVisible()
  // the class picks the higher-budget example; it travels with them
  const pick = page.getByTestId('movie-pick-2')
  const picked = (await pick.locator('strong').textContent())!.trim()
  await pick.click()
  await page.waitForTimeout(600); await shot(page, '94-mv-question')

  await right(); await step(1)
  await page.getByTestId('movie-predict-1').click()

  await right(); await step(2)
  const top = a.single_predictors[0]
  await expect(page.getByTestId('movie-ranks')).toContainText(`r = ${top.r.toFixed(3)}`)
  await page.waitForTimeout(500); await shot(page, '95-mv-predictor')

  await right(); await step(3)
  const i = c.points.labels.findIndex((l: string) => l === picked)
  await expect(page.getByTestId('movie-residual')).toContainText(c.diagnostics.residuals[i].toFixed(3))
  await expect(page.getByTestId('movie-residual')).toContainText(c.ols.fitted[i].toFixed(3))
  await page.waitForTimeout(500); await shot(page, '96-mv-error')

  await right(); await step(4)
  await expect(page.getByTestId('movie-jmin')).toHaveText(c.surface.minimum.cost.toFixed(3))

  await right(); await step(5)
  await expect(page.getByTestId('movie-iter')).toContainText('Iteration 0')
  for (let k = 0; k < 4; k++) await right()
  await step(5) // the beats stay inside the step
  await expect(page.getByTestId('movie-iter')).toContainText(`Iteration ${c.iterations_run}`)
  await expect(page.getByTestId('movie-bowl')).toBeVisible()
  await page.waitForTimeout(500); await shot(page, '97-mv-bowl')

  await right(); await step(6)
  await page.getByRole('button', { name: 'It could overshoot' }).click()
  await right() // → runs both learning rates on the backend
  await expect(page.getByTestId('movie-experiment')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('movie-experiment')).toContainText('α = 2.2')
  await page.waitForTimeout(500); await shot(page, '98-mv-experiment')

  await right(); await step(7)
  await expect(page.getByTestId('movie-evidence')).toContainText(c.ols.r2.toFixed(3))
  await expect(page.getByTestId('movie-evidence')).toContainText(a.models[1].adj_r2.toFixed(3))
  await expect(page.getByTestId('section-movies')).toContainText('in-sample')
  await expect(page.getByTestId('section-bridge-next')).toContainText('new ones')
  await page.waitForTimeout(500); await shot(page, '99-mv-evidence')

  await right()
  await expect(page).toHaveURL(/\/presentation\/section-8-4\?step=0/)
  // the held-out beat in 8.4 remembers the class's movie
  await page.goto('/presentation/section-8-4?step=13')
  await page.getByTestId('movies-holdout-table').waitFor()
  await right(); await right()
  const m = ho.movies.find((x: { label: string }) => x.label === picked)
  await expect(page.getByTestId('movies-return-selected')).toContainText(picked)
  await expect(page.getByTestId('movies-return-selected')).toContainText(m.budget_prediction.toFixed(3))
  expect(errors).toEqual([])
})

test('the optional 3D lesson opens inside the presentation and closes back to the same step', async ({ page }) => {
  await page.goto('/presentation/worked-example-movies?step=7')
  await page.getByTestId('embed-shah-8-4-movies').click()
  await expect(page.getByTestId('embed-layer')).toBeVisible()
  await expect(page.getByTestId('stage')).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/worked-example-movies\?step=7/) // no route change
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('embed-layer')).toHaveCount(0)
  await expect(page.getByTestId('movie-evidence')).toBeVisible()
  // an activity embeds the same way; its own keys work, the presentation's do not fire underneath
  await page.getByTestId('embed-hoids-hop8-4').click()
  await expect(page.getByTestId('activity-player')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/worked-example-movies\?step=7/)
  await page.getByTestId('embed-close').click()
  await expect(page.getByTestId('embed-layer')).toHaveCount(0)
})

test('standalone lessons still honour a return link', async ({ page }) => {
  await page.goto('/lessons/shah-8-4-movies?return=%2Fpresentation%2Fsection-8-4')
  await expect(page.getByTestId('lesson-back')).toHaveAttribute('href', '/presentation/section-8-4')
})
