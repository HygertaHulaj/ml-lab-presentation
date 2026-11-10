import { test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'

/**
 * Measurement only (not part of the suite; run with --grep "@measure"): at 1920×1080, every HTML text node in the stage
 * smaller than 22 px, grouped by its element's class, plus any stage body that needs scrolling.
 */
const SECTIONS: [string, number][] = [['intro', 3], ['ai', 8], ['machine-learning', 6], ['how-learning-works', 8], ['section-8-2', 11], ['section-8-3', 14], ['worked-example-movies', 8], ['section-8-4', 15], ['section-8-5', 12], ['research', 3], ['section-8-6', 8], ['ethics', 10], ['conclusion', 5]]

async function small(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('main.stage')
    const out: Record<string, { n: number; min: number; sample: string }> = {}
    if (!stage) return { out, overflow: [] as string[] }
    const w = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    while (w.nextNode()) {
      const p = w.currentNode.parentElement
      if (!p || seen.has(p) || !w.currentNode.textContent?.trim() || p.closest('svg')) continue
      seen.add(p)
      const cs = getComputedStyle(p)
      if (cs.visibility === 'hidden' || p.getClientRects().length === 0) continue
      const fs = parseFloat(cs.fontSize)
      if (fs >= 22) continue
      const key = `${p.tagName.toLowerCase()}.${[...p.classList].join('.')}<${p.parentElement?.className?.toString().split(' ')[0] ?? ''}`
      const e = out[key] ?? { n: 0, min: 99, sample: w.currentNode.textContent.trim().slice(0, 50) }
      e.n++; e.min = Math.min(e.min, fs); out[key] = e
    }
    const overflow = [...stage.querySelectorAll('.body, section')].filter((el) => el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== 'visible').map((el) => el.className.toString().slice(0, 30))
    return { out, overflow }
  })
}

const VIEWPORTS = (process.env.MEASURE_VP ?? '1920x1080').split(',').map((v) => v.split('x').map(Number) as [number, number])
for (const [w, h] of VIEWPORTS) {
  test(`@measure type scale at ${w}×${h}`, async ({ page }) => {
    test.skip(!process.env.MEASURE_OUT, 'measurement only: set MEASURE_OUT')
    test.setTimeout(900_000)
    await page.setViewportSize({ width: w, height: h })
    const report: Record<string, unknown> = {}
    for (const [id, n] of SECTIONS) for (let s = 0; s < n; s++) {
      await page.goto(`/presentation/${id}?step=${s}`)
      await page.locator('main.stage section').first().waitFor()
      await page.waitForTimeout(1500)
      report[`${id}:${s}`] = await small(page)
    }
    writeFileSync(`${process.env.MEASURE_OUT}.${w}x${h}.json`, JSON.stringify(report, null, 1))
  })
}
