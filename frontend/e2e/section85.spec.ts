import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 8.5, in source order. The network's numbers on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')
const pct = (v: number) => `${(v * 100).toFixed(1)} %`

test('Section 8.5: deep learning', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const dl = await (await request.get('http://localhost:8000/api/v1/concepts/deep-learning')).json()
  expect(dl.architecture).toEqual([64, 32, 16, 10])
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`section-8-5\\?step=${n}$`))

  await page.goto('/presentation/section-8-5?step=0')
  await expect(page.getByTestId('section-85')).toBeVisible()
  await page.waitForTimeout(1200)
  await shot(page, '100-s85-intro')

  // 1 gains, then → the costs
  await right(page); await step(1)
  await expect(page.getByTestId('s85-costs')).toHaveClass(/hide/)
  await right(page)
  await expect(page.getByTestId('s85-costs')).not.toHaveClass(/hide/)
  await page.waitForTimeout(600); await shot(page, '101-s85-balance')

  // 2 applications
  await right(page); await step(2)
  await page.waitForTimeout(1000); await shot(page, '102-s85-apps')

  // 3 Fig. 8.23: data passes through the deep network layer by layer
  await right(page); await step(3)
  for (let k = 0; k < 4; k++) await right(page)
  await page.waitForTimeout(600); await shot(page, '103-s85-network')

  // 4 mechanics, → the price with the real weight count
  await right(page); await step(4)
  await right(page)
  await expect(page.getByTestId('s85-mech-cost')).toContainText(dl.n_weights.toLocaleString('en'))
  await page.waitForTimeout(600); await shot(page, '104-s85-mechanics')

  // 5 ChatGPT, → the precise wording note
  await right(page); await step(5)
  await right(page)
  await expect(page.getByTestId('s85-chatgpt-note')).toContainText('self-supervised')
  await page.waitForTimeout(600); await shot(page, '105-s85-chatgpt')

  // 6 Fig. 8.24: schematic, → the measured curves
  await right(page); await step(6)
  await right(page)
  const large = dl.learning_curves[2].points
  await expect(page.getByTestId('lc-compute')).toContainText(pct(large[large.length - 1].accuracy))
  await page.waitForTimeout(700); await shot(page, '106-s85-curves')

  // 7 an image is numbers: pick a 5; its 64 values are the API's
  await right(page); await step(7)
  await page.getByTestId('dp-pick-5').click()
  await right(page); await right(page)
  const five = dl.examples[5]
  await expect(page.getByTestId('dp-grid').locator('span')).toHaveText(five.pixels.map(String))
  await page.waitForTimeout(600); await shot(page, '107-s85-pixels')

  // 8 inside the network: the same 5 flows through; then one of its mistakes
  await right(page); await step(8)
  for (let k = 0; k < 3; k++) await right(page)
  await expect(page.getByTestId('fp-verdict')).toContainText(`says ${five.prediction} (${pct(five.probabilities[five.prediction])})`)
  await expect(page.getByTestId('fp-accuracy')).toHaveText(pct(dl.test_accuracy))
  await page.waitForTimeout(600); await shot(page, '108-s85-forward')
  await page.getByTestId('fp-wrong-0').click()
  const w = dl.misclassified[0]
  await expect(page.getByTestId('fp-verdict')).toContainText(`says ${w.prediction}`)
  await expect(page.getByTestId('fp-verdict')).toContainText(`true digit is ${w.label} ✗`)

  // 9 draw a digit: a real mouse drawing and the demo 7 are both read by the backend
  await page.getByTestId('fp-ex-3').click()
  await right(page); await step(9)
  const box = (await page.getByTestId('dd-canvas').boundingBox())!
  const at = (u: number, v: number) => [box.x + u * box.width, box.y + v * box.height] as const
  await page.mouse.move(...at(0.5, 0.15)); await page.mouse.down()
  for (const [u, v] of [[0.5, 0.5], [0.5, 0.85]] as const) await page.mouse.move(...at(u, v), { steps: 8 })
  await page.mouse.up()
  await expect(page.getByTestId('dd-verdict')).toContainText('reads 1')
  await page.getByTestId('dd-demo').click()
  await expect(page.getByTestId('dd-verdict')).toContainText('reads 7')
  await page.waitForTimeout(500); await shot(page, '109-s85-draw')

  // 10 around us, 11 summary, then Section 8.6
  await right(page); await step(10)
  await page.waitForTimeout(500); await shot(page, '110-s85-cases')
  await right(page); await step(11)
  await expect(page.getByTestId('s85-summary')).toBeVisible()
  await page.waitForTimeout(1000); await shot(page, '111-s85-summary')
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/research/)  // the recent-research section follows 8.5 (9 Nov)
  expect(errors).toEqual([])
})
