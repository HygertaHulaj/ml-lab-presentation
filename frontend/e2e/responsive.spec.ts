import { expect, test } from '@playwright/test'

test('the lesson works on a 390-px phone viewport without horizontal overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/lessons/kmeans-iris')
  await page.getByTestId('begin').click()
  await expect(page.getByTestId('subtitle')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await expect(page.getByTestId('play')).toBeVisible()
  expect(errors).toEqual([])
})
