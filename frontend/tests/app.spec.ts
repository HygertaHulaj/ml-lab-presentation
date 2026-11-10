import { SHOW_EXTRA_PAGES } from '../src/features'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { routes } from '../src/router'
import { NAV } from '../src/components/layout/nav'
import { fmt, pct } from '../src/utils/format'
import ConfusionMatrix from '../src/components/ml/ConfusionMatrix.vue'
import TreeDiagram from '../src/components/ml/TreeDiagram.vue'
import DatasetConfig from '../src/components/ml/DatasetConfig.vue'
import ExerciseSolution from '../src/components/exercises/ExerciseSolution.vue'
import { useDatasets } from '../src/stores/datasets'
import { ApiError, http } from '../src/api/client'
import type { Dataset, ExerciseDetail, SolveResult, Tree } from '../src/types'

const RouterLinkStub = { template: '<a><slot /></a>' }

describe('navigation', () => {
  // the classic lab is hidden, not deleted (features.ts); these two checks apply when it is shown
  it.skipIf(!SHOW_EXTRA_PAGES)('every sidebar entry resolves to a real route (not the catch-all redirect)', () => {
    const patterns = routes.filter((r) => !r.path.includes('pathMatch')).map((r) => new RegExp('^' + r.path.replace(/:\w+/g, '[^/]+') + '$'))
    for (const n of NAV) expect(patterns.some((p) => p.test(n.to))).toBe(true)
  })
  it('hides the extra pages: / opens the presentation and only the lecture routes remain', () => {
    if (SHOW_EXTRA_PAGES) return
    expect(routes.find((r) => r.path === '/')?.redirect).toBe('/presentation')
    expect(routes.map((r) => r.path).filter((p) => !p.includes('pathMatch'))).toEqual(['/', '/presentation', '/lessons/:id', '/activities', '/activities/:id'])
  })
  it('cinematic lessons are immersive and lazy-loaded', () => {
    const r = routes.find((x) => x.path === '/lessons/:id')!
    expect(r.meta?.immersive).toBe(true)
    expect(typeof r.component).toBe('function')
  })
  it.skipIf(!SHOW_EXTRA_PAGES)('has an exercise detail route with props', () => {
    expect(routes.find((r) => r.path === '/exercises/:id')?.props).toBe(true)
  })
})

describe('format helpers', () => {
  it('formats numbers and undefined values', () => {
    expect(fmt(0.123456)).toBe('0.1235')
    expect(fmt(3)).toBe('3')
    expect(fmt(null)).toBe('—')
    expect(fmt(Number.NaN)).toBe('—')
    expect(pct(0.5)).toBe('50.0%')
  })
})

describe('API error handling', () => {
  it('turns the backend error contract into ApiError with field details', async () => {
    const adapter = vi.fn().mockRejectedValue(Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { status: 422, data: { error: { message: 'The request is invalid.', details: [{ field: 'test_size', message: 'too small' }] } } },
    }))
    const p = http.get('/x', { adapter })
    await expect(p).rejects.toBeInstanceOf(ApiError)
    await expect(http.get('/x', { adapter })).rejects.toThrow('test_size: too small')
  })
  it('reports an unreachable server clearly', async () => {
    const adapter = vi.fn().mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }))
    await expect(http.get('/x', { adapter })).rejects.toThrow(/Cannot reach the API server/)
  })
})

describe('ConfusionMatrix', () => {
  it('labels binary cells TP/FN/FP/TN with actual rows', () => {
    const w = mount(ConfusionMatrix, { props: { labels: ['High', 'Low'], matrix: [[12, 21], [5, 43]] } })
    const cells = w.findAll('td').map((c) => c.text())
    expect(cells).toEqual(['12TP', '21FN', '5FP', '43TN'])
  })
})

const tree: Tree = {
  task: 'classification', criterion: 'gini', classes: ['A', 'B'], n_nodes: 3, n_leaves: 2, n_splits: 1, depth: 1,
  features_used: ['x'], feature_importances: { x: 1 },
  nodes: [
    { id: 0, depth: 0, parent: -1, is_leaf: false, samples: 10, impurity: 0.5, left: 1, right: 2, feature: 'x', threshold: 2.5,
      question: 'Is x <= 2.5?', left_condition: 'x <= 2.5', right_condition: 'x > 2.5', class_counts: { A: 5, B: 5 }, prediction: 'A' },
    { id: 1, depth: 1, parent: 0, is_leaf: true, samples: 5, impurity: 0, left: null, right: null, class_counts: { A: 5, B: 0 }, prediction: 'A' },
    { id: 2, depth: 1, parent: 0, is_leaf: true, samples: 5, impurity: 0, left: null, right: null, class_counts: { A: 0, B: 5 }, prediction: 'B' },
  ],
}

