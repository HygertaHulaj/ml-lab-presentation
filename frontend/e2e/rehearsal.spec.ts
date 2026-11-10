import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { SECTIONS } from '../src/presentation/sections'

/**
 * The whole talk, as the presenter gives it (audit §7 "rehearse and package"): a clean browser, one URL, then only →
 * until the appendix. Checks the sections arrive in registry order, no step says "in development", every core
 * section's last step shows its answer and next question, and the console stays clean. Runs in Warm Lab with motion,
 * and in Lecture Hall Light with reduced motion. Writes the number of → presses per section (for the presenter notes).
 */
const KEY = 'mllab.presentation.v1'
const CORE = SECTIONS.filter((s) => s.track === 'core')

async function walk(page: Page, label: string) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/presentation')
  await expect(page).toHaveURL(/\/presentation\/intro/)
  const order: string[] = []
  const presses: Record<string, number> = {}
  const bridged = new Set<string>()
  for (let i = 0; i < 700; i++) {
    const path = new URL(page.url()).pathname.replace('/presentation/', '')
    const sec = SECTIONS.find((s) => s.path === path)!
    if (order.at(-1) !== sec.id) order.push(sec.id)
    const step = Number(new URL(page.url()).searchParams.get('step') ?? 0)
    if (step === sec.steps.length - 1 && sec.track === 'core' && sec.id !== 'intro' && await page.getByTestId('section-bridge').isVisible()) bridged.add(sec.id)
    if (sec.id === 'lab' || (sec.id === SECTIONS.at(-1)!.id && step === sec.steps.length - 1)) break
    await expect(page.locator('main.stage')).not.toContainText('in development')
    presses[sec.id] = (presses[sec.id] ?? 0) + 1
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(sec.id === 'intro' ? 1500 : 450)
  }
  expect(order, `${label}: sections in order`).toEqual(SECTIONS.map((s) => s.id))
  // AI, ML, 8.2, 8.5, Research, 8.6 and Ethics end without a card (presenter's choice, 9 Nov); 8.3 and 8.4 keep only "Practise here"
  const NO_CARD = ['intro', 'ai', 'machine-learning', 'section-8-2', 'section-8-5', 'research', 'section-8-6', 'ethics']
  expect([...bridged].sort(), `${label}: answer cards where intended`).toEqual(CORE.filter((s) => !NO_CARD.includes(s.id)).map((s) => s.id).sort())
  expect(errors, `${label}: console`).toEqual([])
  return presses
}

test('rehearsal walk: Warm Lab, full motion', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.addInitScript((k) => { try { localStorage.removeItem(k) } catch { /* fresh */ } }, KEY)
  const presses = await walk(page, 'warm')
  if (process.env.REHEARSAL_OUT) writeFileSync(process.env.REHEARSAL_OUT, JSON.stringify(presses, null, 1))
})

test('rehearsal walk: Lecture Hall Light, reduced motion', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.addInitScript((k) => { try { localStorage.setItem(k, JSON.stringify({ theme: 'light', reducedMotion: true, muted: true })) } catch { /* ignore */ } }, KEY)
  await walk(page, 'light')
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light')
})
