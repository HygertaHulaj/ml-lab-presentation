import axios, { AxiosError } from 'axios'

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

// 10 minutes: on the free online server a heavy first computation (ethics, data quality) can take about 5 minutes
export const http = axios.create({ baseURL: `${API_BASE}/api/v1`, timeout: 600_000 })

export class ApiError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message)
  }
}

/** Normalises the backend's {"error": {...}} contract and network failures into ApiError. */
http.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: { message: string; details?: unknown } }>) => {
    if (!err.response) {
      return Promise.reject(new ApiError('Cannot reach the API server. Is the backend running on ' + API_BASE + '?'))
    }
    const body = err.response.data?.error
    let msg = body?.message ?? err.message
    if (Array.isArray(body?.details) && body.details.length) {
      msg += ' ' + (body.details as { field: string; message: string }[]).map((d) => `${d.field}: ${d.message}`).join('; ')
    }
    return Promise.reject(new ApiError(msg, err.response.status, body?.details))
  },
)

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
