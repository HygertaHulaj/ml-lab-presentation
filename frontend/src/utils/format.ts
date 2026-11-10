export function fmt(v: unknown, digits = 4): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—'
    if (Number.isInteger(v)) return v.toString()
    const a = Math.abs(v)
    if (a !== 0 && (a < 1e-4 || a >= 1e7)) return v.toExponential(3)
    return Number(v.toFixed(digits)).toString()
  }
  return String(v)
}

export const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(d)}%`)

export const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
