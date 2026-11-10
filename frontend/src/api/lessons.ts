import { http } from './client'
import type { KMeansConfig, LessonManifest, Simulation } from '../lessons/kmeans-iris/types'

export interface IrisDataset {
  id: string
  n: number
  features: string[]
  units: string
  observations: number[][]
  comparison_labels: string[]
  classes: string[]
  note: string
}

export const lessonsApi = {
  iris: () => http.get<IrisDataset>('/datasets/iris').then((r) => r.data),
  lesson: (id: string) => http.get<LessonManifest>(`/lessons/${id}`).then((r) => r.data),
  kmeans: (cfg: Partial<KMeansConfig>) => http.post<Simulation>('/simulations/kmeans', cfg).then((r) => r.data),
  simulation: (id: string) => http.get<Simulation>(`/simulations/${id}`).then((r) => r.data),
  progress: (body: { learner_id: string; lesson_id: string; scene_id: string; position: number; mode: string; completed_scenes: string[]; simulation_id?: string | null }) =>
    http.post('/progress', body).then((r) => r.data),
  save: (simId: string, learner_id: string, name: string) => http.post(`/simulations/${simId}/save`, { learner_id, name }).then((r) => r.data),
  saved: (learner_id: string) => http.get<{ id: string; name: string; simulation_id: string; config: KMeansConfig; final_inertia: number; iterations: number; stop_reason: string }[]>('/saved-experiments', { params: { learner_id } }).then((r) => r.data),
}

/** Anonymous, per-browser learner id for progress (no account needed). */
export function learnerId(): string {
  const key = 'mllab.learner'
  try {
    let v = localStorage.getItem(key)
    if (!v) {
      v = 'l_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      localStorage.setItem(key, v)
    }
    return v
  } catch {
    return 'l_session_' + Math.random().toString(36).slice(2, 12)
  }
}
