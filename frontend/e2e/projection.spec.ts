import { expect, test, type Page } from '@playwright/test'
import { SECTIONS as REGISTRY } from '../src/presentation/sections'

/**
 * Projection check (audit §5 and §7) on the core route at 1920×1080, the professor's projector size:
 *  - essential HTML text is at least 22 CSS px (secondary text may stay small: kickers, citations, chart ticks, the
 *    digit pixel grid, navigation chips, hints and key legends; SVG labels scale with their chart);
 *  - no step needs scrolling inside the stage.
 * The text sizes grow from the design size at 1366 px wide to 22 px at 1920 (`--up-*` on .pres-root), so smaller
 * screens keep their layout; the layout guard (layout.spec) checks overlaps at four sizes.
 */
const SECONDARY = '.kicker, .src, .tick, .cells, .nums, .chips, figcaption, .badge, .hint, .keys, .cite, .ax, .lbl-tick, kbd, .dcol, .meta'

async function check(page: Page) {
  return page.evaluate((secondary) => {
    const stage = document.querySelector('main.stage')!
    const small: string[] = []
    const w = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    while (w.nextNode()) {
      const p = w.currentNode.parentElement
      if (!p || seen.has(p) || !w.currentNode.textContent?.trim() || p.closest('svg') || p.closest(secondary)) continue
      seen.add(p)
      const cs = getComputedStyle(p)
      if (cs.visibility === 'hidden' || p.getClientRects().length === 0) continue
      let a: Element | null = p, hidden = false
      while (a && a !== stage) { if (Number(getComputedStyle(a).opacity) < 0.05) { hidden = true; break } a = a.parentElement }
      if (hidden) continue
      const fs = parseFloat(cs.fontSize)
      if (fs < 21.5) small.push(`${fs}px "${w.currentNode.textContent.trim().slice(0, 30)}"`)
    }
    const overflow = [...stage.querySelectorAll('.body, section')]
      .filter((el) => el.scrollHeight > el.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
      .map((el) => `${el.className.toString().slice(0, 24)} ${el.scrollHeight}>${el.clientHeight}`)
    return { small, overflow }
  }, SECONDARY)
}

for (const s of REGISTRY.filter((x) => x.track === 'core' && x.id !== 'intro')) {
  test(`projection 1920×1080: ${s.id}`, async ({ page }) => {
    test.setTimeout(30_000 + s.steps.length * 8_000)
    await page.setViewportSize({ width: 1920, height: 1080 })
    const problems: string[] = []
    for (let k = 0; k < s.steps.length; k++) {
      await page.goto(`/presentation/${s.path}?step=${k}`)
      await page.locator('main.stage section').first().waitFor()
      await page.waitForTimeout(1500)
      const r = await check(page)
      for (const x of r.small) problems.push(`${s.id} ${k} small: ${x}`)
      for (const x of r.overflow) problems.push(`${s.id} ${k} overflow: ${x}`)
    }
    expect(problems, problems.join('\n')).toEqual([])
  })
}
