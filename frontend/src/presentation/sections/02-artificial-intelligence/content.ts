/**
 * Section 2 content. Definitions paraphrase *Data Science for All*, Ch. 8 (page numbers are book pages).
 * Kept as data so the presenter can change examples without touching components.
 */
export type FieldId = 'ai' | 'ml' | 'dl'

export const QUESTION = 'What if computers could perform tasks that normally require human intelligence?'

export const TASKS = [
  { id: 'imaging', title: 'Reading medical images', example: 'RadiologyML flags patterns in scans for a radiologist (fictional, from the chapter story)', source: 'p. 363' },
  { id: 'language', title: 'Understanding language', example: 'Translating a sentence, as Google Translate does', source: 'p. 365' },
  { id: 'recommend', title: 'Recommending', example: 'Suggesting the next film for every subscriber', source: 'p. 367' },
  { id: 'vision', title: 'Seeing', example: 'Sorting fruit by colour as a sign of ripeness', source: 'Fig. 8.3, p. 364' },
] as const

export interface Field { id: FieldId; name: string; definition: string; note: string; source: string; examples: { label: string; x: number; y: number }[] }

/** Geometry is in the NestedFields SVG viewBox (0 0 1000 680). */
export const FIELDS: Record<FieldId, Field & { cx: number; cy: number; rx: number; ry: number }> = {
  ai: {
    id: 'ai', name: 'Artificial intelligence', cx: 500, cy: 340, rx: 470, ry: 316,
    definition: 'Computer systems that perform tasks that generally require or mimic human intelligence.',
    note: 'The overarching field. Not all AI learns: some systems follow rules that people wrote, such as search, planning or expert systems.',
    source: 'DS4A §8.1, p. 364',
    examples: [{ label: 'Route planning (search)', x: 190, y: 230 }, { label: 'Rule-based expert system', x: 170, y: 430 }, { label: 'Classic chess engine', x: 300, y: 600 }],
  },
  ml: {
    id: 'ml', name: 'Machine learning', cx: 585, cy: 370, rx: 330, ry: 230,
    definition: 'A subfield of AI: statistical models that improve at a task by learning from data, finding patterns and making predictions instead of following fixed instructions for every case.',
    note: 'Many machine-learning models are not neural networks: decision trees, linear regression, k-means.',
    source: 'DS4A §8.1, p. 364',
    examples: [{ label: 'Email spam filter', x: 400, y: 245 }, { label: 'Decision tree', x: 380, y: 400 }, { label: 'K-Means clusters', x: 460, y: 530 }],
  },
  dl: {
    id: 'dl', name: 'Deep learning', cx: 690, cy: 400, rx: 175, ry: 125,
    definition: 'Machine learning with artificial neural networks of many layers; each layer turns the data into a more useful representation.',
    note: 'Powerful for images, sound and text, but needs much data and is harder to interpret.',
    source: 'DS4A §8.5, p. 389',
    examples: [{ label: 'Face ID', x: 640, y: 350 }, { label: 'Image recognition', x: 700, y: 410 }, { label: 'ChatGPT', x: 660, y: 470 }],
  },
}

/** DS4A "Try It Yourself: Identify Artificial Intelligence", p. 365. Suggested answers (the book's key does not list them). */
export const IDENTIFY_AI = [
  { item: 'USB-C flash drives', ai: false, why: 'Stores data; no task that needs intelligence' },
  { item: 'Email spam filters', ai: true, why: 'Learns which messages look like spam' },
  { item: 'Google Translate', ai: true, why: 'Understands and translates language' },
  { item: 'Digital alarm clocks', ai: false, why: 'Follows a fixed timer' },
  { item: 'Autocorrect when text messaging', ai: true, why: 'Predicts the word you meant' },
  { item: 'Plagiarism detection software', ai: true, why: 'Recognises patterns of similar text' },
  { item: 'Calculators', ai: false, why: 'Exact arithmetic rules, no learning or judgement' },
  { item: 'E-Bikes', ai: false, why: 'Motor assistance, in most cases without AI' },
]
