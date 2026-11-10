/**
 * Camera plan (docs/06-the-scan/04-camera-plan.md). Shot ids and boundaries match storyboard.json; this file adds
 * the world-space splines. A test checks the shot list against the storyboard.
 */
import type { ShotPath } from './CameraDirector'
import type { V3 } from './math'
import { F } from './sets/types'
import { DIG } from './sets/types'
import { JOURNEY } from './sets/digital'
import { LAB_POINTS as L } from './sets/lab'
import { FIELD } from './sets/datafield'

const d = (x: number, y: number, z: number): V3 => [DIG[0] + x, DIG[1] + y, DIG[2] + z]
const j = (x: number, y: number, z: number): V3 => [JOURNEY.origin[0] + x, JOURNEY.origin[1] + y, JOURNEY.origin[2] + z]
const lab = (x: number, y: number, z: number): V3 => [x, F + y, z]
const mid: V3 = lab((L.P2[0] + L.S[0]) / 2, 1.6, (L.P2[1] + L.S[1]) / 2)
const ws = L.workstation
const [fx, fy, fz] = FIELD.text

export const SHOTS: ShotPath[] = [
  // 1 — The Hospital Never Sleeps
  { id: '1A', start: 0, end: 6, path: [[-78, 74, 120], [-42, 48, 72], [-12, 27, 36]], look: [[0, 16, -34], [0, 12, -24]], fov: [34, 38], ease: 'sine' },
  { id: '1B', start: 6, end: 12.5, path: [[-12, 27, 36], [-4, 15.5, 15], [0, 9.4, 3.5]], look: [[0, 12, -24], [0, 9.2, -24]], fov: [38, 42], blend: 0.6 },
  { id: '1C', start: 12.5, end: 15, path: [[0, 9.4, 3.5], [0, 9.05, -14], [0.6, 8.95, -20.4]], look: [[0, 9.1, -26], [-2.5, 8.7, -26]], fov: [42, 48], ease: 'out', blend: 0.6 },
  // 2 — Meet Noé
  { id: '2A', start: 15, end: 24, path: [lab(-4.6, 1.6, -18.7), lab(-2.4, 1.55, -19.2), lab(0.6, 1.55, -20.4)], look: [lab(-8.0, 1.45, -21.0), lab(-5.0, 1.5, -22.2), lab(-2.2, 1.55, -23.4)], fov: [40, 42], blend: 1.4 },
  { id: '2B', start: 24, end: 30, path: [lab(-3.1, 1.78, -21.4), lab(-2.8, 1.82, -21.9)], look: [lab(-1.4, 1.95, -29.9), lab(1.6, 2.0, -29.9)], fov: [50, 48], blend: 1.0, hold: 0.4 },
  { id: '2C', start: 30, end: 35, path: [lab(-1.3, 1.62, -25.3), lab(-1.6, 1.63, -24.75)], look: [lab(-2.2, 1.5, -23.2), lab(-2.2, 1.56, -23.2)], fov: [50, 44], blend: 0.9 },
  // 3 — The Question
  { id: '3A', start: 35, end: 42.5, path: [lab(-2.3, 1.7, -22.6), lab(0.3, 1.75, -22.0), lab(2.7, 1.72, -22.8)], look: [mid, mid], fov: [44, 45], blend: 1.0 },
  { id: '3B', start: 42.5, end: 47, path: [lab(2.7, 1.72, -22.8), lab(4.6, 1.62, -22.6)], look: [mid, [ws[0], ws[1], ws[2]]], fov: [45, 48] },
  { id: '3C', start: 47, end: 50, path: [lab(4.6, 1.62, -22.6), lab(6.3, 1.45, -23.45), [ws[0] - 0.25, ws[1], ws[2]]], look: [[ws[0] + 1, ws[1], ws[2]], [ws[0] + 2, ws[1], ws[2]]], fov: [50, 70], ease: 'cubic', blend: 0.5 },
  // 4 — Introducing RadiologyML (enters through the boot screen)
  { id: '4A', start: 50, end: 58, path: [d(0, 5, 21), d(6, 5.4, 15), d(12.0, 6.0, 3.4)], look: [d(0, 5, 0), d(0, 4.4, 0)], fov: [62, 42], ease: 'out', cut: true },
  { id: '4B', start: 58, end: 70, path: [d(12.0, 6.0, 3.4), d(10.1, 5.6, 7.4), d(5.0, 5.4, 11.4), d(-3.0, 5.4, 12.1), d(-9.6, 5.6, 7.9), d(-6, 8.5, 3), d(0, 8.8, 0.7)], look: [d(0, 4.5, 0), d(0, 4.5, 0), d(0, 4.4, 0), d(0, 4.2, 0)], fov: [44, 50], blend: 0.8 },
  // 5 — Enter the Machine
  { id: '5A', start: 70, end: 76, path: [j(0.4, 11, 1.2), j(0, 7, 6), j(0, 4.6, 8.6)], look: [j(0.35, 0, 0), j(0, 0.6, -1)], fov: [50, 48], cut: true, ease: 'out' },
  { id: '5B', start: 76, end: 81, path: [j(0, 4.6, 8.6), j(1.4, 3.9, 5), j(2.0, 3.5, 3.0)], look: [j(0, 0.6, -1), j(2.0, 3.0, -1.4)], fov: [48, 52] },
  { id: '5C', start: 81, end: 87, path: [j(2.0, 3.5, 3.0), j(0.3, 6.2, 0.5), j(0, 8.4, -8), j(0, 5.6, -19)], look: [j(0, 3.6, -14), j(0, 3.4, -16), j(0, 3.6, -30)], fov: [54, 58], ease: 'sine' },
  { id: '5D', start: 87, end: 95, path: [j(0, 5.6, -19), j(-2.5, 5.0, -26), j(-3.6, 6.0, -31.5), j(-2.4, 6.5, -33.6)], look: [j(0, 3.6, -30), j(0, 4.8, -36), j(0, 6.2, -39)], fov: [55, 48] },
  // 6 — Learning from Mistakes
  { id: '6A', start: 95, end: 103, path: [lab(1.15, 2.02, -24.55), lab(1.45, 1.96, -24.95)], look: [L.monitor, L.monitor], fov: [46, 42], cut: true },
  { id: '6B', start: 103, end: 115, path: [lab(1.45, 1.96, -24.95), lab(0.4, 2.15, -23.4), lab(-0.6, 2.25, -22.3)], look: [L.monitor, L.holo, L.holo], fov: [44, 46] },
  // 7 — A Second Pair of Eyes
  { id: '7A', start: 115, end: 121, path: [lab(3.7, 1.72, -24.1), lab(3.05, 1.58, -25.2)], look: [L.monitor, L.monitor], fov: [46, 42], blend: 1.4 },
  { id: '7B', start: 121, end: 128, path: [lab(-0.4, 1.65, -22.9), lab(0.6, 1.62, -22.6)], look: [lab(2.4, 1.55, -26.2), lab(2.2, 1.55, -26.1)], fov: [45, 44], blend: 1.0 },
  { id: '7C', start: 128, end: 135, path: [lab(0.6, 1.62, -22.6), lab(0.4, 2.3, -20.6), lab(0.2, 2.7, -19.2)], look: [lab(1.0, 1.6, -26), lab(0.4, 1.7, -26.5)], fov: [44, 40] },
  // 8 — What Did the Machine Really Learn?
  { id: '8A', start: 135, end: 141, path: [lab(L.N3[0] - 0.15, 1.66, L.N3[1] + 1.7), lab(L.N3[0] - 0.1, 1.64, L.N3[1] + 1.35)], look: [lab(L.N3[0], 1.6, L.N3[1]), lab(L.N3[0], 1.62, L.N3[1])], fov: [50, 46], blend: 1.4 },
  { id: '8B', start: 141, end: 155, path: [lab(L.N3[0] - 0.1, 1.64, L.N3[1] + 1.35), lab(L.N3[0] + 3, 3.2, L.N3[1] + 5), lab(L.N3[0] + 8.5, 5.5, L.N3[1] + 2), lab(L.N3[0] + 9, 7.5, L.N3[1] - 6)], look: [lab(L.N3[0], 1.7, L.N3[1]), lab(L.N3[0], 2.2, L.N3[1] - 2.5), lab(L.N3[0], 2.4, L.N3[1] - 2.5)], fov: [46, 44] },
  // 9 — The Machine Learning Reveal
  { id: '9A', start: 155, end: 166, path: [lab(L.N3[0] + 9, 7.5, L.N3[1] - 6), [fx + 7, fy + 1.5, fz + 13], [fx, fy + 0.3, fz + 15.5]], look: [lab(L.N3[0], 2.4, L.N3[1] - 2.5), [fx, fy - 1.6, fz], [fx, fy - 2.3, fz]], fov: [44, 50], ease: 'sine' },
  { id: '9B', start: 166, end: 172, path: [[fx, fy + 0.3, fz + 15.5], [fx, fy + 0.1, fz + 12.5]], look: [[fx, fy - 2.3, fz], [fx, fy - 1.0, fz]], fov: [50, 50], ease: 'out' },
]

