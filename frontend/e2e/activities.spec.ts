import { expect, test, type Page } from '@playwright/test'

/**
 * Cinematic activities (DS4A Ch. 8 "Applying the Concepts"): the hub, then every activity's Story (plays, steps
 * caption by caption), Try (answered from the API's solver → full score) and Solution; numbers on screen equal the API.
 */
const API = 'http://localhost:8000/api/v1/exercises'
const IDS = [...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `ds4a-ac${n}`), 'hoids-hop8-1', 'hoids-hop8-2', 'hoids-hop8-3', 'hoids-hop8-4']
const key = (s: string) => s.replace(/\W+/g, '').toLowerCase()
test.use({ viewport: { width: 1600, height: 900 } })
test.describe.configure({ timeout: 180_000 })

async function errorsOf(page: Page) {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  return errs
}

test('hub lists every activity and leads back to the presentation', async ({ page }) => {
  await page.goto('/activities')
  for (const id of IDS) await expect(page.getByTestId(`hub-${id}`)).toBeVisible()
  await expect(page.getByTestId('hub-hoids-hop8-1')).toBeVisible()
  await page.getByTestId('hub-ds4a-ac3').click()
  await expect(page).toHaveURL(/\/activities\/ds4a-ac3$/)
  // the classic lab is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES): no movie-workshop card, and the back link returns to the presentation
  await page.goto('/activities')
  await expect(page.getByTestId('hub-movie-workshop')).toHaveCount(0)
  await page.getByRole('link', { name: '← Presentation' }).click()
  await expect(page).toHaveURL(/\/presentation/)
})

test('story plays, steps caption by caption, and modes switch with 1/2/3', async ({ page }) => {
  const errs = await errorsOf(page)
  await page.goto('/activities/ds4a-ac1')
  await expect(page.getByTestId('ap-caption')).not.toBeEmpty()
  const first = await page.getByTestId('ap-caption').textContent()
  await expect(page.getByTestId('ap-caption')).not.toHaveText(first!, { timeout: 15_000 }) // autoplay moved on
  await page.getByTestId('ap-play').click() // pause
  const c1 = await page.getByTestId('ap-caption').textContent()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('ap-caption')).not.toHaveText(c1!)
  await page.keyboard.press('PageDown')
  await expect(page.getByTestId('ap-scene')).toContainText('/ 4')
  await page.keyboard.press('2'); await expect(page.getByTestId('ap-try')).toBeVisible()
  await page.keyboard.press('3'); await expect(page.getByTestId('ap-solution')).toBeVisible()
  await page.keyboard.press('1'); await expect(page.getByTestId('ap-story')).toBeVisible()
  expect(errs).toEqual([])
})

