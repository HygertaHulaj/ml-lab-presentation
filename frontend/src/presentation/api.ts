/** Presentation API calls (all numbers are computed by the backend). */
import { http } from '../api/client'

export interface RuleVsLearned {
  feature: string
  classes: { negative: string; positive: string }
  rule: string
  train: { x: number[]; positive: boolean[] }
  test: { x: number[]; positive: boolean[]; pred_learned: boolean[]; pred_human: boolean[] }
  candidates: { threshold: number; train_accuracy: number }[]
  learned: { threshold: number; train_accuracy: number; test_accuracy: number }
  human: { threshold: number; train_accuracy: number; test_accuracy: number }
  split: { test_fraction: number; seed: number; n_train: number; n_test: number }
  source: string
}

export interface JRecord { id: number; sepal_length_cm: number; sepal_width_cm: number; petal_length_cm: number; petal_width_cm: number; species: string }
export interface JSplit { order: number; node: number; left: number; right: number; depth: number; feature: string; threshold: number; n: number; gini: number; counts: Record<string, number>; box: Record<string, [number, number]> }
export interface JLeaf { node: number; depth: number; class: string; counts: Record<string, number>; box: Record<string, [number, number]>; n: number }
export interface JPrediction { id: number; truth: string; predicted: string; correct: boolean; path: ({ node: number; feature: string; threshold: number; value: number; goes: 'left' | 'right' } | { node: number; leaf: true })[] }
export interface LearningJourney {
  source: string
  classes: string[]
  features_all: string[]
  features: [string, string]
  records: JRecord[]
  prepare: { n_raw: number; missing: Record<string, number>; duplicates: { removed: number; same_as: number }[]; n_clean: number; tidy: boolean }
  feature_scores: { feature: string; f_score: number; computed_on: 'training' }[]
  split: { seed: number; test_fraction: number; train_ids: number[]; test_ids: number[] }
  model: { type: string; max_depth: number; splits: JSplit[]; leaves: JLeaf[]; bounds: Record<string, [number, number]> }
  predictions: JPrediction[]
  evaluation: { labels: string[]; confusion: number[][]; train_accuracy: number; test_accuracy: number; precision: Record<string, number>; recall: Record<string, number>; support: Record<string, number>; by_depth: { depth: number; train_accuracy: number; cv_accuracy: number; test_accuracy: number }[]; selected_depth: number; selection: string }
}

export interface AnalyzeProduce {
  source: string; x: number[]; y: number[]; learning_rate: number; iterations_run: number; stop_reason: string
  frames: { iteration: number; w: number; b: number; loss: number }[]
  final: { w: number; b: number; loss: number }; ols: { w: number; b: number }
  new_data: { x: number; prediction: number }[]
}

export interface TreeNode {
  id: number; depth: number; parent: number; is_leaf: boolean; samples: number; impurity: number; left: number | null; right: number | null
  feature?: string; threshold?: number; question?: string; left_condition?: string; right_condition?: string
  class_counts?: Record<string, number>; prediction: string | number
}
export interface ConceptTree {
  dataset: string; target: string; features: string[]; task: 'classification' | 'regression'; max_depth: number; min_n: number; n: number
  tree: { task: string; classes: string[] | null; n_nodes: number; n_leaves: number; n_splits: number; depth: number; features_used: string[]; feature_importances: Record<string, number>; nodes: TreeNode[] }
  leakage: string[]; correct?: number; accuracy?: number; rmse?: number; r2?: number
  official_split?: { n_train: number; n_test: number; train_accuracy: number; test_accuracy: number; n_leaves: number }
}
export interface CarseatsExplore { by_shelf: { shelf_location: string; High: number; Low: number; share_high: number }[]; price_sales: { price: number[]; sales: number[]; r: number }; n: number }
export const CARSEAT_FEATURES = ['competitor_price', 'income', 'advertising', 'population', 'price', 'age', 'education', 'shelf_location', 'urban', 'us']
export const PENGUIN_FEATURES = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g', 'island', 'sex']

export interface BinaryMetrics { tp: number; fp: number; fn: number; tn: number; n: number; accuracy: number; misclassification: number; precision: number | null; recall: number | null; specificity: number | null; specificity_book_formula: number | null }
export interface RegScores { mse: number; r2: number }
export interface FitModel { complexity: number; label: string; curve: number[]; train_mse: number; test_mse: number }
export interface Evaluation {
  classification: { max_depth: number; min_n: number; positive: string; n_train: number; n_test: number; train_accuracy: number; metrics: BinaryMetrics; stores: { actual: string; predicted: string }[] }
  book_table_8_3: { tp: number; fp: number; fn: number; tn: number }
  regression: { max_depth: number; min_n: number; target: string; unit: string; test: RegScores; train: RegScores; baseline_mse: number; points: { actual: number; predicted: number }[] }
  no_free_lunch: { problem: string; task: string; n_train: number; n_test: number; best: string; results: { method: string; metric: 'accuracy' | 'mse'; value: number }[] }[]
  fit_curve: { seed: number; noise_sd: number; irreducible_mse: number; synthetic: boolean; train: { x: number; y: number }[]; grid: number[]; truth: number[]; models: FitModel[]; sweep: { complexity: number; train_mse: number; cv_mse: number; test_mse: number }[]; best_complexity: number; lowest_test_complexity: number; selection: string; curves: { complexity: number; curve: number[] }[] }
  depth_sweep: { depth: number; train_accuracy: number; cv_accuracy: number; test_accuracy: number }[]
  depth_selection: { selected_depth: number; cv_accuracy: number; test_accuracy: number; criterion: string }
  fit_exercise: { model: number; training: number[][]; testing: number[][]; train_accuracy: number; test_accuracy: number; verdict: string; fit_training: boolean; predicted_test: boolean }[]
}

