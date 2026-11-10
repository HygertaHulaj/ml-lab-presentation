import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { lineDuration, lineStart, locate, numericCorrect, sceneStarts, totalDuration } from '../src/activities/timing'
import { beforeColon, sortItems } from '../src/activities/sorting'
import * as S from '../src/activities/ds4a/scripts'
import { ac5Script, ac5Try } from '../src/activities/ds4a/ac5'
import * as H from '../src/activities/hoids/scripts'
import type { ExerciseDetail, SolveResult } from '../src/types'
import type { Scene } from '../src/activities/types'

const fx = (id: string) => JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/activities/${id}.json`, 'utf8')) as { detail: ExerciseDetail; solve: SolveResult }
const SCRIPTS: Record<string, [(d: ExerciseDetail, s: SolveResult) => Scene[], (d: ExerciseDetail, s: SolveResult) => ReturnType<typeof S.ac1Try>, string[]]> = {
  'ds4a-ac1': [S.ac1Script, S.ac1Try, ['intro', 'bins', 'sort', 'summary']],
  'ds4a-ac2': [S.ac2Script, S.ac2Try, ['intro', 'bins', 'sort', 'summary']],
  'ds4a-ac3': [S.ac3Script, S.ac3Try, ['intro', 'root', 'split', 'flow', 'leaves', 'star']],
  'ds4a-ac4': [S.ac4Script, S.ac4Try, ['intro', 'bins', 'sort', 'summary']],
  'ds4a-ac5': [ac5Script, ac5Try, ['intro', 's0', 's1', 's2', 'summary']],
  'ds4a-ac6': [S.ac6Script, S.ac6Try, ['intro', 'grow', 'top', 'accuracy', 'identical', 'rank', 'star']],
  'ds4a-ac7': [S.ac7Script, S.ac7Try, ['intro', 'tree', 'flow', 'metrics', 'star']],
  'ds4a-ac8': [S.ac8Script, S.ac8Try, ['intro', 'cells', 'accuracy', 'bars', 'verdict']],
  'hoids-hop8-1': [H.hop81Script, H.hop81Try, ['intro', 'data', 'form', 'hand', 'fit', 'read']],
  'hoids-hop8-2': [H.hop82Script, H.hop82Try, ['intro', 'data', 'fit', 'table', 'assets', 'insight']],
  'hoids-hop8-3': [H.hop83Script, H.hop83Try, ['intro', 'corr', 'ols', 'gd', 'compare']],
  'hoids-hop8-4': [H.hop84Script, H.hop84Try, ['intro', 'a', 'b', 'best', 'gd', 'compare']],
}

describe('Shah Hands-On Problems 8.2–8.4: narration and Try answers equal the solver', () => {
  it('8.2: flight length significant, daily time not; the two R² values', () => {
    const { detail, solve } = fx('hoids-hop8-2')
    const t = H.hop82Try(detail, solve)
    expect(t.find((x) => x.id === 'sig')!.answer).toBe('flight length only')
    expect(t.find((x) => x.id === 'r21')!.answer).toBeCloseTo((solve.model_1 as { r2: number }).r2, 10)
    expect(H.hop82Script(detail, solve).flatMap((s) => s.lines).join(' ')).toContain('not significant (p = 0.88)')
  })
  it('8.3: peri is the strongest correlate; gradient descent converges', () => {
    const { detail, solve } = fx('hoids-hop8-3')
    expect(H.hop83Try(detail, solve).find((x) => x.id === 'best')!.answer).toBe('peri')
    expect(H.hop83Script(detail, solve).flatMap((s) => s.lines).join(' ')).toMatch(/converged after \d+ iterations/)
  })
  it('8.4: model (b) beats (a); budget is the best predictor; slope per $1M', () => {
    const { detail, solve } = fx('hoids-hop8-4')
    const t = H.hop84Try(detail, solve)
    expect(t.find((x) => x.id === 'best')!.answer).toBe('budget')
    expect(t.find((x) => x.id === 'imp')!.answer).toBe('Yes, adjusted R² rises')
    const slope = (solve.answers[2].answer as { ols_slope: number }).ols_slope * 1e6
    expect(t.find((x) => x.id === 'slope')!.answer).toBeCloseTo(slope, 10)
  })
})

describe('story timing (pure functions of t)', () => {
  const scenes: Scene[] = [{ id: 'a', title: 'A', lines: ['one', 'two two two'] }, { id: 'b', title: 'B', lines: ['three'] }]
  it('locates scenes and lines, and is monotonic', () => {
    expect(locate(scenes, 0)).toMatchObject({ index: 0, line: 0 })
    expect(locate(scenes, totalDuration(scenes))).toMatchObject({ index: 1, p: 1 })
    let last = -1
    for (let t = 0; t <= totalDuration(scenes); t += 0.1) { const l = locate(scenes, t); const k = l.index * 10 + l.line; expect(k).toBeGreaterThanOrEqual(last); last = k }
  })
  it('lineStart lands on that line', () => {
    expect(locate(scenes, lineStart(scenes, 0, 1) + 0.001)).toMatchObject({ index: 0, line: 1 })
    expect(locate(scenes, sceneStarts(scenes)[1] + 0.001)).toMatchObject({ index: 1, line: 0 })
    expect(lineDuration('x'.repeat(100))).toBeGreaterThan(lineDuration('x'))
  })
  it('checks numeric answers to two decimals', () => {
    expect(numericCorrect('0.68', 0.679, 0.006)).toBe(true)
    expect(numericCorrect('0,71', 0.7059, 0.006)).toBe(true)
    expect(numericCorrect('0.7', 0.679, 0.006)).toBe(false)
    expect(numericCorrect('abc', 1)).toBe(false)
  })
})

describe('DS4A Applying the Concepts: scripts and Try items from the real solver outputs', () => {
  for (const [id, [script, tryItems, ids]] of Object.entries(SCRIPTS)) {
    it(`${id}: scenes in order, every line non-empty, every choice answer offered`, () => {
      const { detail, solve } = fx(id)
      const sc = script(detail, solve)
      expect(sc.map((s) => s.id)).toEqual(ids)
      sc.forEach((s) => { expect(s.lines.length).toBeGreaterThan(0); s.lines.forEach((l) => expect(l.trim().length).toBeGreaterThan(0)) })
      expect(sc.flatMap((s) => s.lines).join(' ')).not.toMatch(/undefined|NaN|\[object/)
      const items = tryItems(detail, solve)
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) if (it.options) expect(it.options).toContain(String(it.answer))
    })
  }
  it('AC 1: the bins come from the solver (4 AI, 4 not AI)', () => {
    const { detail, solve } = fx('ds4a-ac1')
    const items = sortItems(detail, solve)
    expect(items.filter((i) => i.bin === 'AI').map((i) => i.label)).toEqual(['Spam caller labeling on your cell phone', 'Talk-to-text on your cell phones', 'Amazon Echo Dot', 'Text suggestions in your email'])
  })
  it('AC 2: short labels, 4 / 3 / 2 across the three steps', () => {
    const { detail, solve } = fx('ds4a-ac2')
    const items = sortItems(detail, solve, beforeColon)
    expect(items[1].label).toBe('Calendar Data')
    const n = (k: string) => items.filter((i) => i.bin.startsWith(k)).length
    expect([n('Step 1'), n('Step 2'), n('Step 3')]).toEqual([4, 3, 2])
  })
  it('AC 3 and AC 7: narrated numbers equal the solver', () => {
    const a3 = fx('ds4a-ac3')
    const lines3 = S.ac3Script(a3.detail, a3.solve).flatMap((s) => s.lines).join(' ')
    expect(lines3).toContain('666 of 777 correct')
    const a7 = fx('ds4a-ac7')
    const m = a7.solve.metrics as { accuracy: number; recall: number }
    const lines7 = S.ac7Script(a7.detail, a7.solve).flatMap((s) => s.lines).join(' ')
    expect(lines7).toContain(`= ${m.accuracy.toFixed(2)}`)
    expect(lines7).toContain(`= ${m.recall.toFixed(2)}`)
    expect(S.ac7Try(a7.detail, a7.solve).map((t) => t.answer)).toEqual([m.accuracy, (a7.solve.metrics as { precision: number }).precision, m.recall, (a7.solve.metrics as { specificity: number }).specificity])
  })
  it('AC 8: verdicts and the six accuracies', () => {
    const { detail, solve } = fx('ds4a-ac8')
    const t = S.ac8Try(detail, solve)
    expect(t.filter((x) => x.options?.includes('overfitted')).map((x) => x.answer)).toEqual(['overfitted', 'well-fitted', 'underfitted'])
    expect(t.filter((x) => !x.options)).toHaveLength(6)
  })
})
