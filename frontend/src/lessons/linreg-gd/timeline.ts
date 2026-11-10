/**
 * Builds the regression / gradient-descent lesson timeline from the manifest and the real traces (one per part):
 * steps, scenes, narration cues (templates filled from the trace), camera keys and markers.
 * No algorithm values are computed here; only WHEN each recorded frame is shown and which numbers the narration quotes.
 */
import type { CameraKey, LessonTimeline, NarrationCue, SceneSpan, TimelineStep, Vec3 } from '../../engine/types'
import type { GdManifest, LessonPart, LinRegTrace, ManifestScene } from './types'

export type GdStepKind = 'title' | 'rise' | 'guess' | 'residuals' | 'bowl' | 'descend' | 'converged' | 'read' | 'models' | 'outro'
export interface GdPayload { part: number }
export type GdStep = TimelineStep<GdStepKind, GdPayload>
export type GdTimeline = LessonTimeline<GdStep>

/** reading time for one narration line (same pace as the cinematic activities) */
export const lineSeconds = (s: string) => 1.6 + s.length * 0.045

const fmt = (v: number) => {
  const a = Math.abs(v)
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(3)
  return a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(3) : v.toFixed(4)
}

const diag_log = (tr: LinRegTrace) => (tr.diagnostics.log_response_r2 !== undefined ? ` On log(${tr.response}) the same predictors give R² = ${tr.diagnostics.log_response_r2.toFixed(3)}, on a different scale.` : '')

export function fillTemplate(text: string, part: LessonPart | null, tr: LinRegTrace | null): string {
  if (!part || !tr) return text
  const f = tr.final
  const b = f.coefficients
  const names = tr.predictors.map((p) => (p === tr.shown[0] ? part.axes.x1 : p === tr.shown[1] ? part.axes.x2 ?? p : p.replace(/_/g, ' ')).replace(/ \(.*\)$/, ''))
  const term = (i: number) => (b[i] === undefined ? '' : `${b[i] >= 0 ? '+' : '−'} ${fmt(Math.abs(b[i]))} × ${names[i]}`)
  const stop = tr.stop_reason === 'converged'
    ? `Stopped after ${tr.iterations_run} iterations: the change in cost fell below the tolerance.`
    : tr.stop_reason === 'diverged'
      ? `Diverged after ${tr.iterations_run} iterations: with α = ${tr.learning_rate} each step overshoots and the cost explodes.`
      : `Stopped at the limit of ${tr.iterations_run} iterations, before the cost settled.`
  const held = tr.held_at_mean.length
    ? `The model also uses ${tr.held_at_mean.map((h) => h.replace(/_/g, ' ')).join(' and ')}; the plane you see is drawn with it held at its mean.`
    : ''
  const models = tr.models && tr.models.length > 1
    ? `R² rises from ${tr.models[0].r2.toFixed(3)} to ${tr.models[1].r2.toFixed(3)}, and adjusted R² from ${tr.models[0].adj_r2.toFixed(3)} to ${tr.models[1].adj_r2.toFixed(3)}: the expanded model accounts for more variation in these observed ratings. Whether it predicts new ${part.units} better requires separate validation.`
    : ''
  const sp = tr.single_predictors?.[0]
  const bestSingle = sp
    ? `Ranked by the strength of their sample correlation with ${part.axes.y.replace(/ \(.*\)$/, '')}, ${sp.predictor.replace(/_/g, ' ')} comes first: r = ${sp.r.toFixed(3)}, so on its own it accounts for ${(sp.r2 * 100).toFixed(1)} % of the observed variation. That is an in-sample association, not a cause.`
    : ''
  const diag = tr.diagnostics
    ? `R² alone cannot show whether the relationship is linear. The residual-versus-fitted plot in the Math panel can: a curve or a fan means a straight model misses structure.${diag_log(tr)}`
    : ''
  return text
    .replace(/\{best_single_sentence\}/g, bestSingle).replace(/\{diagnostic_sentence\}/g, diag)
    .replace(/\{title_part\}/g, part.title).replace(/\{n\}/g, String(tr.n)).replace(/\{units\}/g, part.units).replace(/\{unit\}/g, part.unit)
    .replace(/\{x1\}/g, part.axes.x1).replace(/\{x2\}/g, part.axes.x2 ?? '').replace(/\{response\}/g, part.axes.y.replace(/ \(.*\)$/, ''))
    .replace(/\{lr\}/g, String(tr.learning_rate)).replace(/\{j0\}/g, fmt(tr.initial_cost)).replace(/\{iters\}/g, String(tr.iterations_run))
    .replace(/\{reference_sentence\}/g, tr.stop_reason === 'converged' ? 'Gold marks the least-squares reference, which minimizes the same cost. The cyan fit should be close, within the stopping tolerance.' : 'Gold marks the least-squares reference. This run has not converged; compare the cyan fit with that target.')
    .replace(/\{outcome_title\}/g, tr.stop_reason === 'converged' ? 'Converged within tolerance' : tr.stop_reason === 'diverged' ? 'Cost is growing' : 'Iteration limit reached')
    .replace(/\{stop_sentence\}/g, stop).replace(/\{held_sentence\}/g, held).replace(/\{models_sentence\}/g, models)
    .replace(/\{b0\}/g, fmt(f.intercept)).replace(/\{b1_term\}/g, term(0)).replace(/\{b2_term\}/g, tr.predictors.length > 1 ? tr.predictors.slice(1).map((_, i) => term(i + 1)).join(' ') : '')
    .replace(/\{r2\}/g, tr.ols.r2.toFixed(3)).replace(/\{r2pct\}/g, `${(tr.ols.r2 * 100).toFixed(1)} %`)
}