export interface DigitReading { pixels: number[]; layers: number[][]; probabilities: number[]; prediction: number; label?: number; index?: number }
export interface DeepLearning {
  dataset: { name: string; n: number; n_train: number; n_test: number; image: [number, number]; shading_max: number }
  architecture: number[]; n_weights: number; iterations: number; loss_curve: number[]
  train_accuracy: number; test_accuracy: number; n_wrong: number
  examples: DigitReading[]; misclassified: DigitReading[]
  learning_curves: { method: string; points: { n: number; accuracy: number }[] }[]
}

export interface DataQuality {
  dataset: { digits_train: number; digits_test: number }
  freshness: { simulated: boolean; shading_factor: number; n_test: number; old_model_on_old: number; retraining: { fresh_images: number; accuracy_new_scanner: number; accuracy_old_scanner: number }[]; example: { label: number; old: number[]; new: number[] } }
  volume: { n: number; accuracy: number }[]
  diversity: { island: string; n_test: number; by_island: ({ island: string } & Record<'Adelie' | 'Chinstrap' | 'Gentoo', number>)[]; models: { name: string; n_train: number; species_seen: string[]; accuracy: number; recall: Record<string, number>; n_test: Record<string, number> }[] }
  quality: { example_label: number; resolution: { side: number; accuracy: number; example: number[] }[]; label_noise: { wrong_labels: number; n_wrong: number; accuracy: number }[] }
}

export interface EthicsPoint { n_minority: number; share: number; minority_error: number; majority_error: number; overall_accuracy: number }
export interface Ethics {
  minority: string; draws: number; train_counts: Record<string, number>; test_counts: Record<string, number>
  sweep: EthicsPoint[]; mitigation: { n_minority: number; before: EthicsPoint; after_reweighting: EthicsPoint }
}

export interface MovieHoldoutModel { id: string; label: string; predictors: string[]; fitted_r2_all: number; train_r2: number; train_mse: number; test_r2: number; test_mse: number }
export interface MovieHoldout {
  source: string; n: number; n_train: number; n_test: number; seed: number; test_fraction: number; baseline_test_mse: number
  models: MovieHoldoutModel[]
  budget_test_r2_over_seeds: { seeds: number; min: number; median: number; max: number }
  movies: { label: string; budget: number; rating: number; set: 'train' | 'test'; budget_prediction: number }[]
}

/** One request per result: a slide reached while the same request is running reuses it (a failed one is retried). */
const inflight = new Map<string, Promise<unknown>>()
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key) as Promise<T> | undefined
  if (hit) return hit
  const p = load().catch((e) => { inflight.delete(key); throw e })
  inflight.set(key, p)
  return p
}

export const presentationApi = {
  movieHoldout: () => http.get<MovieHoldout>('/concepts/movie-holdout').then((r) => r.data),
  ethics: () => once('ethics', () => http.get<Ethics>('/concepts/ethics').then((r) => r.data)),
  dataQuality: () => once('dataQuality', () => http.get<DataQuality>('/concepts/data-quality').then((r) => r.data)),
  deepLearning: () => http.get<DeepLearning>('/concepts/deep-learning').then((r) => r.data),
  predictDigit: (pixels: number[]) => http.post<DigitReading>('/concepts/digits/predict', { pixels }).then((r) => r.data),
  evaluation: () => once('evaluation', () => http.get<Evaluation>('/concepts/evaluation').then((r) => r.data)),
  tree: (q: { dataset?: string; target?: string; features: string[]; max_depth?: number; min_n?: number }) =>
    http.get<ConceptTree>('/concepts/tree', { params: { dataset: q.dataset ?? 'carseats', target: q.target ?? 'sales_cat', features: q.features.join(','), max_depth: q.max_depth ?? 1, min_n: q.min_n ?? 2 } }).then((r) => r.data),
  carseatsExplore: () => http.get<CarseatsExplore>('/concepts/carseats-explore').then((r) => r.data),
  analyzeAndProduce: () => http.get<AnalyzeProduce>('/concepts/analyze-and-produce').then((r) => r.data),
  learningJourney: () => http.get<LearningJourney>('/concepts/learning-journey').then((r) => r.data),
  /** Online version only (VITE_WARMUP=1): compute the three slow results in the background, in talk order. */
  async warmUp() {
    for (const load of [presentationApi.evaluation, presentationApi.dataQuality, presentationApi.ethics]) {
      try { await load() } catch { /* the slide itself shows the error and retries */ }
    }
  },
  ruleVsLearned: (humanThreshold: number) =>
    http.get<RuleVsLearned>('/concepts/rule-vs-learned', { params: { human_threshold: humanThreshold } }).then((r) => r.data),
}
