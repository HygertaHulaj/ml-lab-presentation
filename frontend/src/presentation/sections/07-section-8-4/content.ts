/**
 * DS4A Section 8.4 "Machine Learning Method Evaluation" (book pp. 380–388): on-screen wording, paraphrased from the
 * book's DEFINITION boxes. Numbers never live here: they come from GET /api/v1/concepts/evaluation.
 */
export const DEFS = {
  training: 'Training data: the data used to train (fit) a machine learning model.',
  test: 'Test data: new, previously unseen data that we apply the trained model to, to evaluate its performance.',
  validation: 'Model validation: designating part of the dataset as training data and the rest as test data, so a model can be trained and tested using one original dataset.',
  accuracy: 'Accuracy: the proportion of observations for which the predictions were correct.',
  misclass: 'Misclassification rate: the proportion of observations for which the predictions were incorrect (1 − accuracy).',
  confusion: 'Confusion matrix: a two-way table comparing the true values of the response with the model\'s predictions.',
  precision: 'Precision: the proportion of positive predictions that are correct.',
  recall: 'Recall (sensitivity): the proportion of actual positives that were predicted correctly.',
  specificity: 'Specificity: the proportion of actual negatives that were predicted correctly.',
  mse: 'Mean squared error (MSE): the average squared difference between the predictions and the actual values. Lower is better.',
  r2: 'R-squared (R²): the share of the variation in the response that the trained model explains. Higher is better.',
  nfl: 'The "No Free Lunch" theorem: no single machine learning method is best for solving all problems.',
  overfit: 'Overfitting: the model captures the training data too closely (its noise as well as its pattern), so it generalises poorly to new data.',
  underfit: 'Underfitting: the model captures the training data too little, so it performs poorly on training and on new data.',
}

/** p. 381–382: RadiologyML's four outcomes (fictional tool from the chapter story; positive = "injury"). */
export const OUTCOMES = [
  { k: 'TP', name: 'True positive', model: 'flags an injury', truth: 'there is one', ok: true, tone: 'ok' },
  { k: 'FP', name: 'False positive', model: 'flags an injury', truth: 'there is none', ok: false, tone: 'human' },
  { k: 'TN', name: 'True negative', model: 'finds no injury', truth: 'there is none', ok: true, tone: 'data' },
  { k: 'FN', name: 'False negative', model: 'finds no injury', truth: 'there is one', ok: false, tone: 'warn' },
] as const

/** p. 385: the cookie factory analogy for fit. */
export const COOKIES = [
  { k: 'Underfit', tone: 'human', recipe: '"Mix the flour with the other ingredients and bake."', why: 'Too generic: mediocre cookies whatever the ingredients.' },
  { k: 'Overfit', tone: 'warn', recipe: '"Exactly 212 g of this one bag of wheat flour…"', why: 'Tailored to one batch: fails as soon as you use almond flour.' },
  { k: 'Well fitted', tone: 'ok', recipe: 'A recipe flexible enough for many ingredients, but tied to no single batch.', why: 'Great cookies, again and again, like a model that handles new data.' },
] as const

/** p. 387: the rule of thumb. */
export const FIT_RULES = [
  { k: 'Overfitting', v: 'good on the training data, worse on the test data', tone: 'warn' },
  { k: 'Good fit', v: 'good on the training data and on the test data', tone: 'ok' },
  { k: 'Underfitting', v: 'poor on the training data and on the test data', tone: 'human' },
] as const

export const CELL_OPTIONS = ['Predicted = 1, Actual = 1', 'Predicted = 0, Actual = 0', 'Predicted = 1, Actual = 0', 'Predicted = 0, Actual = 1']
export const CELL_ITEMS = [
  { q: 'A cell is a true positive (TP) if…', answer: CELL_OPTIONS[0] },
  { q: 'A cell is a true negative (TN) if…', answer: CELL_OPTIONS[1] },
  { q: 'A cell is a false positive (FP) if…', answer: CELL_OPTIONS[2] },
  { q: 'A cell is a false negative (FN) if…', answer: CELL_OPTIONS[3] },
]

export const SUMMARY = [
  { k: 'Validate', v: 'Split the data: train on one part, test on data the model has never seen (e.g. 80 / 20).' },
  { k: 'Classification', v: 'Accuracy, then the confusion matrix: precision, recall and specificity show which mistakes are made.' },
  { k: 'Regression', v: 'Compare numbers, not equality: low MSE, high R², on data the model did not learn from.' },
  { k: 'No Free Lunch', v: 'No method wins every problem. Try several, choose with validation data, confirm once on test data.' },
  { k: 'Fit', v: 'Training error alone flatters. Overfit: great train, poor test. Underfit: poor on both.' },
]
