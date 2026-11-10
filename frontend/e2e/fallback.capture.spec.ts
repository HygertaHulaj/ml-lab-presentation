import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { SECTIONS } from '../src/presentation/sections'

/**
 * Handoff tool (not part of the suite; run with FALLBACK_DIR set): one 1920×1080 screenshot of every core step, in talk
 * order, for a machine without working WebGL. `docs/handoff/make_fallback_pdf.py` turns them into one PDF.
 * Each step is shown after its module's reveals (→ until the step itself would change), so the frame shows the full beat.
 */
test('@capture fallback frames', async ({ page }) => {
  const dir = process.env.FALLBACK_DIR
  test.skip(!dir, 'capture only: set FALLBACK_DIR')
  test.setTimeout(1_800_000)
  mkdirSync(dir!, { recursive: true })
  await page.setViewportSize({ width: 1920, height: 1080 })
  let n = 0
  // FALLBACK_SCOPE=all: every section (with the appendix) and the film step too, for the full export
  const all = process.env.FALLBACK_SCOPE === 'all'
  const manifest: Record<string, unknown>[] = []
  for (const s of SECTIONS.filter((x) => all || x.track === 'core')) {
    for (let k = 0; k < s.steps.length; k++) {
      if (s.id === 'intro' && k === 1 && !all) continue // the film itself: ship the MP4 instead
      await page.goto(`/presentation/${s.path}?step=${k}`)
      await page.locator('main.stage section').first().waitFor()
      await page.waitForTimeout(1400)
      // keep the last frame of the step: after each → that keeps the page on this step (a reveal), save again; the → that
      // would leave the step ends the loop (no navigating back, no replay). The intro's → starts an animated hand-off.
      const at = () => { const u = new URL(page.url()); return `${u.pathname}#${u.searchParams.get('step') ?? '0'}` }
      const place = `/presentation/${s.path}#${k}`
      n++
      const file = `${dir}/${String(n).padStart(3, '0')}-${String(s.n).padStart(2, '0')}-${s.id}-${k}.png`
      await expect(page.getByTestId('section-label')).toContainText(s.steps[k]) // this step, not a neighbour
      await page.screenshot({ path: file })
      manifest.push({ file: file.split('/').pop(), section: s.id, n: s.n, title: s.title, short: s.short, step: k, steps: s.steps.length, label: s.steps[k], source: s.source, question: s.question, takeaway: s.takeaway, bridge: s.bridge ?? null, track: s.track })
      for (let r = 0; r < (s.id === 'intro' ? 0 : 8); r++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(700)
        if (at() !== place || !((await page.getByTestId('section-label').textContent()) ?? '').includes(s.steps[k])) break
        await page.screenshot({ path: file })
      }
    }
  }
  writeFileSync(`${dir}/frames.json`, JSON.stringify(manifest, null, 1))
})
