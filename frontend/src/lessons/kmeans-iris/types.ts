/** Mirrors backend/app/ml/kmeans.py (KMeansTrace) — the single source of every number in the lesson. */

export interface PlusPlusStep {
  step: number
  chosen_index: number
  chosen_point: number[]
  random_draw: number | null
  d2: number[] | null
  probabilities: number[] | null
  chosen_probability: number
}

export interface KMeansIteration {
  iteration: number
  centroids_before: number[][]
  distances: number[][]
  labels: number[]
  changed: number
  inertia: number
  counts: number[]
  sums: number[][]
  centroids_after: number[][]
  movement: number[]
  total_shift_sq: number
  empty_clusters: number[]
  reseeded: { cluster: number; point_index: number }[]
  inertia_after_update: number
}

export interface KMeansTrace {
  n: number
  k: number
  features: string[]
  points: number[][]
  initialization: { method: string; seed: number; chosen_indices: number[]; centroids: number[][]; plusplus_steps: PlusPlusStep[]; explanation: string }
  iterations: KMeansIteration[]
  converged: boolean
  stop_reason: 'converged_labels' | 'converged_tol' | 'max_iterations'
  final_labels: number[]
  final_centroids: number[][]
  final_inertia: number
  final_distances: number[][]
  max_iter: number
  tol: number
  scaling: { method: string; means: number[]; sds: number[] } | null
  comparison_labels: string[]
  classes: string[]
  summary?: { crosstab_species_by_cluster: Record<string, Record<string, number>> }
}

export interface KMeansConfig {
  dataset: 'iris'
  features: string[]
  k: number
  init: 'k-means++' | 'random'
  seed: number
  max_iter: number
  tol: number
  standardize: boolean
}

export interface Simulation {
  id: string
  algorithm: string
  config: KMeansConfig
  cached: boolean
  trace: KMeansTrace
  created_at: string
}

export interface LessonManifest {
  id: string
  title: string
  summary: string
  objectives: string[]
  default_config: Omit<KMeansConfig, 'standardize'>
  scenes: { id: string; title: string; narration: string[] }[]
  math: Record<string, { formula: string; symbols?: Record<string, string> } | string>
  exercises: { prompt: string; kind: string }[]
  assessment: { question: string; answer: string }[]
}
