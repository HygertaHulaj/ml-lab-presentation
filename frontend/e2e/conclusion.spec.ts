import { expect, test, type Page } from '@playwright/test'

/** The real ending (audit C5): back to the scan, prediction vs decision, the checklist links back, recall, sources. */
const SHOTS = '../docs/presentation-keyframes'
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })

test('Conclusion: back to the scan, checklist, recall, sources; then the appendix', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const right = async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250) }
  await page.setViewportSize({ width: 1920, height: 1080 })

  await page.goto('/presentation/summary') // the old placeholder route redirects
  await expect(page).toHaveURL(/\/presentation\/conclusion/)
  await expect(page.getByTestId('section-conclusion')).toBeVisible()
  await expect(page.getByTestId('conclusion-question')).toContainText('What evidence would make us trust')
  await expect(page.locator('img.still')).toBeVisible()
  await page.waitForTimeout(800); await shot(page, '150-cc-scan')

  await right()
  await expect(page.getByTestId('conclusion-decision')).toBeVisible()
  await shot(page, '151-cc-decision')

  await right()
  await expect(page.getByTestId('conclusion-checklist')).toBeVisible()
  await page.waitForTimeout(400); await shot(page, '152-cc-checklist')
  await page.getByRole('button', { name: '↩ §8.4 Back to the movies' }).click()
  await expect(page).toHaveURL(/\/presentation\/section-8-4\?step=13/)
  await page.goto('/presentation/conclusion?step=3')

  await page.getByTestId('recall-0-sothetestflowersstayunseenuntilthefinalcheck').click()
  await page.getByTestId('recall-1-nothingdirectlythatneedsmoviesthemodelneversaw').click()
  await page.getByTestId('recall-2-itserrorsforeachpatientgroupandthecostofeachkindofmistake').click()
  await right() // → checks the answers
  await expect(page.getByTestId('recall-score')).toHaveText('3 / 3 correct')
  await page.waitForTimeout(400); await shot(page, '153-cc-recall')

  await right()
  await expect(page.getByTestId('conclusion-sources')).toContainText('Data Science for All')
  await expect(page.getByTestId('conclusion-sources')).toContainText('fictional scenario')
  await page.waitForTimeout(400); await shot(page, '154-cc-sources')

  // the classic lab is hidden, not deleted (features.ts, SHOW_EXTRA_PAGES): the conclusion is the last section, so → stays on its last step
  await right()
  await expect(page).toHaveURL(/\/presentation\/conclusion\?step=4/)
  expect(errors).toEqual([])
})
