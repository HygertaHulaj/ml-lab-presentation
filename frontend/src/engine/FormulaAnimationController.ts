import { clamp } from './easing'

/**
 * Maps the progress (0..1) of a calculation step onto the stages of a formula, so the math panel can highlight
 * the stage that the 3D scene is animating at the same moment.
 */
export class FormulaAnimationController<Stage extends string> {
  constructor(private stages: { id: Stage; from: number; to: number }[]) {}

  stageAt(p: number): Stage | null {
    const x = clamp(p)
    for (const s of this.stages) if (x >= s.from && x < s.to) return s.id
    return x >= 1 ? this.stages[this.stages.length - 1].id : null
  }

  /** Whether `stage` has been reached by progress `p` (used to reveal intermediate results in order). */
  reached(stage: Stage, p: number): boolean {
    const s = this.stages.find((x) => x.id === stage)
    return !!s && p >= s.from
  }
}

/** Distance-calculation stages shared by the 3D scene and the math panel. */
export const distanceStages = new FormulaAnimationController<'focus' | 'lines' | 'subtract' | 'square' | 'sum' | 'sqrt' | 'compare' | 'assign'>([
  { id: 'focus', from: 0, to: 0.1 },
  { id: 'lines', from: 0.1, to: 0.2 },
  { id: 'subtract', from: 0.2, to: 0.36 },
  { id: 'square', from: 0.36, to: 0.52 },
  { id: 'sum', from: 0.52, to: 0.66 },
  { id: 'sqrt', from: 0.66, to: 0.8 },
  { id: 'compare', from: 0.8, to: 0.9 },
  { id: 'assign', from: 0.9, to: 1.01 },
])