describe('TreeDiagram', () => {
  it('draws one box per real node and emits the clicked node', async () => {
    const w = mount(TreeDiagram, { props: { tree } })
    expect(w.findAll('g.cursor-pointer')).toHaveLength(3)
    expect(w.text()).toContain('x <= 2.5')
    await w.findAll('g.cursor-pointer')[2].trigger('click')
    expect(w.emitted('select')![0][0]).toMatchObject({ id: 2, prediction: 'B' })
  })
})

const ds: Dataset = {
  id: 'toy', name: 'Toy', source: 's', description: '', origin: 'example', row_count: 10, created_at: '',
  column_metadata: [
    { name: 'x', dtype: 'float64', kind: 'numeric', missing: 0, unique: 10 },
    { name: 'colour', dtype: 'object', kind: 'categorical', missing: 1, unique: 3 },
    { name: 'label', dtype: 'object', kind: 'categorical', missing: 0, unique: 2 },
  ],
}

describe('DatasetConfig (training configuration)', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('offers only non-target columns as features and honours numericOnly', async () => {
    const store = useDatasets()
    store.items = [ds]
    store.load = vi.fn()
    const w = mount(DatasetConfig, { props: { datasetId: 'toy', target: 'label', features: [], numericOnly: true, 'onUpdate:features': () => {} } })
    await nextTick()
    const chips = w.findAll('button[aria-pressed]').map((b) => b.text())
    expect(chips.join(' ')).toContain('x')
    expect(chips.join(' ')).not.toContain('colour')
    expect(chips.join(' ')).not.toContain('label')
  })
  it('emits the selected feature list when a chip is toggled', async () => {
    const store = useDatasets()
    store.items = [ds]
    store.load = vi.fn()
    const w = mount(DatasetConfig, { props: { datasetId: 'toy', target: 'label', features: [] } })
    await nextTick()
    await w.findAll('button[aria-pressed]')[0].trigger('click')
    expect(w.emitted('update:features')![0][0]).toEqual(['x'])
  })
})

describe('ExerciseSolution', () => {
  const exercise = { id: 'e', questions: [{ id: '1', prompt: 'What is 2+2?', answer: null, explanation: '' }], parameters: {} } as unknown as ExerciseDetail
  const result = { exercise_id: 'e', computed: true, parameters: {}, answers: [{ id: '1', answer: 4, explanation: 'because' }] } as SolveResult
  it('shows answers normally', () => {
    const w = mount(ExerciseSolution, { props: { exercise, result }, global: { stubs: { RouterLink: RouterLinkStub } } })
    expect(w.text()).toContain('4')
    expect(w.text()).toContain('because')
  })
  it('hides answers in practice mode until revealed', async () => {
    const w = mount(ExerciseSolution, { props: { exercise, result, practice: true }, global: { stubs: { RouterLink: RouterLinkStub } } })
    expect(w.text()).not.toContain('because')
    await w.find('button').trigger('click')
    expect(w.text()).toContain('because')
  })
})

describe('trainAndWait (loading states / polling)', () => {
  it('polls until the run completes', async () => {
    vi.useFakeTimers()
    const mod = await import('../src/api/endpoints')
    const states = ['RUNNING', 'RUNNING', 'COMPLETED']
    vi.spyOn(mod.api, 'startTraining').mockResolvedValue({ run_id: 'r', status: 'PENDING', progress: 0 } as any)
    vi.spyOn(mod.api, 'runStatus').mockImplementation(async () => ({ run_id: 'r', status: states.shift(), progress: 1 }) as any)
    const seen: string[] = []
    const p = mod.trainAndWait({} as any, (s) => seen.push(s.status))
    await vi.runAllTimersAsync()
    const final = await p
    expect(final.status).toBe('COMPLETED')
    expect(seen).toEqual(['PENDING', 'RUNNING', 'RUNNING', 'COMPLETED'])
    vi.useRealTimers()
  })
})