const KEYWORDS = ['gradient', 'descent', 'cost', 'plane', 'line', 'residual', 'residuals', 'θ₀', 'θ₁', 'learning', 'rate', 'R²', 'bowl', 'least', 'squares', 'converged', 'diverged']

/** scene camera poses; the plane box is centred at the origin; line mode: data on the left, the cost bowl on the right */
const CAM = {
  wide: { p: [0, 2.2, 15] as Vec3, t: [0, 0, 0] as Vec3, fov: 46 },
  plane: { p: [7.5, 4.2, 10.5] as Vec3, t: [0, 0, 0] as Vec3, fov: 44 },
  planeLow: { p: [-6.5, 1.2, 10] as Vec3, t: [0, 0, 0] as Vec3, fov: 44 },
  data: { p: [-4.5, 0.4, 10.5] as Vec3, t: [-4.5, 0, 0] as Vec3, fov: 44 },
  bowl: { p: [2.5, 6, 17] as Vec3, t: [1.3, -0.5, 0] as Vec3, fov: 50 },
  both: { p: [0, 5, 19] as Vec3, t: [0, -0.5, 0] as Vec3, fov: 50 },
}

export function buildTimeline(manifest: GdManifest, traces: LinRegTrace[]): GdTimeline {
  const steps: GdStep[] = []
  const scenes: SceneSpan[] = []
  const cues: NarrationCue[] = []
  const cameraKeys: CameraKey[] = []
  let t = 0
  const cam = (tt: number, c: { p: Vec3; t: Vec3; fov: number }) => cameraKeys.push({ t: tt, position: c.p, target: c.t, fov: c.fov })
  const narrate = (start: number, end: number, lines: string[]) => {
    const total = lines.reduce((a, l) => a + lineSeconds(l), 0) || 1
    let s = start
    for (const l of lines) {
      const d = (lineSeconds(l) / total) * (end - start)
      cues.push({ start: s, end: s + d - 0.15, text: l, keywords: KEYWORDS })
      s += d
    }
  }
  const scene = (id: string, rawTitle: string, kind: GdStepKind, part: number, lines: string[], minDur = 4) => {
    const title = fillTemplate(rawTitle, manifest.parts[part] ?? null, traces[part] ?? null)
    const label = title
    const filled = lines.map((l) => fillTemplate(l, manifest.parts[part] ?? null, traces[part] ?? traces[traces.length - 1] ?? null)).filter((l) => l.trim())
    const dur = Math.max(minDur, filled.reduce((a, l) => a + lineSeconds(l), 0) + 0.8)
    const start = t
    steps.push({ id: `${id}-${steps.length}`, kind, sceneId: id, start, duration: dur, label, payload: { part } })
    t += dur
    scenes.push({ id, title, start, end: t })
    narrate(start + 0.4, t - 0.2, filled)
    return { start, end: t }
  }

  cam(0, CAM.wide)
  scene('intro', manifest.intro.title, 'title', 0, manifest.intro.narration, 5)

  manifest.parts.forEach((part, pi) => {
    const tr = traces[pi]
    const byId = (id: string): ManifestScene => part.scenes.find((s) => s.id === id) ?? { id, title: id, narration: [] }
    const pid = (id: string) => `${part.id}-${id}`
    if (part.kind === 'plane') {
      let r = scene(pid('rise'), byId('rise').title, 'rise', pi, byId('rise').narration, 7)
      cam(r.start + 0.6, CAM.planeLow); cam(r.end, CAM.plane)
      r = scene(pid('guess'), byId('guess').title, 'guess', pi, byId('guess').narration, 5)
      cam(r.end, CAM.plane)
      r = scene(pid('descend'), byId('descend').title, 'descend', pi, byId('descend').narration, 14)
      cam(r.start + (r.end - r.start) * 0.5, { ...CAM.plane, p: [9.5, 2.5, 6.5] }); cam(r.end, { ...CAM.plane, p: [6, 5.5, 11.5] })
      r = scene(pid('converged'), byId('converged').title, 'converged', pi, byId('converged').narration, 5)
      cam(r.end, CAM.plane)
      r = scene(pid('read'), byId('read').title, 'read', pi, byId('read').narration, 6)
      cam(r.end, { ...CAM.plane, p: [-7.5, 3.5, 9.5] })
    } else {
      let r = scene(pid('rise'), byId('rise').title, 'rise', pi, byId('rise').narration, 6)
      cam(r.start + 0.5, CAM.data); cam(r.end, CAM.data)
      r = scene(pid('guess'), byId('guess').title, 'guess', pi, byId('guess').narration, 4)
      r = scene(pid('residuals'), byId('residuals').title, 'residuals', pi, byId('residuals').narration, 6)
      cam(r.end, CAM.data)
      r = scene(pid('bowl'), byId('bowl').title, 'bowl', pi, byId('bowl').narration, 7)
      cam(r.start + 3, CAM.bowl); cam(r.end, CAM.bowl)
      r = scene(pid('descend'), byId('descend').title, 'descend', pi, byId('descend').narration, 14)
      cam(r.start + 1.2, CAM.both); cam(r.end, CAM.both)
      r = scene(pid('converged'), byId('converged').title, 'converged', pi, byId('converged').narration, 5)
      cam(r.start + 1, { ...CAM.bowl, p: [7, 3.2, 7.5] }); cam(r.end, { ...CAM.bowl, p: [7, 3.2, 7.5] })
      r = scene(pid('read'), byId('read').title, 'read', pi, byId('read').narration, 6)
      cam(r.start + 1, CAM.data); cam(r.end, CAM.data)
    }
    if (part.after) {
      const r = scene(`${part.id}-${part.after.id}`, part.after.title, 'models', pi, part.after.narration, 7)
      cam(r.start + 1, CAM.wide); cam(r.end, CAM.wide)
    }
    void tr
  })
  const last = manifest.parts.length - 1
  const r = scene('outro', manifest.outro.title, 'outro', last, manifest.outro.narration, 6)
  cam(r.start + 1, CAM.wide); cam(r.end, CAM.wide)

  const markers = steps.filter((s) => s.kind === 'descend').map((s) => ({ t: s.start, label: `${manifest.parts[s.payload.part].id}: descent` }))
  return { steps, scenes, cues, cameraKeys, markers, duration: t }
}
