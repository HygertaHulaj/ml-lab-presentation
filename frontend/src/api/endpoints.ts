import { http } from './client'
import type { Dataset, ExerciseDetail, ExerciseSummary, Experiment, ExperimentInput, RunDetail, RunStatus, SolveResult } from '../types'

export const api = {
  // exercises
  exercises: () => http.get<ExerciseSummary[]>('/exercises').then((r) => r.data),
  exercise: (id: string) => http.get<ExerciseDetail>(`/exercises/${id}`).then((r) => r.data),
  solve: (id: string, parameters: Record<string, unknown> = {}, dataset_id?: string | null) =>
    http.post<SolveResult>(`/exercises/${id}/solve`, { parameters, dataset_id: dataset_id || null }).then((r) => r.data),
  similar: (id: string) => http.get<{ prompt: string; answer: string; explanation: string; origin: string }[]>(`/exercises/${id}/similar`).then((r) => r.data),

  // datasets
  datasets: () => http.get<Dataset[]>('/datasets').then((r) => r.data),
  dataset: (id: string) => http.get<Dataset>(`/datasets/${id}`).then((r) => r.data),
  preview: (id: string, limit = 20, offset = 0) =>
    http.get<{ columns: string[]; rows: Record<string, unknown>[]; total_rows: number }>(`/datasets/${id}/preview`, { params: { limit, offset } }).then((r) => r.data),
  upload: (file: File, name?: string, description?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (name) fd.append('name', name)
    if (description) fd.append('description', description)
    return http.post<Dataset>('/datasets/upload', fd).then((r) => r.data)
  },

  // experiments & training
  experiments: (limit = 20) => http.get<Experiment[]>('/experiments', { params: { limit } }).then((r) => r.data),
  startTraining: (experiment: ExperimentInput, wait = false) =>
    http.post<RunStatus>('/training/start', { experiment }, { params: { wait } }).then((r) => r.data),
  runStatus: (id: string) => http.get<RunStatus>(`/training/${id}/status`).then((r) => r.data),
  run: (id: string) => http.get<RunDetail>(`/training/${id}`).then((r) => r.data),
  history: (id: string) => http.get<Record<string, any>>(`/training/${id}/history`).then((r) => r.data),

  predict: (run_id: string, inputs: Record<string, unknown>) =>
    http.post<{ id: string; prediction: unknown; probabilities: Record<string, number> | null; explanation: Record<string, any> }>('/predictions', { run_id, inputs }).then((r) => r.data),

  // evaluation & explanations
  confusion: (body: { tp: number; fp: number; fn: number; tn: number; positive_label?: string; negative_label?: string }) =>
    http.post<Record<string, any>>('/evaluation/confusion-matrix', body).then((r) => r.data),
  complexity: (body: Record<string, unknown>) => http.post<Record<string, any>>('/evaluation/complexity', body).then((r) => r.data),
  explanation: (id: string) => http.get<Record<string, any>>(`/explanations/${id}`).then((r) => r.data),
  steps: (id: string, params: Record<string, number> = {}) => http.get<Record<string, any>>(`/explanations/${id}/steps`, { params }).then((r) => r.data),

  // practice
  practiceCategories: () => http.get<{ categories: Record<string, string>; difficulties: string[] }>('/practice/categories').then((r) => r.data),
  practiceNew: (category: string, difficulty: string) => http.get<Record<string, any>>(`/practice/${category}/new`, { params: { difficulty } }).then((r) => r.data),
  practiceCheck: (problem_id: string, answers: Record<string, unknown>) =>
    http.post<{ correct: boolean; results: Record<string, { given: unknown; expected: unknown; correct: boolean }>; explanation: string[] }>('/practice/check', { problem_id, answers }).then((r) => r.data),
}

/** Start training in the background and poll the status endpoint until it finishes. */
export async function trainAndWait(exp: ExperimentInput, onProgress?: (s: RunStatus) => void): Promise<RunStatus> {
  let s = await api.startTraining(exp, false)
  onProgress?.(s)
  const started = Date.now()
  while (s.status === 'PENDING' || s.status === 'RUNNING') {
    await new Promise((r) => setTimeout(r, 300))
    s = await api.runStatus(s.run_id)
    onProgress?.(s)
    if (Date.now() - started > 180_000) throw new Error('Training is taking too long.')
  }
  return s
}
