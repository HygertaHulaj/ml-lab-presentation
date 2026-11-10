/** Types for the Shah Ch. 8 regression / gradient-descent cinematic lessons (trace from POST /simulations/linreg-gd). */
export interface LinRegFrame {
  iteration: number
  theta_std: number[]
  intercept: number
  coefficients: number[]
  /** the line or plane through the shown predictors (other predictors held at their means) */
  display: { intercept: number; slopes: number[] }
  cost: number
  gradient_norm: number
  gradient: number[]
}

export interface LinRegTrace {
  algorithm: 'linreg_gd'
  n: number
  n_dropped: number
  response: string
  predictors: string[]
  shown: string[]
  held_at_mean: string[]
  means: Record<string, number>
  sds: Record<string, number>
  learning_rate: number
  iterations_run: number
  stop_reason: 'converged' | 'diverged' | 'max_iterations'
  points: { x: number[][]; y: number[]; labels: string[] | null }
  ols: { intercept: number; coefficients: number[]; r2: number; adj_r2: number; fitted: number[]; display: { intercept: number; slopes: number[] } }
  frames: LinRegFrame[]
  final: { cost: number; intercept: number; coefficients: number[] }
  initial_cost: number
  exact_display: boolean
  surface?: { theta0: number[]; theta1: number[]; cost: number[][]; minimum: { theta0: number; theta1: number; cost: number } }
  models?: { label: string; predictors: string[]; r2: number; adj_r2: number }[]
  diagnostics: { fitted: number[]; residuals: number[]; residual_sd: number; log_response_r2?: number }
  single_predictors?: { predictor: string; r: number; r2: number }[]
}

export interface LinRegConfig {
  dataset: string
  predictors: string[]
  response: string
  shown?: string[]
  learning_rate: number
  iterations: number
  label_column?: string
  compare?: { label: string; predictors: string[] }[]
  complete_on?: string[]
  rank_single?: string[]
}

export interface ManifestScene { id: string; title: string; narration: string[] }

export interface LessonPart {
  id: string
  kind: 'plane' | 'line'
  title: string
  unit: string
  units: string
  axes: { x1: string; x2?: string; y: string }
  config: LinRegConfig
  scenes: ManifestScene[]
  after?: ManifestScene
}

export interface GdManifest {
  id: string
  version: number
  algorithm: 'linreg_gd'
  book: string
  problem: string
  source_page: string
  exercise_id: string
  title: string
  summary: string
  objectives: string[]
  intro: { title: string; narration: string[] }
  parts: LessonPart[]
  outro: { title: string; narration: string[] }
  math: Record<string, string>
  controls: { learning_rate: { min: number; max: number; step: number }; iterations: { min: number; max: number; step: number } }
}
