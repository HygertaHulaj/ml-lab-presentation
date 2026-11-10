/**
 * Presentation section registry: the single place that defines order, routes, step counts and status.
 * Steps are the presenter's "clicks" inside a section; → at the last step moves to the next section.
 */
import type { Component } from 'vue'
import { SHOW_EXTRA_PAGES } from '../features'

export type SectionStatus = 'ready' | 'hub' | 'in-development'
/** core = the 80-minute teaching route; appendix = optional exploration after the ending */
export type SectionTrack = 'core' | 'appendix'

/** The through-line of the whole talk (audit §4), asked by the film and answered by the conclusion. */
export const THROUGH_LINE = "What evidence would make us trust a model's prediction enough to use it?"

export interface SectionDef {
  id: string
  path: string
  n: number
  title: string
  short: string
  /** step labels (length = number of steps); shown in the index and used by tests */
  steps: string[]
  status: SectionStatus
  source: string
  component: () => Promise<Component | { default: Component }>
  /** for in-development sections: what is planned (shown honestly on screen) */
  planned?: string[]
  links?: { label: string; to: string }[]
  /** the audience question this section answers */
  question: string
  /** the answer, in one sentence: shown at the section's last step */
  takeaway: string
  /** the reason for the next section, as a question (absent on the last core section and appendices) */
  bridge?: string
  /** proposed teaching time in minutes (a plan to validate in rehearsal, not a measured runtime) */
  minutes: number
  track: SectionTrack
  /** practice that opens inside the presentation at the end of the section (activities, 3D lessons) */
  embeds?: { kind: 'activity' | 'lesson'; id: string; label: string }[]
}

