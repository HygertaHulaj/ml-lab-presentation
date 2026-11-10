import type { LinRegTrace } from './types'

export function budgetPlot(trace: LinRegTrace) {
  const maxBudget = Math.max(1, ...trace.points.x[0])
  const minRating = Math.min(...trace.points.y)
  const maxRating = Math.max(...trace.points.y)
  return {
    maxBudget, minRating, maxRating,
    points: trace.points.y.map((rating, i) => ({
      x: 64 + 680 * trace.points.x[0][i] / maxBudget,
      y: 220 - 180 * (rating - minRating) / (maxRating - minRating || 1),
      index: i,
    })),
  }
}

/** Presentation-only coordinates and selections; all observations and costs come from the server. */
export function movieExamples(trace: LinRegTrace) {
  const ordered = trace.points.y.map((_, i) => i).sort((a, b) => trace.points.x[0][a] - trace.points.x[0][b])
  return [0.15, 0.5, 0.85].map((q) => {
    const i = ordered[Math.round((ordered.length - 1) * q)]
    return { index: i, name: trace.points.labels?.[i] ?? `Movie ${i + 1}`, budget: trace.points.x[0][i], rating: trace.points.y[i] }
  })
}

/** Both runs use the same iteration and log-cost scales, including an identical zero-cost baseline. */
export function costPaths(traces: LinRegTrace[]) {
  const maxIteration = Math.max(80, ...traces.map((t) => t.iterations_run))
  const maxCost = Math.max(1, ...traces.flatMap((t) => t.frames.map((f) => Math.log1p(f.cost)).filter(Number.isFinite)))
  return traces.map((t) => t.frames.filter((f) => Number.isFinite(f.cost)).map((f) =>
    `${(48 + 704 * f.iteration / maxIteration).toFixed(2)},${(230 - 200 * Math.log1p(f.cost) / maxCost).toFixed(2)}`,
  ).join(' '))
}
