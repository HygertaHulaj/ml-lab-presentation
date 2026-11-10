import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { budgetPlot, costPaths, movieExamples } from '../src/lessons/linreg-gd/workshop'
import type { LinRegTrace } from '../src/lessons/linreg-gd/types'

const { traces } = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/lessons/shah-8-4-movies.json`, 'utf8')) as { traces: LinRegTrace[] }
const trace = traces[1]
describe('movie classroom visuals', () => {
  it('keeps names, budgets, ratings and prediction indices paired in the selected observations', () => {
    const examples = movieExamples(trace)
    expect(examples).toHaveLength(3)
    for (const e of examples) {
      expect(e.name).toBe(trace.points.labels![e.index])
      expect(e.budget).toBe(trace.points.x[0][e.index])
      expect(e.rating).toBe(trace.points.y[e.index])
      expect(Number.isFinite(trace.ols.fitted[e.index])).toBe(true)
    }
    expect(examples[0].budget).toBeLessThan(examples[1].budget)
    expect(examples[1].budget).toBeLessThan(examples[2].budget)
  })
  it('plots every observation on one linear budget scale without changing the data', () => {
    const plot = budgetPlot(trace)
    expect(plot.points).toHaveLength(trace.n)
    expect(Math.max(...plot.points.map((p) => p.x))).toBe(744)
    expect(Math.min(...plot.points.map((p) => p.y))).toBe(40)
    expect(Math.max(...plot.points.map((p) => p.y))).toBe(220)
  })
  it('uses common axes so a diverging run cannot appear to improve through independent scaling', () => {
    const rising = { ...trace, frames: trace.frames.map((f, i) => ({ ...f, cost: 10 + i * 100 })) }
    const paths = costPaths([trace, rising])
    const coordinates = paths.map((path) => path.split(' ').map((point) => point.split(',').map(Number)))
    expect(coordinates[0][0][0]).toBe(coordinates[1][0][0])
    expect(coordinates[1].at(-1)![1]).toBeLessThan(coordinates[1][0][1])
    expect(coordinates.flat(2).every(Number.isFinite)).toBe(true)
  })
})
