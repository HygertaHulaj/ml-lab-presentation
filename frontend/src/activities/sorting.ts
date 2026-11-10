/**
 * Script and Try items for sorting activities, built from the exercise's own questions (prompt + explanation) and the
 * solver's answers (the bin each item belongs to). Pure functions; tested in tests/activities.spec.ts.
 */
import type { ExerciseDetail, SolveResult } from '../types'
import type { Scene, TryItem } from './types'
import type { SortItem } from './visuals/SortBoard.vue'

export function sortItems(detail: ExerciseDetail, solve: SolveResult, label: (prompt: string) => string = (p) => p): SortItem[] {
  return solve.answers.map((a, i) => {
    const q = detail.questions.find((x) => x.id === a.id) ?? detail.questions[i]
    return { label: label(q?.prompt ?? String(a.id)), bin: String(a.answer), why: a.explanation || q?.explanation || '' }
  })
}

export function sortScript(items: SortItem[], o: { intro: string[]; bins: string[]; summary: (counts: Record<string, number>) => string[] }): Scene[] {
  const counts: Record<string, number> = {}
  for (const it of items) counts[it.bin] = (counts[it.bin] ?? 0) + 1
  return [
    { id: 'intro', title: 'The question', lines: o.intro },
    { id: 'bins', title: 'How to decide', lines: o.bins },
    { id: 'sort', title: 'One by one', lines: items.map((it) => `${it.label.replace(/\.$/, '')}: ${it.why || it.bin}`) },
    { id: 'summary', title: 'What we found', lines: o.summary(counts) },
  ]
}

export const sortTry = (items: SortItem[], options: string[]): TryItem[] =>
  items.map((it, i) => ({ id: `s${i}`, q: it.label, options, answer: it.bin, why: it.why }))

/** "Calendar Data: the app syncs…" → "Calendar Data" */
export const beforeColon = (s: string) => (s.includes(':') ? s.slice(0, s.indexOf(':')) : s)
