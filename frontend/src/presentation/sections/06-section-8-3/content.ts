/**
 * DS4A Section 8.3 "Characteristics of Machine Learning Methods", book pp. 368–379. Wording paraphrases the source.
 * Numbers (tree counts, thresholds, accuracies) are NOT here: they come from the backend.
 */
export const STEPS_83 = [
  'Characteristics', 'Decision trees', 'Car seat data', 'Reading a tree', 'Good explanatory variables', 'Try it: penguins',
  'Regression vs. classification', 'One method, both tasks', 'Inference vs. prediction', 'Try it: inference or prediction',
  'Interpretability vs. complexity', 'Controlling complexity', 'Try it: nested trees', 'Summary',
] as const

export const DEFS = {
  tree: 'A hierarchical model with a flowchart-like structure: nodes, splits into branches, and leaves. Each internal split is a question about a variable, each branch is an outcome of that question, and each leaf is a predicted value of the response variable.',
  regression: 'Using any number of explanatory variables to predict a quantitative response variable: a numeric quantity.',
  classification: 'Using any number of explanatory variables to predict a categorical response variable: a class or category.',
  prediction: 'Problems where accurately predicting the response variable is the top priority.',
  inference: 'Problems where the main priority is identifying and describing the relationships between the explanatory and response variables.',
  interpretability: 'How far the relationships between the explanatory variables and the response can be described in everyday terms.',
  complexity: 'The capacity to capture complex relationships between the explanatory variables and the response, and to use them to predict well.',
  maxDepth: 'The maximum allowable size of a fitted tree. Larger max depth allows a more complex tree.',
  minN: 'The minimum number of observations a node needs before it may be split. Smaller min n allows a more complex tree.',
}

/** Table 8.1: the car seat data (400 stores), as described in the book. */
export const CARSEAT_VARS = [
  { v: 'sales', d: 'unit sales (thousands) at each store', role: 'surrogate' },
  { v: 'sales_cat', d: '"High" (over 8000 units) or "Low"', role: 'response' },
  { v: 'competitor_price', d: 'price charged by the competitor', role: 'x' },
  { v: 'income', d: 'community income level (thousands of dollars)', role: 'x' },
  { v: 'advertising', d: 'local advertising budget', role: 'x' },
  { v: 'population', d: 'population size in the region', role: 'x' },
  { v: 'price', d: 'price the company charges for car seats', role: 'x' },
  { v: 'shelf_location', d: 'quality of the shelving location: Bad, Medium, Good', role: 'x' },
  { v: 'age', d: 'average age of the local population', role: 'x' },
  { v: 'education', d: 'education level', role: 'x' },
  { v: 'urban', d: 'urban or rural location', role: 'x' },
  { v: 'us', d: 'store in the US or not', role: 'x' },
]

/** Try It Yourself: Regression versus Classification (p. 374). Answers follow the definitions. */
export const REG_CLASS = [
  { q: 'Whether an email is spam or not.', answer: 'Classification' },
  { q: 'House price.', answer: 'Regression' },
  { q: 'Price of a stock.', answer: 'Regression' },
  { q: 'Whether someone will default on a loan or not.', answer: 'Classification' },
  { q: 'What species of marine mammal was the source of the recorded sound.', answer: 'Classification' },
  { q: 'Ticket sales for a sporting event.', answer: 'Regression' },
]

/** Try It Yourself: Inference versus Prediction (pp. 375–376). The book states the reason for each answer. */
export const INF_PRED = [
  { q: 'Top 50 US zoos (animals kept, profit, daily attendees, director salary): which factors are associated with director salary?', answer: 'Regression · inference', why: 'Director salary is quantitative; we want to know which factors are associated with it.' },
  { q: 'Will a new book succeed or fail? Data on 10 similar books: success or failure, list price, marketing budget, genre.', answer: 'Classification · prediction', why: 'The outcome is categorical (success or failure); the goal is to predict it for the new book.' },
  { q: 'Percent change in near-surface air temperature in Orlando vs. ocean surface temperatures at three coastal sites, weekly for 20 years.', answer: 'Regression · inference', why: 'The response is quantitative; we want to know how ocean temperatures are associated with it.' },
]
export const INF_PRED_OPTIONS = ['Regression · inference', 'Regression · prediction', 'Classification · inference', 'Classification · prediction']

/** Methods named in the text around Fig. 8.13 (p. 376), placed qualitatively on the trade-off. */
export const TRADEOFF = [
  { name: 'Traditional linear regression', interp: 0.85, complexity: 0.2 },
  { name: 'Decision trees', interp: 0.6, complexity: 0.48 },
  { name: 'Deep learning', interp: 0.12, complexity: 0.92 },
]
