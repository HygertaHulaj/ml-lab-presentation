/**
 * Scripts (Story scenes) and Try items for DS4A Chapter 8 "Applying the Concepts" (book pp. 398–401).
 * Wording paraphrases the book; every number is read from the solver output passed in. Pure functions.
 */
import type { ExerciseDetail, SolveResult } from '../../types'
import type { Scene, TryItem } from '../types'
import { beforeColon, sortItems, sortScript, sortTry } from '../sorting'

const ans = <T = unknown>(s: SolveResult, i: number) => s.answers[i]?.answer as T
const f2 = (v: number) => v.toFixed(2)
/** STAR captions from the solver's own STAR answer: "Scope: <its first sentence>" */
const starLines = (s: SolveResult, i: number) =>
  Object.entries(ans<Record<string, unknown>>(s, i) ?? {}).filter(([k]) => /^[A-Z]/.test(k)).map(([k, v]) => `${k}: ${String(v).split(/(?<=\.)\s/)[0]}`)

// AC 1 · Identify Artificial Intelligence (p. 398)
export const ac1Script = (d: ExerciseDetail, s: SolveResult): Scene[] => sortScript(sortItems(d, s), {
  intro: ['Eight everyday things. Which of them use artificial intelligence, in most cases?', 'A keyboard, a stopwatch, a voice assistant, e-scooters… Decide before the answer lands.'],
  bins: ['AI means a computer system doing a task that normally needs human intelligence: perception, language, judgement.', 'If it only follows fixed rules or a mechanism, it is not AI.'],
  summary: (c) => [`${c.AI ?? 0} of the 8 use AI; ${c['Not AI'] ?? 0} do not.`, 'The test: does it learn from data to do a human-like task, or does it just follow fixed rules?'],
})
export const ac1Try = (d: ExerciseDetail, s: SolveResult): TryItem[] => sortTry(sortItems(d, s), ['AI', 'Not AI'])

// AC 2 · Identify Data Ingestion, Data Analysis, and Results (p. 398)
export const ac2Script = (d: ExerciseDetail, s: SolveResult): Scene[] => sortScript(sortItems(d, s, beforeColon), {
  intro: ['Meet the "Physical Fitness Assistant": an app that helps athletes keep their diet and exercise plans.', 'It reads calendars, tracks eating habits, monitors activity and asks how the athlete feels.', 'Nine features. Which step of the machine-learning process is each one?'],
  bins: ['Step 1: data goes in. Step 2: the data are analysed and a model is fitted. Step 3: the model produces results the user sees.'],
  summary: (c) => [`${c['Step 1: Ingesting Data'] ?? 0} features ingest data, ${c['Step 2: Analyzing the Data'] ?? 0} analyse it, ${c['Step 3: Producing Model-Based Results'] ?? 0} produce results.`, 'The feedback loop closes the circle: results create new data, which goes back into Step 1.'],
})
export const ac2Try = (d: ExerciseDetail, s: SolveResult): TryItem[] =>
  sortTry(sortItems(d, s, beforeColon), ['Step 1: Ingesting Data', 'Step 2: Analyzing the Data', 'Step 3: Producing Model-Based Results'])

// AC 4 · Regression versus Classification (p. 399)
export const ac4Script = (d: ExerciseDetail, s: SolveResult): Scene[] => sortScript(sortItems(d, s), {
  intro: ['Six machine-learning problems. For each response variable: regression or classification?'],
  bins: ['Only the response decides. A quantitative response means regression; a categorical response means classification.'],
  summary: (c) => [`${c.Regression ?? 0} regression problems, ${c.Classification ?? 0} classification problems.`, 'Wine quality on a 1–10 scale is numeric and ordered, so regression is the natural fit.'],
})
export const ac4Try = (d: ExerciseDetail, s: SolveResult): TryItem[] => sortTry(sortItems(d, s), ['Regression', 'Classification'])

