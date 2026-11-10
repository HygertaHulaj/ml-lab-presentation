import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** V2 presentation: shell navigation, the finished film, the pixel hand-off, and the AI section (real backend demo). */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 150_000 })
const SHOTS = '../docs/presentation-keyframes'

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  return errors
}
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }))

test('intro: start, the film plays, its last frame dissolves into data and the AI section begins', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/presentation')
  await expect(page).toHaveURL(/\/presentation\/intro/)
  await expect(page.getByTestId('start-presentation')).toBeVisible()
  await shot(page, '01-title')
  await page.getByTestId('start-presentation').click()
  const video = page.getByTestId('intro-video')
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.5)
  expect(await video.evaluate((v) => (v as HTMLVideoElement).duration)).toBeCloseTo(172, 0)
  await shot(page, '02-film')
  // jump to the end: the "ended" event starts the hand-off
  await video.evaluate((v) => { (v as HTMLVideoElement).currentTime = 170.8 })
  await expect(page.getByTestId('handoff')).toBeVisible({ timeout: 40_000 })
  await page.waitForTimeout(1500)
  await shot(page, '03-pixels-to-data')
  await expect(page).toHaveURL(/\/presentation\/ai\?step=0/, { timeout: 15_000 })
  await expect(page.getByTestId('ai-question')).toContainText('human intelligence')
  await page.waitForTimeout(1800)
  await shot(page, '04-ai-question')
  expect(errors).toEqual([])
})

test('AI section: tasks, nested fields with focus, rules vs learning on real data, and the exercise', async ({ page, request }) => {
  const errors = watchErrors(page)
  await page.goto('/presentation/ai?step=0')
  await expect(page.getByTestId('ai-question')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('task-vignettes')).toBeVisible()
  await expect(page).toHaveURL(/step=1/)
  await page.waitForTimeout(1500)
  await shot(page, '05-ai-tasks')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('field-definition')).toContainText('require or mimic human intelligence')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('field-definition')).toContainText('require or mimic human intelligence')
  await page.waitForTimeout(1200)
  await shot(page, '06-ai-field')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('field-definition')).toContainText('learning from data')
  await page.waitForTimeout(1600)
  await shot(page, '07-ml-field')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('field-definition')).toContainText('neural networks')
  await page.waitForTimeout(1600)
  await shot(page, '08-dl-field')
  // clicking another field refocuses it
  await page.locator('[data-field="ai"]').dispatchEvent('click')
  await expect(page.getByTestId('field-definition')).toContainText('require or mimic')

  // rules vs learning: values must equal the backend's
  const api = await (await request.get('http://localhost:8000/api/v1/concepts/rule-vs-learned', { params: { human_threshold: 5.5 } })).json()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('rules-vs-learning')).toBeVisible()
  await expect(page.getByTestId('score-human')).toContainText(`${(api.human.train_accuracy * 100).toFixed(1)} %`)
  await page.keyboard.press('ArrowRight') // → learn
  await expect(page.getByTestId('test-unseen')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('score-learned')).toContainText(`${(api.learned.train_accuracy * 100).toFixed(1)} %`)
  await shot(page, '09-rule-learned')
  await page.keyboard.press('ArrowRight') // → test on unseen flowers
  await expect(page.getByTestId('score-learned')).toContainText(`${(api.learned.test_accuracy * 100).toFixed(1)} %`)
  await expect(page.getByTestId('score-human')).toContainText(`${(api.human.test_accuracy * 100).toFixed(1)} %`)
  await page.waitForTimeout(900)
  await shot(page, '10-rule-tested')
  expect(page.url()).toMatch(/step=6/)

  // exercise
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('identify-ai')).toBeVisible()
  for (const k of ['email', 'google', 'autocorrect', 'plagiarism']) await page.getByTestId('quiz-' + k).click()
  await page.keyboard.press('ArrowRight') // → check
  await expect(page.getByTestId('quiz-score')).toHaveText('8 / 8 correct')
  await shot(page, '11-identify-ai')
  // → leaves the section
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/presentation\/machine-learning/)
  expect(errors).toEqual([])
})

