export type Algorithm = 'linear_regression' | 'logistic_regression' | 'decision_tree' | 'gradient_descent'
export type Task = 'classification' | 'regression'

export interface ColumnInfo {
  name: string
  dtype: string
  kind: 'numeric' | 'categorical'
  missing: number
  unique: number
  min?: number | null
  max?: number | null
  mean?: number | null
  top_values?: Record<string, number> | null
}

export interface Dataset {
  id: string
  name: string
  source: string
  description: string
  origin: 'textbook' | 'example' | 'upload'
  row_count: number
  column_metadata: ColumnInfo[]
  created_at: string
}

export interface ExerciseSummary {
  id: string
  book: 'DS4A' | 'HoIDS'
  chapter: number
  exercise_number: string
  title: string
  category: string
  source_page: string
  kind: 'conceptual' | 'computational' | 'training'
  required_dataset: string | null
  origin: string
}

export interface ExerciseDetail extends ExerciseSummary {
  description: string
  concepts: string[]
  understand: string
  questions: { id: string; prompt: string; answer: unknown; explanation: string }[]
  interpretation: string
  common_mistakes: string[]
  python_code: string
  parameters: Record<string, unknown>
  notes: string[]
}

export interface Answer { id: string; answer: unknown; explanation?: string; exact?: number; prompt?: string }
export interface SolveResult { exercise_id: string; computed: boolean; answers: Answer[]; parameters: Record<string, unknown>; [k: string]: unknown }

export interface ExperimentInput {
  dataset_id: string
  algorithm: Algorithm
  task?: Task | null
  target_column: string
  feature_columns: string[]
  hyperparameters: Record<string, unknown>
  test_size: number
  random_seed: number
  positive_label?: string | null
  name?: string
}

export interface RunStatus {
  run_id: string
  experiment_id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  progress: number
  error: string | null
  duration_ms: number | null
  created_at: string
  completed_at: string | null
}

export interface Experiment extends Omit<ExperimentInput, 'task'> { id: string; task: Task; status: string; created_at: string }

export interface RunDetail extends RunStatus {
  experiment: Experiment
  metrics: Record<string, any> | null
  model_summary: Record<string, any> | null
}

export interface TreeNode {
  id: number
  depth: number
  parent: number
  is_leaf: boolean
  samples: number
  impurity: number
  left: number | null
  right: number | null
  feature?: string
  threshold?: number
  question?: string
  left_condition?: string
  right_condition?: string
  class_counts?: Record<string, number>
  prediction: string | number
  impurity_decrease?: number
}

export interface Tree {
  task: Task
  criterion: string
  classes: string[] | null
  n_nodes: number
  n_leaves: number
  n_splits: number
  depth: number
  features_used: string[]
  feature_importances: Record<string, number>
  nodes: TreeNode[]
}

export interface GDStep {
  iteration: number
  w: number
  b: number
  loss: number
  grad_w: number
  grad_b: number
  w_next: number
  b_next: number
  step_w: number
  step_b: number
}

export interface BinaryMetrics {
  counts: { tp: number; fp: number; fn: number; tn: number; total: number }
  accuracy: number
  misclassification_rate: number
  precision: number | null
  recall: number | null
  specificity: number | null
  negative_predictive_value: number | null
  f1: number | null
  calculations: Record<string, string>
}