// AC 3 · Reading a Decision Tree (p. 399)
export function ac3Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const ds = s.dataset as { rows: number; features: string[] }
  const a4 = ans<Record<string, number>>(s, 3)
  const lc = s.leaf_correct as { accuracy: number }
  const tree = s.tree as { nodes: { class_counts?: Record<string, number>; threshold?: number; feature?: string }[] }
  const root = tree.nodes[0]
  return [
    { id: 'intro', title: 'The college data', lines: [`${ds.rows} US colleges, ${ds.features.length} numeric variables.`, 'The question: is a college private? We fit a decision tree with one split.'] },
    { id: 'root', title: 'The top node', lines: [`Before any question, the tree sees ${root.class_counts?.Yes} private and ${root.class_counts?.No} public colleges.`, `So, knowing nothing else about a new college, predict: ${ans<string>(s, 0)}.`] },
    { id: 'split', title: 'The split', lines: [`The tree asks one question, about ${ans<string>(s, 1)}: the number of full-time undergraduates.`, `Small colleges (≤ ${root.threshold}) go left; large ones go right.`, `So a college with at least ${Math.round((root.threshold ?? 0) + 1)} full-time undergraduates is predicted: ${ans<string>(s, 2)}.`] },
    { id: 'flow', title: 'Every college takes the path', lines: ['Watch all the colleges flow down the tree. Each dot is one college, coloured by what it really is.'] },
    { id: 'leaves', title: 'Counting the leaves', lines: [`The left leaf predicts private for ${a4.private_predictions} colleges; ${a4.correct_private} of them really are.`, `The right leaf predicts public for ${a4.public_predictions}; ${a4.correct_public} really are.`, `In total, ${a4.total_correct} of ${a4.out_of} correct: ${(lc.accuracy * 100).toFixed(1)} %.`] },
    { id: 'star', title: 'STAR', lines: starLines(s, 4) },
  ]
}
export function ac3Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const a4 = ans<Record<string, number>>(s, 3)
  return [
    { id: '1', q: 'Without knowing anything else about a new college, would you predict it to be private?', options: ['Yes — private', 'No — public'], answer: String(ans(s, 0)).startsWith('Yes') ? 'Yes — private' : 'No — public' },
    { id: '2', q: 'On which variable did the tree split?', options: ['f_undergrad', 'outstate', 'apps', 'top_10_perc'], answer: String(ans(s, 1)) },
    { id: '3', q: 'A college with f_undergrad of at least 2995: public or private?', options: ['Public', 'Private'], answer: String(ans(s, 2)) },
    { id: '4a', q: 'How many public predictions would you make?', answer: a4.public_predictions, tolerance: 0 },
    { id: '4b', q: 'How many private predictions?', answer: a4.private_predictions, tolerance: 0 },
    { id: '4c', q: 'How many correct predictions in total?', answer: a4.total_correct, tolerance: 0 },
  ]
}

// AC 6 · Interpretability versus Complexity (p. 400)
type Sum6 = { max_depth: number; actual_depth: number; splits: number; leaves: number; correct: number; n: number; training_accuracy: number }
export function ac6Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const sm = s.summary as Sum6[]
  const top = String(ans(s, 0)).replace(/_/g, ' ')
  return [
    { id: 'intro', title: 'Three trees', lines: ['333 penguins. Predict the species with three trees: max depth 1, 5 and 7.'] },
    { id: 'grow', title: 'Growing', lines: ['Watch them grow, one level at a time.', 'The deeper the tree may grow, the more questions it can ask.'] },
    { id: 'top', title: 'The first question', lines: [`All three start with the same question: ${top}.`, 'The most useful single split is the same, however deep the tree may grow.'] },
    { id: 'accuracy', title: 'How many right?', lines: sm.map((x) => `Max depth ${x.max_depth}: ${x.splits} split${x.splits === 1 ? '' : 's'}, ${x.leaves} leaves, ${x.correct} of ${x.n} penguins correct.`) },
    { id: 'identical', title: 'A surprise', lines: [`The depth-7 tree is identical to the depth-5 tree: it stops at depth ${sm[2]?.actual_depth}.`, 'Every leaf is already pure. Max depth is an upper limit, not a target.'] },
    { id: 'rank', title: 'Interpretable or complex?', lines: ['The first tree asks one question: the most interpretable, the least complex.', 'The deepest tree asks the most questions: more complex, harder to explain.'] },
    { id: 'star', title: 'STAR', lines: starLines(s, 3) },
  ]
}
export function ac6Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const r = ans<Record<string, string>>(s, 2)
  return [
    { id: '1', q: 'Which variable appears at the top of all three trees?', options: ['flipper_length_mm', 'bill_length_mm', 'island', 'body_mass_g'], answer: String(ans(s, 0)) },
    { id: '2', q: 'Which tree is most accurate on the penguins?', options: ['max depth 1', 'max depth 5 (tied with 7)', 'max depth 7 only'], answer: 'max depth 5 (tied with 7)', why: String(s.answers[1]?.explanation ?? '') },
    { id: '3a', q: 'The most interpretable, least complex tree is the…', options: ['first', 'second', 'third'], answer: r.most_interpretable_least_complex },
    { id: '3b', q: '…because it contains…', options: ['a single split', 'the most splits'], answer: r.because_first },
    { id: '3c', q: 'The deepest tree uses ___ variables to improve predictions.', options: ['fewer', 'more'], answer: r.variables },
    { id: '3d', q: 'So many questions make it ___ to characterise the relationships.', options: ['more challenging', 'easier'], answer: r.characterize },
  ]
}