test('shell: index, direct links, back across sections, persistence, reduced motion; extra pages hidden', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/presentation/ai?step=4')
  await expect(page.getByTestId('section-ai')).toBeVisible()
  await expect(page.getByTestId('field-definition')).toContainText('learning from data')
  await page.keyboard.press('i')
  const idx = page.getByTestId('section-index')
  await expect(idx).toBeVisible()
  await expect(idx).toContainText('Section 8.2: Three Steps in the Machine Learning Process')
  await expect(idx).not.toContainText('in development')
  await expect(idx).toContainText('80 min')
  await page.waitForTimeout(900)
  await shot(page, '12-section-index')
  // the classic lab is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES): no appendix in the index, and no link to the classic lab
  await expect(idx).not.toContainText('Algorithm Lab')
  await expect(idx).not.toContainText('classic ML Lab')
  await idx.getByRole('button', { name: /Recent Research/ }).click()
  await expect(page.getByTestId('section-research')).toBeVisible()
  // ← from the first step of a section goes to the last step of the previous one
  await page.goto('/presentation/machine-learning?step=0')
  await expect(page.getByTestId('ml-idea')).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(page).toHaveURL(/\/presentation\/ai\?step=7/)
  // settings persist across reloads
  await page.getByTestId('pres-reduced').click()
  await page.reload()
  await expect(page.getByTestId('pres-reduced')).toHaveAttribute('aria-pressed', 'true')
  // the classic lab is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES): / and any old address open the presentation
  await page.goto('/')
  await expect(page).toHaveURL(/\/presentation\/intro/)
  await page.goto('/exercises')
  await expect(page).toHaveURL(/\/presentation\/intro/)
  expect(errors).toEqual([])
})

test('machine learning: traditional programming vs training vs inference, with real samples and backend numbers', async ({ page, request }) => {
  const errors = watchErrors(page)
  const api = await (await request.get('http://localhost:8000/api/v1/concepts/rule-vs-learned', { params: { human_threshold: 5.5 } })).json()
  const pc = (v: number) => `${(v * 100).toFixed(1)} %`
  await page.goto('/presentation/machine-learning?step=0')
  await expect(page.getByTestId('ml-idea')).toContainText('instead of explicitly programming')
  await page.waitForTimeout(1500)
  await shot(page, '13-ml-idea')

  // 1 traditional: animation runs by itself; capture mid-flight, then → completes it
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('lane-traditional')).toBeVisible()
  const scrub = page.getByTestId('ml-scrub')
  const set = (v: number) => scrub.evaluate((el, x) => { const i = el as HTMLInputElement; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })) }, v)
  await set(0.5) // pauses mid-flight (deterministic frame)
  await shot(page, '14-ml-traditional-flow')
  await page.keyboard.press('ArrowRight') // completes the animation, stays on the step
  await expect(page.getByTestId('result-traditional')).toContainText(pc(api.human.test_accuracy))
  expect(page.url()).toMatch(/step=1/)
  await shot(page, '15-ml-traditional-result')

  // 2 training: scrub is reversible (mid = still searching, end = best rule)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('lane-training')).toBeVisible()
  await set(0.5)
  await expect(page.getByTestId('scan-candidate')).toContainText('trying')
  await shot(page, '16-ml-training-search')
  await set(1)
  await expect(page.getByTestId('trained-model')).toContainText(`${api.learned.threshold.toFixed(2)} cm`)
  await shot(page, '17-ml-trained-model')
  await set(0.3)
  await expect(page.getByTestId('trained-model')).toHaveCount(0)
  await page.keyboard.press('ArrowRight') // paused mid-way: → first completes the training
  await expect(page.getByTestId('trained-model')).toBeVisible()

  // 3 inference
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('lane-inference')).toBeVisible()
  await set(0.6)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('result-inference')).toContainText(pc(api.learned.test_accuracy))
  await shot(page, '18-ml-inference')

  // 4 side by side (synchronised)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('lane-traditional')).toBeVisible()
  await set(0.3)
  await expect(page.getByTestId('lane-training')).toBeVisible()
  await shot(page, '19-ml-compare-training')
  await set(1)
  await expect(page.getByTestId('lane-inference')).toBeVisible()
  await expect(page.getByTestId('result-traditional')).toBeVisible()
  await shot(page, '20-ml-compare-end')

  // 5 recap (the comparison is complete, so → moves on)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('ml-recap')).toContainText(pc(api.learned.test_accuracy))
  await expect(page.getByTestId('ml-recap')).toContainText(pc(api.human.test_accuracy))
  await page.waitForTimeout(900)
  await shot(page, '21-ml-recap')
  expect(errors).toEqual([])
})