const ALL_SECTIONS: SectionDef[] = [
  {
    id: 'intro', path: 'intro', n: 1, title: 'The Scan That Changed Everything', short: 'Opening film',
    steps: ['Title', 'The film', 'From pixels to data'], status: 'ready', source: 'DS4A Ch. 8, Introduction, p. 363',
    component: () => import('./sections/01-introduction/IntroSection.vue'),
    question: 'Can a prediction be trusted?', takeaway: 'Every scan is data, and a model turned that data into a prediction about Noé.',
    bridge: 'The system produced a prediction. Which part of that process was learned?', minutes: 5, track: 'core',
  },
  {
    id: 'ai', path: 'ai', n: 2, title: 'What Is Artificial Intelligence?', short: 'Artificial intelligence',
    steps: ['The question', 'Tasks that need intelligence', 'Definition', 'Artificial intelligence', 'Machine learning', 'Deep learning', 'Rules vs. learning', 'Try it yourself'],
    status: 'ready', source: 'DS4A §8.1, pp. 364–365 · §8.5, p. 389',
    component: () => import('./sections/02-artificial-intelligence/AiSection.vue'),
    question: 'Which part is learned from examples?', takeaway: 'AI is the broad field; machine learning is the part that learns rules from examples; deep learning is one kind of machine learning.',
    bridge: 'If the rule is learned, how does the learning actually happen?', minutes: 4, track: 'core',
  },
  {
    id: 'machine-learning', path: 'machine-learning', n: 3, title: 'What Is Machine Learning?', short: 'Machine learning',
    steps: ['The idea', 'Traditional programming', 'Training', 'Inference', 'Side by side', 'Training vs. inference'],
    status: 'ready', source: 'DS4A §8.1, p. 364 · §8.2, p. 365',
    component: () => import('./sections/03-machine-learning/MlSection.vue'),
    question: 'How does a machine learn a rule?', takeaway: 'Training searches for a rule using labelled examples; inference applies the trained rule to each new case.',
    bridge: 'Where does training sit in a whole project, from raw data to a prediction we can check?', minutes: 3, track: 'core',
  },
  {
    id: 'how-learning-works', path: 'how-learning-works', n: 4, title: 'How Machine Learning Works', short: 'How learning works',
    steps: ['Overview', 'Collect', 'Prepare', 'Features', 'Split', 'Train', 'Predict', 'Evaluate'],
    status: 'ready', source: 'DS4A §8.2–8.4',
    component: () => import('./sections/04-learning-process/LearningProcessSection.vue'),
    question: 'Where do predictions come from?', takeaway: 'Collect and prepare the data, split it, choose features and train on the training part only, then predict and evaluate on unseen cases.',
    bridge: 'The book groups this work into three steps. What are they, and what can a model learn without labels?', minutes: 4, track: 'core',
  },
  {
    id: 'section-8-2', path: 'section-8-2', n: 5, title: 'Section 8.2: Three Steps in the Machine Learning Process', short: 'Section 8.2',
    steps: ['Three steps', 'Supervised vs. unsupervised', 'A model is a recipe', 'RadiologyML learns', 'The three steps', 'Step 1: Ingest data', 'Tidy data', 'Case: Tesla', 'Step 2: Analyze the data', 'Step 3: Produce results', 'Try it yourself'],
    status: 'ready', source: 'DS4A §8.2, pp. 365–368',
    component: () => import('./sections/05-section-8-2/Section82.vue'),
    question: 'What are the steps of the machine-learning process?', takeaway: 'Ingest the data, analyze it with a method, produce results; supervised methods learn from labels, unsupervised methods find structure without them.',
    bridge: 'We know where learning happens. What kind of answer are we asking the model to produce?', minutes: 6, track: 'core',
    embeds: [{ kind: 'activity', id: 'ds4a-ac2', label: 'Activity 2 · Ingest, analyze, produce' }, { kind: 'lesson', id: 'kmeans-iris', label: 'K-Means on Iris in 3D (unsupervised)' }],
  },

{
  id: 'section-8-3',
  path: 'section-8-3',
  n: 6,
  title: 'Section 8.3: Characteristics of Machine Learning Methods',
  short: 'Section 8.3',

  steps: [
    'Characteristics',
    'Decision trees',
    'Car seat data',
    'Reading a tree',
    'Good explanatory variables',
    'Try it: penguins',
    'Regression vs. classification',
    'One method, both tasks',
    'Inference vs. prediction',
    'Try it: inference or prediction',
    'Interpretability vs. complexity',
    'Controlling complexity',
    'Try it: nested trees',
    'Summary',
  ],

  status: 'ready',
  source: 'DS4A §8.3, pp. 368–379',

  component: () => import('./sections/06-section-8-3/Section83.vue'),

  question: 'Are we grouping, classifying, or predicting a number?',
  takeaway: 'Methods differ in the response they predict (category or number), in whether we want inference or prediction, and in interpretability versus complexity.',
  bridge: 'A category answers which kind; a numerical model answers how much. How does a model learn to predict a number?',
  minutes: 13,
  track: 'core',

  embeds: [
    { kind: 'activity', id: 'ds4a-ac3', label: 'Activity 3 · Reading a tree' },
    { kind: 'activity', id: 'ds4a-ac4', label: 'Activity 4 · Regression or classification' },
    { kind: 'activity', id: 'ds4a-ac5', label: 'Activity 5 · Inference or prediction' },
    { kind: 'activity', id: 'ds4a-ac6', label: 'Activity 6 · Interpretability vs complexity' },
  ],
},

  {
    id: 'movies', path: 'worked-example-movies', n: 7, title: 'Worked Example: Can Money Buy a Better Movie Rating?', short: 'Worked example',
    steps: ['The question', 'Your prediction', 'Which predictor?', "One movie's error", 'From errors to cost', 'The line and the bowl', 'Learning-rate experiment', 'The evidence so far'],
    status: 'ready', source: 'Shah, HoIDS Hands-On Problem 8.4, p. 233 (not a DS4A dataset) · method: DS4A §8.3 regression',
    component: () => import('./sections/06b-movies/MoviesSection.vue'),
    question: 'How does a model learn a numerical prediction?', takeaway: 'Gradient descent lowers the squared error on the observations step by step; a well-optimized fit can still account for little of the variation.',
    bridge: 'We reduced error on these examples. What tells us the model will work on new ones?', minutes: 12, track: 'core',
    embeds: [{ kind: 'lesson', id: 'shah-8-4-movies', label: 'The same model in 3D' }, { kind: 'activity', id: 'hoids-hop8-4', label: 'Problem 8.4 · worked activity' }, { kind: 'lesson', id: 'shah-8-1-restaurants', label: 'Restaurants · a first plane (8.1)' }, { kind: 'lesson', id: 'shah-8-2-airlines', label: 'Airlines · a line to a plane' }, { kind: 'lesson', id: 'shah-8-3-rock', label: 'Rock · a slice of a larger model' }],
  },
  {
    id: 'section-8-4', path: 'section-8-4', n: 8, title: 'Section 8.4: Machine Learning Method Evaluation', short: 'Section 8.4',
    steps: ['Evaluation', 'Model validation', 'Accuracy', 'Two kinds of mistakes', 'Confusion matrix', 'Precision, recall, specificity', 'Try it: compute the metrics', 'Evaluating regression', 'No Free Lunch', 'Overfitting and underfitting', 'Training vs. test error', 'On real data', 'Try it: which model fits?', 'Back to the movies', 'Summary'],
    status: 'ready', source: 'DS4A §8.4, pp. 380–388',
    component: () => import('./sections/07-section-8-4/Section84.vue'),
    question: 'Does a good training fit work on unseen observations?', takeaway: 'Judge a model on data it did not learn from: choose with validation, confirm once on a test set, and pick metrics that match the costs of its mistakes.',
    bridge: 'We supplied measurements to the earlier models. What if the input is the image itself?', minutes: 12, track: 'core',
    embeds: [{ kind: 'activity', id: 'ds4a-ac7', label: 'Activity 7 · Accuracy, precision, recall, specificity' }, { kind: 'activity', id: 'ds4a-ac8', label: 'Activity 8 · Overfitted, underfitted, well fitted' }],
  },
  {
    id: 'section-8-5', path: 'section-8-5', n: 9, title: 'Section 8.5: Deep Learning', short: 'Section 8.5',
    steps: ['Deep learning', 'Power and cost', 'Why study it?', 'Neural networks', 'The mechanics', 'Case study: ChatGPT', 'More data, deeper networks', 'An image is numbers', 'Inside the network', 'Try it: draw a digit', 'Deep learning around us', 'Summary'],
    status: 'ready', source: 'DS4A §8.5, pp. 389–392',
    component: () => import('./sections/08-section-8-5/Section85.vue'),
    question: 'What changes when the input is an image?', takeaway: 'A deep network learns its own features from pixels, at a cost in data, computing power and interpretability; it is not automatically the best method.',
    bridge: 'Is the far end of the trade-off always necessary? What does recent research say?', minutes: 6, track: 'core',
  },
  {
    id: 'research', path: 'research', n: 10, title: 'Recent Research: Accuracy versus Interpretability', short: 'Recent research',
    steps: ['The question and the study', 'What they found', 'What it means'],
    status: 'ready', source: 'Beyond the book · Kruschel et al. (2025), Business & Information Systems Engineering 68(1)',
    component: () => import('./sections/09a-research/ResearchSection.vue'),
    question: 'Do we have to give up understanding to get accuracy?', takeaway: 'On tabular data, modern interpretable models came close to the best black boxes (EBM ranked 2nd of 14); the classic line and single tree did not. For images, the question stays open.',
    bridge: 'A powerful model still learns from a particular sample of the world. What makes that sample good enough?', minutes: 3, track: 'core',
  },
  {
    id: 'section-8-6', path: 'section-8-6', n: 11, title: 'Section 8.6: Use High-Quality Data in Machine Learning', short: 'Section 8.6',
    steps: ['Garbage in, garbage out', 'Data freshness', 'Data volume', 'Data diversity', 'Data quality', 'Representative data', 'Practice: which dimension?', 'Summary'],
    status: 'ready', source: 'DS4A §8.6, pp. 392–393',
    component: () => import('./sections/09-section-8-6/Section86.vue'),
    question: 'Is the data good enough to learn from?', takeaway: 'Useful training data are fresh, sufficient, diverse, accurate, and representative of the cases the model will meet.',
    bridge: 'Who is missing from the sample, and who pays for the model\'s mistakes?', minutes: 5, track: 'core',
  },
  {
    id: 'ethics', path: 'ethics', n: 12, title: 'Ethics in Practice: Social Justice in Data Science', short: 'Ethics',
    steps: ['Social justice', 'Where bias enters', 'Facial recognition', 'The mechanism, measured', 'Policing', 'Mitigating bias', 'Benefits', 'College admissions', 'Discussion', 'Summary'],
    status: 'ready', source: 'DS4A Ch. 8, Ethics in Practice, pp. 394–395',
    component: () => import('./sections/10-ethics/EthicsSection.vue'),
    question: 'Who or what does the model fail?', takeaway: 'Overall accuracy can hide unequal errors: check each group, mitigate bias, and keep people accountable for decisions.',
    bridge: 'Back to Noé: what evidence would we need before trusting the scan\'s prediction?', minutes: 4, track: 'core',
  },
  {
    id: 'conclusion', path: 'conclusion', n: 13, title: "Conclusion: Back to Noé's Scan", short: 'Conclusion',
    steps: ['Back to the scan', 'A prediction is not a decision', 'The evidence checklist', 'Recall', 'Sources and exploring further'],
    status: 'ready', source: 'The whole chapter · DS4A Ch. 8 Key Terms, p. 396',
    component: () => import('./sections/11-conclusion/ConclusionSection.vue'),
    question: 'What evidence is still missing?',
    takeaway: 'Trusting a prediction needs representative data, suitable validation, known error costs, subgroup checks and human review, not only an impressive result.',
    minutes: 3, track: 'core',
  },
  {
    id: 'lab', path: 'lab', n: 14, title: 'Appendix: The Algorithm Lab', short: 'Appendix: lab',
    steps: ['Choose a simulation'], status: 'hub', source: 'Exploration after the lecture · DS4A Ch. 8 · Shah Ch. 8',
    component: () => import('./sections/common/LabHubSection.vue'),
    question: 'Where can students explore on their own?', takeaway: 'Every simulation runs on the backend; the screen only draws what was computed.',
    minutes: 0, track: 'appendix',
  },
]

/** The "Algorithm Lab" appendix links to the classic lab, so it is hidden with it (features.ts). */
export const SECTIONS: SectionDef[] = ALL_SECTIONS.filter((s) => SHOW_EXTRA_PAGES || s.id !== 'lab')

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id)
export const sectionIndex = (id: string) => SECTIONS.findIndex((s) => s.id === id)

/** The planned core route, in minutes (to be validated in rehearsal). */
export const CORE_MINUTES = SECTIONS.filter((x) => x.track === 'core').reduce((a, x) => a + x.minutes, 0)
