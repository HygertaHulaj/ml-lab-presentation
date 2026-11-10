/**
 * Pose and expression library (joint rotations in radians, character faces +z).
 * Conventions: arm forward = negative x at the shoulder; elbow bend forward = negative x; left side = +x.
 */
export type Joint = 'hips' | 'spine' | 'chest' | 'neck' | 'head' | 'shL' | 'elL' | 'shR' | 'elR' | 'hipL' | 'knL' | 'hipR' | 'knR'
type R = [number, number, number]
export type Pose = Partial<Record<Joint, R>> & { hipDrop?: number }

export const POSES = {
  idle: { shL: [0, 0, 0.09], shR: [0, 0, -0.09], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0] },
  holdTablet: { shL: [-0.35, 0, 0.12], elL: [-1.25, 0, 0], shR: [0, 0, -0.1], elR: [-0.2, 0, 0] },
  readTablet: { shL: [-0.5, 0, 0.15], elL: [-1.35, 0, 0], shR: [-0.45, 0, -0.25], elR: [-1.1, 0, 0], head: [0.35, 0, 0], chest: [0.08, 0, 0] },
  point: { shR: [-1.35, 0.15, -0.12], elR: [-0.12, 0, 0], chest: [0, -0.12, 0] },
  pointL: { shL: [-1.35, -0.15, 0.12], elL: [-0.12, 0, 0], chest: [0, 0.12, 0] },
  gesture: { shR: [-0.95, 0.2, -0.65], elR: [-0.35, 0, 0], chest: [0, -0.18, 0], head: [0, -0.15, 0] },
  gestureL: { shL: [-0.95, -0.2, 0.65], elL: [-0.35, 0, 0], chest: [0, 0.22, 0] },
  typing: { shL: [-0.75, 0, 0.12], elL: [-0.85, 0, 0], shR: [-0.75, 0, -0.12], elR: [-0.85, 0, 0] },
  explain: { shL: [-0.35, 0, 0.2], elL: [-0.9, 0, 0], shR: [-0.35, 0, -0.2], elR: [-0.9, 0, 0] },
  chinThink: { shR: [-0.55, 0, -0.1], elR: [-2.15, 0, 0], shL: [-0.25, 0, 0.12], elL: [-1.35, 0.3, 0], head: [0.08, 0, 0.06] },
  listen: { head: [0.05, 0, 0.12], shL: [0, 0, 0.08], shR: [0, 0, -0.08], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0] },
  lookAround: { chest: [0, 0.18, 0], head: [-0.12, 0.25, 0] },
  lean: { spine: [0.16, 0, 0], chest: [0.1, 0, 0] },
  touchScreen: { shR: [-1.15, 0.1, -0.08], elR: [-0.45, 0, 0], spine: [0.08, 0, 0] },
  sit: { hipL: [-1.5, 0, 0.05], knL: [1.45, 0, 0], hipR: [-1.5, 0, -0.05], knR: [1.45, 0, 0], shL: [-0.65, 0, 0.1], elL: [-0.7, 0, 0], shR: [-0.65, 0, -0.1], elR: [-0.7, 0, 0], spine: [0.1, 0, 0], hipDrop: 0.42 },
  surprisedBody: { shL: [-0.2, 0, 0.25], shR: [-0.2, 0, -0.25], elL: [-0.6, 0, 0], elR: [-0.6, 0, 0], chest: [-0.06, 0, 0] },
  armsCrossed: { shL: [-0.45, 0, 0.1], elL: [-1.9, -0.6, 0], shR: [-0.45, 0, -0.1], elR: [-1.9, 0.6, 0] },
} satisfies Record<string, Pose>
export type PoseName = keyof typeof POSES

export interface Expression { browY: number; browAngle: number; browAsym?: number; mouth: number; open?: number; eye?: number }
export const EXPRESSIONS = {
  neutral: { browY: 0, browAngle: 0, mouth: 0.15 },
  smile: { browY: 0.006, browAngle: -0.05, mouth: 1, eye: 0.88 },
  curious: { browY: 0.008, browAngle: -0.08, browAsym: 0.016, mouth: 0.35 },
  concerned: { browY: 0.006, browAngle: 0.32, mouth: -0.7 },
  surprised: { browY: 0.022, browAngle: -0.12, mouth: 0, open: 0.75, eye: 1.18 },
  focused: { browY: -0.006, browAngle: 0.14, mouth: -0.1, eye: 0.85 },
  thoughtful: { browY: 0.004, browAngle: 0.12, browAsym: 0.01, mouth: -0.15, eye: 0.92 },
} satisfies Record<string, Expression>
export type ExpressionName = keyof typeof EXPRESSIONS
