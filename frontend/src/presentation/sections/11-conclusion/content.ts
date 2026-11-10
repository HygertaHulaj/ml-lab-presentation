import { SHOW_EXTRA_PAGES } from '../../../features'

/**
 * Conclusion (audit C5, §4): return to the scan, separate a prediction from a decision, the evidence checklist (each item
 * links back to where it was taught and measured), three recall questions, sources. No numbers live here.
 */
export const DECISION = {
  prediction: ['a score or a label for one scan', 'computed from patterns in past examples', 'can be wrong, and is wrong more often for some groups when the data under-represent them'],
  decision: ['what happens to the patient next', 'weighs the cost of each kind of mistake, the context and the patient', 'made and owned by people, who review, correct and report errors so the model can be retrained and re-validated'],
}

/** Each item: what to ask, and where in this lecture we saw the evidence (section id, step). */
export const CHECKLIST = [
  { k: 'Representative data', ask: 'Do the training examples look like the patients the model will meet?', where: [{ label: '§8.6 Representative data', section: 'section-8-6', step: 5 }, { label: '§8.6 Data diversity', section: 'section-8-6', step: 3 }], tone: 'data' },
  { k: 'Suitable validation', ask: 'Was the model chosen with validation data, and checked once on cases it never saw?', where: [{ label: '§8.4 On real data', section: 'section-8-4', step: 11 }, { label: '§8.4 Back to the movies', section: 'section-8-4', step: 13 }], tone: 'compute' },
  { k: 'Known error costs', ask: 'Which mistake is worse here, a missed finding or a false alarm, and what are the rates?', where: [{ label: '§8.4 Two kinds of mistakes', section: 'section-8-4', step: 3 }, { label: '§8.4 Precision, recall, specificity', section: 'section-8-4', step: 5 }], tone: 'warn' },
  { k: 'Subgroup performance', ask: 'Is the error rate similar for every group, not only on average?', where: [{ label: 'Ethics: the mechanism, measured', section: 'ethics', step: 3 }], tone: 'human' },
  { k: 'Human review', ask: 'Who checks the prediction, who decides, and how are errors fed back?', where: [{ label: '§8.2 RadiologyML learns', section: 'section-8-2', step: 3 }, { label: 'Ethics: mitigating bias', section: 'ethics', step: 5 }], tone: 'ok' },
] as const

/** Retrieval practice, written for this presentation (not from the book); the answer is not always the first option. */
export const RECALL = [
  {
    q: 'In the flower journey, why are the feature scores computed after the split, on the training flowers only?',
    options: ['Training flowers are measured more accurately', 'So the test flowers stay unseen until the final check', 'It makes training faster'],
    answer: 'So the test flowers stay unseen until the final check',
    why: 'If test labels help choose the features, the test score is no longer an honest check of new cases (§8.2, §8.4).',
  },
  {
    q: "The movie model's R² was measured on the same movies it was fitted to. What does that tell us about new movies?",
    options: ['They will be predicted equally well', 'Nothing directly: that needs movies the model never saw', 'They will be predicted better'],
    answer: 'Nothing directly: that needs movies the model never saw',
    why: 'In-sample R² is optimistic: scored on held-out movies, every model did worse than on the movies it learned from (§8.4, Back to the movies).',
  },
  {
    q: 'A scan classifier is highly accurate overall. What must still be checked before it is used?',
    options: ['Only its training accuracy', 'Nothing: high accuracy is enough', 'Its errors for each patient group, and the cost of each kind of mistake'],
    answer: 'Its errors for each patient group, and the cost of each kind of mistake',
    why: 'Overall accuracy can hide unequal errors, and a missed finding and a false alarm cost different things (§8.4, Ethics in Practice).',
  },
]

export const SOURCES = [
  { k: 'Main text', v: 'Davis & Glanz, Data Science for All, Chapter 8 (pp. 363–401), and its dataset repository github.com/datasci4all/Datasets' },
  { k: 'Hands-on problems', v: 'C. Shah, A Hands-On Introduction to Data Science, Chapter 8, Hands-On Problems 8.1–8.4 (pp. 231–233)' },
  { k: 'Movies', v: 'M. Ahmed et al., Conventional and Social Media Movies 2014–2015, UCI Machine Learning Repository (CC BY 4.0), doi:10.24432/C5SP5T' },
  { k: 'Iris', v: 'R. A. Fisher (1936), via scikit-learn' },
  { k: 'Car seats, penguins', v: 'DS4A Chapter 8 data; originally ISLR Carseats (simulated) and palmerpenguins (Horst, Hill & Gorman, 2020)' },
  { k: 'Digits', v: "scikit-learn's bundled handwritten digits (8 × 8 pixels)" },
  { k: 'Facial analysis', v: 'Buolamwini & Gebru, "Gender Shades", PMLR 81, 2018 (gender classification, not identity matching)' },
  { k: 'Deep learning on tables', v: 'Grinsztajn, Oyallon & Varoquaux, NeurIPS 2022 Datasets and Benchmarks' },
  { k: 'Recent research', v: 'Kruschel et al., Challenging the Performance-Interpretability Trade-Off, Business & Information Systems Engineering 68(1), 2025, doi:10.1007/s12599-024-00922-2' },
  { k: 'The film', v: 'Noé and RadiologyML are a fictional scenario written for this presentation, not a clinical system' },
]

/** the appendix and the classic lab are hidden, not deleted (features.ts): their links show only when they are */
export const EXPLORE = [
  ...(SHOW_EXTRA_PAGES ? [{ label: 'Algorithm Lab (appendix)', to: '/presentation/lab' }] : []),
  { label: 'Movies: the 3D lesson', to: '/lessons/shah-8-4-movies' },
  { label: 'Apply the concepts: chapter activities', to: '/activities' },
  { label: 'K-Means on Iris (clustering)', to: '/lessons/kmeans-iris' },
  ...(SHOW_EXTRA_PAGES ? [{ label: 'Classic lab: exercises and training studio', to: '/' }] : []),
]
