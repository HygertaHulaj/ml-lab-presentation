/**
 * Cinematic activities: the end-of-chapter exercises (DS4A "Applying the Concepts", Shah "Hands-On Problems") played
 * as short films with Story / Try / Solution modes. Every number comes from the exercise's backend solver
 * (`POST /exercises/{id}/solve`); an activity only decides how to *show* it.
 */
import type { Component } from 'vue'
import type { ExerciseDetail, SolveResult } from '../types'

export interface Scene {
  id: string
  title: string
  /** caption lines, read one after another; the scene lasts as long as its lines take to read */
  lines: string[]
}

export interface TryItem {
  id: string
  q: string
  /** choices; when absent the answer is a number typed by the student */
  options?: string[]
  answer: string | number
  /** for numeric answers: accepted absolute difference (e.g. 0.005 for two decimal places) */
  tolerance?: number
  why?: string
}

export interface VisualProps {
  scene: string
  /** progress through the current scene, 0..1 (Story); 1 when browsing */
  p: number
  /** index of the caption line being read */
  line: number
  /** progress through that line, 0..1 */
  lp: number
  detail: ExerciseDetail
  solve: SolveResult
}

export interface ActivityDef {
  id: string
  book: 'DS4A' | 'HoIDS'
  label: string
  title: string
  page: string
  blurb: string
  tone: string
  script: (detail: ExerciseDetail, solve: SolveResult) => Scene[]
  tryItems: (detail: ExerciseDetail, solve: SolveResult) => TryItem[]
  visual: () => Promise<{ default: Component }>
  /** the matching 3D cinematic lesson (/lessons/:id), when there is one */
  lesson?: string
}
