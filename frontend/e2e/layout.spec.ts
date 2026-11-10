import { expect, test, type Page } from '@playwright/test'

/**
 * Layout guard: on every step of every built section, at common laptop/projector sizes, no two pieces of visible HTML
 * text may overlap (e.g. a module's content sliding under the section title). SVG text inside visualizations is
 * excluded (labels on shapes are intentional). Reports every collision with its step and viewport.
 */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1880, height: 960 }, // full-HD laptop with browser bars
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
]
const SECTIONS: [string, number][] = [['ai', 8], ['machine-learning', 6], ['how-learning-works', 8], ['section-8-2', 11], ['section-8-3', 14], ['worked-example-movies', 8], ['section-8-4', 15], ['section-8-5', 12], ['research', 3], ['section-8-6', 8], ['ethics', 10], ['conclusion', 5]]

async function collisions(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('main.stage')
    if (!stage) return []
    const els: { el: Element; r: DOMRect; t: string }[] = []
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    while (walker.nextNode()) {
      const n = walker.currentNode
      const p = n.parentElement
      if (!p || seen.has(p) || !n.textContent?.trim() || p.closest('svg')) continue
      const cs = getComputedStyle(p)
      if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue
      let a: Element | null = p, hidden = false
      while (a && a !== stage) { if (Number(getComputedStyle(a).opacity) < 0.05) { hidden = true; break } a = a.parentElement }
      if (hidden) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const r = range.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      seen.add(p)
      els.push({ el: p, r, t: n.textContent.trim().slice(0, 40) })
    }
    const out: string[] = []
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i], b = els[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        if (ox > 4 && oy > 4) out.push(`"${a.t}" × "${b.t}"`)
      }
    return out
  })
}

for (const vp of VIEWPORTS) {
  for (const [id, n] of SECTIONS) {
    test(`no overlapping text: ${id} at ${vp.width}×${vp.height}`, async ({ page }) => {
      test.setTimeout(30_000 + n * 15_000)
      await page.setViewportSize(vp)
      const problems: string[] = []
      for (let s = 0; s < n; s++) {
        await page.goto(`/presentation/${id}?step=${s}`)
        await page.locator('main.stage section').first().waitFor()
        await page.waitForTimeout(1600) // let entry transitions settle
        // …and any finite animation still running (e.g. the tidy-data cells flying into place); looping ones are ignored
        await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), null, { timeout: 8000 }).catch(() => {})
        for (const c of await collisions(page)) problems.push(`${id} step ${s}: ${c}`)
      }
      expect(problems, problems.join(' | ')).toEqual([])
    })
  }
}
