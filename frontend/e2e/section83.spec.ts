import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Section 8.3, in source order. Every tree number on screen must equal the backend's. */
test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 180_000 })
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const right = (page: Page) => page.keyboard.press('ArrowRight')
const API = 'http://localhost:8000/api/v1/concepts'
const FEATS = 'competitor_price,income,advertising,population,price,age,education,shelf_location,urban,us'

test('Section 8.3: characteristics of machine-learning methods', async ({ page, request }) => {
  mkdirSync(SHOTS, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const get = async (q: string) => (await request.get(`${API}/${q}`)).json()
  const shelf = await get('tree?features=shelf_location')
  const leak = await get('tree?features=shelf_location,price,sales')
  const noLeak = await get('tree?features=shelf_location,price')
  const reg = await get('tree?target=sales&features=shelf_location')
  const peng = await get('tree?dataset=penguins&target=species&features=bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,island,sex')
  const nested = await Promise.all([1, 2, 3].map((d) => get(`tree?features=${FEATS}&max_depth=${d}`)))
  const explore = await get('carseats-explore')
  const step = (n: number) => expect(page).toHaveURL(new RegExp(`section-8-3\\?step=${n}$`))

  await page.goto('/presentation/section-8-3?step=0')
  await expect(page.getByTestId('section-83')).toBeVisible()
  await page.waitForTimeout(1400)
  await shot(page, '45-s83-intro')

  // 1 anatomy: → reveals node, split, branches, leaves
  await right(page); await step(1)
  for (let k = 0; k < 3; k++) await right(page)
  await shot(page, '46-s83-anatomy')

  // 2 car seats + surrogate trap
  await right(page); await step(2)
  await expect(page.getByTestId('surrogate-result')).toContainText(`${(noLeak.accuracy * 100).toFixed(1)} %`)
  await page.getByTestId('include-sales').check()
  await expect(page.getByTestId('surrogate-result')).toContainText(`${(leak.accuracy * 100).toFixed(1)} %`)
  await expect(page.getByTestId('surrogate-result')).toContainText('Too good to be true')
  await shot(page, '47-s83-surrogate')

  // 3 reading the tree: the book's numbers, then a new store
  await right(page); await step(3)
  const root = shelf.tree.nodes[0]
  await expect(page.getByTestId('reading-text')).toContainText(`${root.class_counts.High} | ${root.class_counts.Low}`)
  for (let k = 0; k < 4; k++) await right(page)
  await page.getByTestId('store-good').click()
  const goodLeaf = shelf.tree.nodes.find((n: { id: number }) => n.id === root.right)
  await expect(page.getByTestId('reading-prediction')).toContainText(goodLeaf.prediction)
  await shot(page, '48-s83-reading')

  // 4 explanatory variables
  await right(page); await step(4)
  await expect(page.getByTestId('explanatory-text')).toContainText(`Good ${(explore.by_shelf[2].share_high * 100).toFixed(0)} %`)
  await right(page)
  await expect(page.getByTestId('explanatory-text')).toContainText(explore.price_sales.r.toFixed(2))
  await shot(page, '49-s83-explanatory')

  // 5 penguins: answers come from the tree
  await right(page); await step(5)
  const pr = peng.tree.nodes[0], pl = peng.tree.nodes.find((n: { id: number }) => n.id === pr.left), prr = peng.tree.nodes.find((n: { id: number }) => n.id === pr.right)
  const total = pl.class_counts[pl.prediction] + prr.class_counts[prr.prediction]
  await page.getByTestId(`penguin-0-${String(pr.prediction).toLowerCase()}`).click()
  await page.getByTestId('penguin-1-flipperlengthmm').click()
  await page.getByTestId(`penguin-2-${`${pl.prediction}, else ${prr.prediction}`.replace(/\W+/g, '').toLowerCase()}`).click()
  await page.getByTestId(`penguin-3-${total}`).click()
  await right(page)
  await expect(page.getByTestId('penguin-score')).toHaveText('4 / 4 correct')
  await shot(page, '50-s83-penguins')

  // 6 regression vs classification
  await right(page); await step(6)
  for (const [i, a] of ['classification', 'regression', 'regression', 'classification', 'classification', 'regression'].entries()) await page.getByTestId(`regclass-${i}-${a}`).click()
  await right(page)
  await expect(page.getByTestId('regclass-score')).toHaveText('6 / 6 correct')
  await shot(page, '51-s83-regclass')

  // 7 both tasks (Fig. 8.12)
  await right(page); await step(7)
  const regGood = reg.tree.nodes.find((n: { id: number }) => n.id === reg.tree.nodes[0].right)
  await expect(page.getByTestId('both-regression')).toContainText(Number(regGood.prediction).toFixed(2))
  await shot(page, '52-s83-both')

  // 8 inference vs prediction
  await right(page); await step(8)
  await expect(page.getByTestId('m-infpred')).toContainText('price')
  await page.waitForTimeout(600)
  await shot(page, '53-s83-infpred')

  // 9 try it: inference vs prediction
  await right(page); await step(9)
  for (const [i, a] of ['regressioninference', 'classificationprediction', 'regressioninference'].entries()) await page.getByTestId(`infpred-${i}-${a}`).click()
  await right(page)
  await expect(page.getByTestId('infpred-score')).toHaveText('3 / 3 correct')
  await shot(page, '54-s83-infpred-quiz')

  // 10 interpretability vs complexity
  await right(page); await step(10)
  for (let k = 0; k < 3; k++) await right(page)
  await page.waitForTimeout(700)
  await shot(page, '55-s83-tradeoff')

  // 11 max depth / min n (live refits)
  await right(page); await step(11)
  const d4 = await get(`tree?features=${FEATS}&max_depth=4&min_n=2`)
  await page.getByTestId('cc-depth-input').fill('4')
  await expect(page.getByTestId('cc-leaves')).toHaveText(String(d4.tree.n_leaves))
  await expect(page.getByTestId('cc-test')).toHaveText(`${(d4.official_split.test_accuracy * 100).toFixed(1)} %`)
  await shot(page, '56-s83-complexity')

  // 12 nested trees
  await page.getByTestId('cc-depth-input').fill('5')
  await right(page); await step(12)
  await page.getByTestId('nested-0-shelflocation').click()
  const best = ['first', 'second', 'third'][nested.reduce((b: number, t: { correct: number }, i: number) => (t.correct > nested[b].correct ? i : b), 0)]
  await page.getByTestId(`nested-1-${best}`).click()
  await page.getByTestId('nested-2-first').click()
  await page.getByTestId('nested-3-third').click()
  await right(page)
  await expect(page.getByTestId('nested-score')).toHaveText('4 / 4 correct')
  await shot(page, '57-s83-nested')

  // 13 summary, then on to the lab
  await right(page); await step(13)
  await expect(page.getByTestId('s83-summary')).toContainText('surrogate')
  await page.waitForTimeout(1200)
  await shot(page, '58-s83-summary')
  // the question/answer and "Next" lines were removed (presenter's choice, 9 Nov); the practice buttons stay
  await expect(page.getByTestId('section-bridge-next')).toHaveCount(0)
  await expect(page.getByTestId('section-bridge')).not.toContainText('grouping, classifying')
  await expect(page.getByTestId('section-embeds')).toBeVisible()
  await right(page)
  await expect(page).toHaveURL(/\/presentation\/worked-example-movies/)
  expect(errors).toEqual([])
})