for (const id of IDS) {
  test(`${id}: every scene renders, Try reaches full marks, Solution shows the solver`, async ({ page, request }) => {
    const errs = await errorsOf(page)
    const solve = await (await request.post(`${API}/${id}/solve`, { data: { parameters: {} } })).json()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/activities/${id}`)
    await expect(page.getByTestId('ap-title')).toBeVisible()
    const n = Number((await page.getByTestId('ap-scene').textContent())!.match(/\/\s*(\d+)/)![1])
    for (let s = 1; s < n; s++) { await page.keyboard.press('PageDown'); await expect(page.getByTestId('ap-scene')).toContainText(`${s + 1} / ${n}`) }
    await expect(page.getByTestId('ap-caption')).not.toBeEmpty()

    // screen numbers equal the API (where the activity shows computed values)
    if (id === 'ds4a-ac7') {
      await page.keyboard.press('PageUp') // metrics scene (4 of 5): the matrix is full
      for (const k of ['tp', 'fp', 'fn', 'tn']) await expect(page.getByTestId(`ac7-${k}`)).toContainText(String(solve.metrics.counts[k]))
    }
    if (id === 'ds4a-ac3') {
      await page.keyboard.press('PageUp') // leaves scene
      await expect(page.getByTestId('ac3-total')).toContainText(`${solve.answers[3].answer.total_correct} of ${solve.answers[3].answer.out_of}`)
    }

    // Try: answer every item with the solver's answer
    await page.keyboard.press('2')
    const items = page.locator('[data-testid^="try-item-"]')
    const count = await items.count()
    for (let i = 0; i < count; i++) {
      const input = page.getByTestId(`try-${i}-input`)
      if (await input.count()) {
        // numeric: read the expected value from the Solution after checking; here type the solver value
        const expected = await numericAnswer(id, i, solve)
        await input.fill(String(expected))
      } else {
        const opts = items.nth(i).locator('button')
        const labels = await opts.allTextContents()
        const want = choiceAnswer(id, i, solve, labels)
        await page.getByTestId(`try-${i}-${key(want)}`).click()
      }
    }
    await page.getByTestId('try-check').click()
    await expect(page.getByTestId('try-score')).toHaveText(`${count} / ${count} correct`)
    await page.getByTestId('try-to-solution').click()
    await expect(page.getByTestId('ap-solution')).toBeVisible()
    await expect(page.getByTestId('ap-solution')).toContainText('computed by the backend solver')
    await expect(page.getByTestId('ap-solution').locator('.q')).toHaveCount(solve.answers.length)
    expect(errs).toEqual([])
  })
}

/** the answers, re-derived from the solver output in the same way the activity's Try items are built */
function choiceAnswer(id: string, i: number, s: any, labels: string[]): string {
  const a = s.answers
  switch (id) {
    case 'ds4a-ac1': case 'ds4a-ac2': case 'ds4a-ac4': return String(a[i].answer)
    case 'ds4a-ac5': { const v = a[Math.floor(i / 3)].answer; return [v.problem, v.response_type, v.goal][i % 3] }
    case 'ds4a-ac3': return [String(a[0].answer).startsWith('Yes') ? 'Yes — private' : 'No — public', String(a[1].answer), String(a[2].answer)][i]
    case 'ds4a-ac6': { const r = a[2].answer; return [String(a[0].answer), 'max depth 5 (tied with 7)', r.most_interpretable_least_complex, r.because_first, r.variables, r.characterize][i] }
    case 'ds4a-ac8': {
      const cells = Object.values(a[0].answer) as string[]
      if (i < 4) return cells[i]
      return (Object.values(s.conclusions) as { label: string }[])[i - 10].label
    }
    case 'hoids-hop8-1': return ({ 0: '4', 1: [...s.candidates].sort((a: { sse: number }, b: { sse: number }) => a.sse - b.sse)[0].label, 4: 'food only' } as Record<number, string>)[i]
    case 'hoids-hop8-2': {
      const p = Object.fromEntries(s.model_1.coefficients.map((c: { term: string; p: number }) => [c.term, c.p]))
      const which = p.flight_length_miles < 0.05 && p.daily_flight_time_hours < 0.05 ? 'both' : p.flight_length_miles < 0.05 ? 'flight length only' : p.daily_flight_time_hours < 0.05 ? 'daily flight time only' : 'neither'
      return ({ 0: which, 2: 'more assets', 4: 'No: it is an association' } as Record<number, string>)[i]
    }
    case 'hoids-hop8-3': {
      const c = s.answers[0].answer.correlations_with_perm
      const best = Object.keys(c).sort((a, b) => Math.abs(c[b]) - Math.abs(c[a]))[0]
      return ({ 0: best, 2: 'Only partly', 3: 'At the least-squares coefficients', 4: 'So one learning rate suits all features' } as Record<number, string>)[i]
    }
    case 'hoids-hop8-4': return ({ 2: 'Yes, adjusted R² rises', 3: s.best } as Record<number, string>)[i]
  }
  return labels[0]
}
async function numericAnswer(id: string, i: number, s: any): Promise<number> {
  if (id === 'ds4a-ac7') return Number(s.metrics[['accuracy', 'precision', 'recall', 'specificity'][i]].toFixed(2))
  if (id === 'ds4a-ac8') return s.accuracy_table[i - 4].accuracy
  if (id === 'ds4a-ac3') { const v = s.answers[3].answer; return [v.public_predictions, v.private_predictions, v.total_correct][i - 3] }
  if (id === 'hoids-hop8-1') { const m = s.model; return Number((i === 2 ? m.coefficients.find((c: { term: string }) => c.term === 'food').estimate : m.r2).toFixed(2)) }
  if (id === 'hoids-hop8-2') return Number((i === 1 ? s.model_1.r2 : s.model_2.r2).toFixed(2))
  if (id === 'hoids-hop8-3') return Number(s.answers[0].answer.r2.toFixed(2))
  if (id === 'hoids-hop8-4') return i === 0 ? Number(s.model_a.r2.toFixed(2)) : i === 1 ? Number(s.model_b.r2.toFixed(2)) : Number((s.answers[2].answer.ols_slope * 1e6).toFixed(3))
  return NaN
}
