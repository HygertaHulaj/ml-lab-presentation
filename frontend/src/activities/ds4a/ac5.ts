/** AC 5 (DS4A p. 399): the three scenarios, paraphrased, with the response variable each sentence names. */
import type { ExerciseDetail, SolveResult } from '../../types'
import type { Scene, TryItem } from '../types'

export const AC5_SCENARIOS = [
  { title: 'The top 100 IMDB movies', response: 'rank', text: 'For each movie we record rank, duration, genre, release year and cast, and we want to understand which variables are associated with a higher rank.' },
  { title: 'A presidential election', response: 'elected', text: 'We want to predict who will win, and we also want to know which characteristics and issues mattered for getting elected.' },
  { title: 'California fires', response: 'at risk or not', text: 'Historical fire, weather, urban-planning and tourism data: predict the areas most at risk so resources can be sent where they are needed.' },
]

type A5 = { problem: string; response_type: string; goal: string }

export function ac5Script(detail: ExerciseDetail, solve: SolveResult): Scene[] {
  const a = (i: number) => solve.answers[i].answer as A5
  const why = (i: number) => solve.answers[i].explanation || detail.questions[i]?.explanation || ''
  return [
    { id: 'intro', title: 'Two goals', lines: ['Supervised learning has two goals: prediction and inference.', 'And two kinds of response: a number (regression) or a category (classification).', 'Three scenarios. For each, fill in the blanks.'] },
    ...AC5_SCENARIOS.map((s, i) => ({
      id: `s${i}`, title: s.title,
      lines: [s.text, `The response, ${s.response}, is ${a(i).response_type}: a ${a(i).problem} problem.`, `The goal: ${a(i).goal}. ${why(i)}`],
    })),
    { id: 'summary', title: 'What we found', lines: ['The response decides regression or classification.', 'The question we are asking decides inference, prediction, or both.'] },
  ]
}

export function ac5Try(_d: ExerciseDetail, solve: SolveResult): TryItem[] {
  return AC5_SCENARIOS.flatMap((s, i) => {
    const a = solve.answers[i].answer as A5
    return [
      { id: `${i}p`, q: `${s.title}: classification or regression?`, options: ['classification', 'regression'], answer: a.problem },
      { id: `${i}t`, q: `${s.title}: the response (${s.response}) is…`, options: ['quantitative', 'categorical'], answer: a.response_type },
      { id: `${i}g`, q: `${s.title}: we are interested in…`, options: ['inference', 'prediction', 'both'], answer: a.goal },
    ]
  })
}
