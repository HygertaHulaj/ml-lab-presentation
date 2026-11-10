import { expect, test } from '@playwright/test'
import { SHOW_EXTRA_PAGES } from '../src/features'

/**
 * Shah Ch. 8 cinematic lessons (regression / gradient descent): each loads its real traces, plays with subtitles,
 * shows the backend's numbers in Math mode, and Explore re-runs gradient descent on the server (α too large → diverged).
 */
const API = 'http://localhost:8000/api/v1'
const LESSONS = ['shah-8-1-restaurants', 'shah-8-2-airlines', 'shah-8-3-rock', 'shah-8-4-movies']
test.use({ viewport: { width: 1600, height: 900 } })
test.describe.configure({ timeout: 180_000 })

for (const id of LESSONS) {
  test(`${id}: story plays, Math shows the backend's numbers`, async ({ page, request }) => {
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    const man = await (await request.get(`${API}/lessons/${id}`)).json()
    const last = man.parts[man.parts.length - 1]
    const tr = (await (await request.post(`${API}/simulations/linreg-gd`, { data: last.config })).json()).trace

    await page.goto(`/lessons/${id}`)
    await expect(page.getByTestId('begin')).toBeVisible()
    await page.getByTestId('begin').click()
    await expect(page.getByTestId('subtitle')).toBeVisible()
    await expect(page.getByTestId('time')).not.toHaveText(/^0:00 \//, { timeout: 15_000 }) // the playhead moves
    await page.keyboard.press(' ') // pause

    // jump to the last part's "read" scene: the descent is over, the final frame and least squares are shown
    const chips = page.locator('footer .chips button')
    const titles = await chips.allTextContents()
    const readIdx = titles.map((t, i) => [t, i] as const).filter(([t]) => /Reading the plane|Reading the line/.test(t)).at(-1)![1]
    await chips.nth(readIdx).click()
    await page.getByTestId('mode-math').click()
    await expect(page.getByTestId('gd-math')).toBeVisible()
    await expect(page.getByTestId('gd-iter')).toHaveText(String(tr.iterations_run))
    await expect(page.getByTestId('gd-compare')).toBeVisible()
    await expect(page.getByTestId('gd-r2')).toHaveText(tr.ols.r2.toFixed(3))
    expect(errs).toEqual([])
  })
}

test('Explore: a learning rate that is too large diverges; the book\'s run converges again', async ({ page }) => {
  await page.goto('/lessons/shah-8-4-movies')
  await page.getByTestId('begin').click()
  await page.keyboard.press(' ')
  await page.getByTestId('mode-lab').click()
  await expect(page.getByTestId('gd-lab')).toBeVisible()
  await page.getByTestId('gd-lab-part').selectOption({ index: 1 })
  await page.getByTestId('gd-lab-lr').fill('2.2')
  await page.getByTestId('gd-lab-run').click()
  await expect(page.getByTestId('gd-lab-result')).toContainText('diverged')
  await page.getByRole('button', { name: "Book's run" }).click()
  await expect(page.getByTestId('gd-lab-result')).toContainText('converged')
  await expect(page.getByTestId('gd-lab-result')).toContainText('α = 0.1')
})

test('K-Means still opens through the same lesson route', async ({ page }) => {
  await page.goto('/lessons/kmeans-iris')
  await expect(page.getByTestId('begin')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('K-Means: discovering groups in Iris flowers')
})

test('the 3D lessons are linked from the activities hub, each activity and the Exercise Academy', async ({ page }) => {
  await page.goto('/activities')
  await page.getByTestId('hub-lesson-shah-8-3-rock').click()
  await expect(page).toHaveURL(/\/lessons\/shah-8-3-rock$/)
  await expect(page.getByTestId('begin')).toBeVisible()
  await page.goto('/activities/hoids-hop8-4')
  await page.getByTestId('ap-lesson').click()
  await expect(page).toHaveURL(/\/lessons\/shah-8-4-movies$/)
  // the Exercise Academy is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES); its link is checked when it is shown
  if (!SHOW_EXTRA_PAGES) return
  await page.goto('/exercises/hoids-hop8-2')
  await page.getByTestId('exercise-lesson').click()
  await expect(page).toHaveURL(/\/lessons\/shah-8-2-airlines$/)
})
