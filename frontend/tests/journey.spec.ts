/** Section 4: the learning-journey layout is a pure, reversible function of (stage, progress). */
import { describe, expect, it } from 'vitest'
import { buildCtx, CM, leafReveal, poseAt, splitReveal, VAULT } from '../src/presentation/sections/04-learning-process/journey'
import type { LearningJourney } from '../src/presentation/api'

const rec = (id: number, pl: number, pw: number, species: string) => ({ id, sepal_length_cm: 5, sepal_width_cm: 3, petal_length_cm: pl, petal_width_cm: pw, species })
const J: LearningJourney = {
  source: 'fixture', classes: ['setosa', 'versicolor', 'virginica'], features_all: [], features: ['petal_length_cm', 'petal_width_cm'],
  records: [rec(0, 1.4, 0.2, 'setosa'), rec(1, 4.5, 1.4, 'versicolor'), rec(2, 6.0, 2.2, 'virginica'), rec(3, 6.0, 2.2, 'virginica'), rec(4, 4.8, 1.8, 'versicolor')],
  prepare: { n_raw: 5, missing: {}, duplicates: [{ removed: 3, same_as: 2 }], n_clean: 4, tidy: true },
  feature_scores: [], split: { seed: 1, test_fraction: 0.5, train_ids: [0, 2], test_ids: [1, 4] },
  model: {
    type: 'decision tree', max_depth: 2, bounds: { petal_length_cm: [1, 7], petal_width_cm: [0, 2.5] }, leaves: [],
    splits: [
      { order: 0, node: 0, left: 1, right: 2, depth: 0, feature: 'petal_length_cm', threshold: 2.6, n: 2, gini: 0.5, counts: {}, box: {} },
      { order: 1, node: 2, left: 3, right: 4, depth: 1, feature: 'petal_width_cm', threshold: 1.75, n: 1, gini: 0, counts: {}, box: {} },
    ],
  },
  predictions: [{ id: 1, truth: 'versicolor', predicted: 'versicolor', correct: true, path: [] }, { id: 4, truth: 'versicolor', predicted: 'virginica', correct: false, path: [] }],
  evaluation: { labels: [], confusion: [[0, 0, 0], [0, 1, 1], [0, 0, 0]], train_accuracy: 1, test_accuracy: 0.5, precision: {}, recall: {}, support: {}, by_depth: [], selected_depth: 2, selection: '5-fold stratified cross-validation on the training flowers' },
}

describe('learning journey layout', () => {
  const c = buildCtx(J)
  const r = (id: number) => J.records.find((x) => x.id === id)!
  it('is a pure function of stage and progress', () => {
    expect(poseAt(c, r(1), 6, 0.4)).toEqual(poseAt(c, r(1), 6, 0.4))
  })
  it('removes the duplicate during preparation and keeps it out afterwards', () => {
    expect(poseAt(c, r(3), 2, 0.3).opacity).toBe(1)
    expect(poseAt(c, r(3), 2, 1).opacity).toBe(0)
    for (const s of [3, 4, 5, 6, 7]) expect(poseAt(c, r(3), s, 1).opacity).toBe(0)
  })
  it('places flowers by their features and keeps test flowers in the vault while training', () => {
    const p = poseAt(c, r(2), 3, 1)
    expect(p.x).toBeCloseTo(c.scale.x(6.0))
    expect(p.y).toBeCloseTo(c.scale.y(2.2))
    const v = poseAt(c, r(4), 5, 0.5)
    expect(v.x).toBeGreaterThan(VAULT.x0)
    expect(v.fill).toBe('none')
  })
  it('hides the labels of unseen flowers until predicted, then files them by truth × prediction', () => {
    expect(poseAt(c, r(4), 6, 0).fill).toBe('none')
    expect(poseAt(c, r(4), 6, 1).mark).toBe('bad')
    const m = poseAt(c, r(4), 7, 1)
    expect(m.x).toBeGreaterThan(CM.x0 + 2 * CM.cell) // column = predicted virginica
    expect(m.y).toBeGreaterThan(CM.y0 + CM.cell) // row = true versicolor
    expect(m.y).toBeLessThan(CM.y0 + 2 * CM.cell)
  })
  it('reveals splits in learning order, and leaves after their splits', () => {
    expect(splitReveal(0.3, 0, 2)).toBeGreaterThan(splitReveal(0.3, 1, 2))
    expect(splitReveal(1, 1, 2)).toBe(1)
    expect(leafReveal(0.2, 2, 2)).toBe(0)
    expect(leafReveal(1, 2, 2)).toBe(1)
  })
})
