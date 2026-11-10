import { SHOW_EXTRA_PAGES } from '../src/features'
import { expect, test, type Page } from '@playwright/test'

/** Values shown in the UI are compared with the JSON the FastAPI backend actually returned. */
async function openLesson(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const simResp = page.waitForResponse((r) => r.url().includes('/api/v1/simulations/kmeans') && r.request().method() === 'POST')
  const irisResp = page.waitForResponse((r) => r.url().endsWith('/api/v1/datasets/iris'))
  await page.goto('/lessons/kmeans-iris')
  const sim = await (await simResp).json()
  const iris = await (await irisResp).json()
  await expect(page.getByTestId('begin')).toBeVisible()
  return { sim, iris, errors }
}
const time = async (page: Page) => {
  const [cur] = (await page.getByTestId('time').innerText()).split('/')
  const [m, s] = cur.trim().split(':').map(Number)
  return m * 60 + s
}
async function seek(page: Page, t: number) {
  await page.getByTestId('scrubber').evaluate((el, v) => {
    const input = el as HTMLInputElement
    input.value = String(v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, t)
}
const scrubValue = (page: Page) => page.getByTestId('scrubber').evaluate((el) => +(el as HTMLInputElement).value)

test('loads the real Iris dataset and a real K-Means trace from FastAPI', async ({ page }) => {
  const { sim, iris, errors } = await openLesson(page)
  expect(iris.n).toBe(150)
  expect(sim.trace.n).toBe(150)
  expect(sim.trace.iterations.length).toBeGreaterThan(1)
  expect(sim.trace.iterations[0].distances[0]).toHaveLength(sim.trace.k)
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('play, pause, next, previous and restart drive the shared timeline', async ({ page }) => {
  await openLesson(page)
  await page.getByTestId('begin').click()
  await expect.poll(() => time(page), { timeout: 8000 }).toBeGreaterThanOrEqual(2)
  await page.getByTestId('play').click()                       // pause
  const paused = await scrubValue(page)
  await page.waitForTimeout(800)
  expect(await scrubValue(page)).toBeCloseTo(paused, 1)
  const before = await page.getByTestId('step-label').innerText()
  await page.getByTestId('next').click()
  await expect(page.getByTestId('step-label')).not.toHaveText(before)
  const afterNext = await scrubValue(page)
  await page.getByTestId('prev').click()
  expect(await scrubValue(page)).toBeLessThan(afterNext)
  await page.getByRole('button', { name: /3\. Initialize centroids/ }).click()
  const sceneStart = await scrubValue(page)
  await seek(page, sceneStart + 3)
  await page.getByTestId('restart').click()
  expect(await scrubValue(page)).toBeCloseTo(sceneStart, 2)
})

test('keyboard shortcuts and Story → Explore keep the position', async ({ page }) => {
  await openLesson(page)
  await page.getByTestId('begin').click()
  await page.keyboard.press('Space')                          // pause
  await seek(page, 40)
  const t0 = await scrubValue(page)
  await page.keyboard.press('e')
  await expect(page.getByTestId('mode-lab')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('lab-panel')).toBeVisible()
  expect(await scrubValue(page)).toBeCloseTo(t0, 2)
  await page.keyboard.press('e')
  await expect(page.getByTestId('mode-story')).toHaveAttribute('aria-selected', 'true')
  expect(await scrubValue(page)).toBeCloseTo(t0, 2)
  await page.keyboard.press('m')
  await expect(page.getByTestId('mode-math')).toHaveAttribute('aria-selected', 'true')
  const label = await page.getByTestId('step-label').innerText()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('step-label')).not.toHaveText(label)
})

test('the distance calculation shows the distances the backend computed', async ({ page }) => {
  const { sim } = await openLesson(page)
  await page.getByRole('button', { name: /4\. Distance calculation/ }).click()
  const start = await scrubValue(page)
  await seek(page, start + 7)                                  // past the √ stage of the first worked example
  const panel = page.getByTestId('math-panel')
  const flower = Number((await panel.innerText()).match(/Flower #(\d+)/)![1]) - 1
  const dists: number[] = sim.trace.iterations[0].distances[flower]
  for (const d of dists) await expect(panel).toContainText(Number(d.toFixed(4)).toString())
  const nearest = sim.trace.iterations[0].labels[flower]
  await expect(panel).toContainText(`This flower joins cluster ${nearest + 1}`)
})

test('changing K in Explore re-runs K-Means on the server and rebuilds the lesson', async ({ page }) => {
  await openLesson(page)
  await page.getByTestId('mode-lab').click()
  await page.getByTestId('k-slider').fill('2')
  const resp = page.waitForResponse((r) => r.url().includes('/simulations/kmeans') && r.request().method() === 'POST')
  await page.getByTestId('run').click()
  const sim = await (await resp).json()
  expect(sim.config.k).toBe(2)
  expect(sim.trace.final_centroids).toHaveLength(2)
  await expect(page.getByTestId('step-label')).toHaveText('Choose K = 2')
  await expect(page.getByTestId('math-panel')).toContainText('K = 2')
  // the results crosstab has one column per cluster and sums to 150
  await seek(page, await page.getByTestId('scrubber').evaluate((el) => +(el as HTMLInputElement).max - 1))
  const cells = await page.getByTestId('crosstab').locator('tbody td.text-right').allInnerTexts()
  expect(cells).toHaveLength(3 * 2)
  expect(cells.map(Number).reduce((a, b) => a + b, 0)).toBe(150)
})

// the classic lab is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES): this regression check applies when the extra pages are shown
test('the classic lab still works (regression)', async ({ page }) => {
  test.skip(!SHOW_EXTRA_PAGES, 'classic lab hidden')
  await page.goto('/exercises/ds4a-ac7')
  await page.getByRole('tab', { name: /Solve step by step/ }).click()
  await expect(page.getByText('0.68', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: /Cinematic: K-Means/ })).toBeVisible()
})