// AC 7 · Calculate Accuracy, Precision, Recall, and Specificity (p. 400)
type M7 = { counts: { tp: number; fp: number; fn: number; tn: number; total: number }; accuracy: number; precision: number; recall: number; specificity: number; calculations: Record<string, string> }
export function ac7Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const m = s.metrics as M7
  const rules = s.rules as { conditions: string[]; prediction: string }[]
  return [
    { id: 'intro', title: 'The car seat stores', lines: ['Train on 319 stores, test on 81 unseen ones.', 'A decision tree allowed only one question (max depth 1, min n 2, seed 1234). Positive = High sales.'] },
    { id: 'tree', title: 'One question', lines: rules.map((r) => `If ${r.conditions.join(' and ').replace(/_/g, ' ')}: predict ${r.prediction}.`) },
    { id: 'flow', title: 'Testing on 81 new stores', lines: ['Each test store gets a prediction, and lands in one cell of the confusion matrix.'] },
    { id: 'metrics', title: 'Four numbers', lines: [
      `Accuracy: ${m.calculations.accuracy} = ${f2(m.accuracy)}.`,
      `Precision: when it says High, it is right ${m.calculations.precision} = ${f2(m.precision)}.`,
      `Recall: of the truly High stores, it finds ${m.calculations.recall} = ${f2(m.recall)}.`,
      `Specificity: of the truly Low stores, it labels ${m.calculations.specificity} = ${f2(m.specificity)}.`,
    ] },
    { id: 'star', title: 'STAR', lines: starLines(s, 4) },
  ]
}
export function ac7Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const m = s.metrics as M7
  return (['accuracy', 'precision', 'recall', 'specificity'] as const).map((k) => ({ id: k, q: `${k[0].toUpperCase()}${k.slice(1)} on the test data (two decimals)`, answer: m[k], tolerance: 0.006, why: m.calculations[k] }))
}

// AC 8 · Overfitted, Underfitted, and Well-Fitted Models (pp. 400–401)
type T8 = { model: string; dataset: string; accuracy: number; calculation: string }
export function ac8Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const t = s.accuracy_table as T8[]
  const c = s.conclusions as Record<string, { label: string; reason: string }>
  return [
    { id: 'intro', title: 'Three models', lines: ['Three models of different complexity, each with a confusion matrix on the training data and on the test data.'] },
    { id: 'cells', title: 'The four cells', lines: ['True positive: predicted 1, actually 1. True negative: predicted 0, actually 0.', 'False positive: predicted 1, actually 0. False negative: predicted 0, actually 1.'] },
    { id: 'accuracy', title: 'The accuracy column', lines: t.map((r) => `${r.model.replace('model_', 'Model ')}, ${r.dataset}: ${r.calculation} = ${f2(r.accuracy)}.`) },
    { id: 'bars', title: 'Training versus test', lines: ['Compare each model on the data it learned from and on new data.'] },
    { id: 'verdict', title: 'The verdicts', lines: Object.entries(c).map(([k, v]) => `${k.replace('model_', 'Model ')} is ${v.label}: ${v.reason}`) },
  ]
}
export function ac8Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const cells = ans<Record<string, string>>(s, 0)
  const t = s.accuracy_table as T8[]
  const c = s.conclusions as Record<string, { label: string }>
  const opts = ['Predicted = 1, Actual = 1', 'Predicted = 0, Actual = 0', 'Predicted = 1, Actual = 0', 'Predicted = 0, Actual = 1']
  return [
    ...Object.entries(cells).map(([k, v]) => ({ id: k, q: `A cell is a ${k.split('_')[1]} if…`, options: opts, answer: v })),
    ...t.map((r) => ({ id: `${r.model}-${r.dataset}`, q: `Accuracy of ${r.model.replace('model_', 'Model ')} on the ${r.dataset} data (two decimals)`, answer: r.accuracy, tolerance: 0.006, why: r.calculation })),
    ...Object.entries(c).map(([k, v]) => ({ id: k, q: `${k.replace('model_', 'Model ')} was…`, options: ['overfitted', 'well-fitted', 'underfitted'], answer: v.label })),
  ]
}
