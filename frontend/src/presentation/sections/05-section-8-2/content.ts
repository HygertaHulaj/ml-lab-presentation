/**
 * DS4A Section 8.2 "Three Steps in the Machine Learning Process", book pp. 365–368 (see docs/SECTION_8_2_CONTENT_MAP.md).
 * Wording paraphrases the source; book pages are shown on screen.
 */
export const STEPS_82 = [
  'Three steps', 'Supervised vs. unsupervised', 'A model is a recipe', 'RadiologyML learns', 'The three steps',
  'Step 1: Ingest data', 'Tidy data', 'Case: Tesla', 'Step 2: Analyze the data', 'Step 3: Produce results', 'Try it yourself',
] as const

export const DEFS = {
  supervised: 'A response variable has been identified, and the dataset contains its values. We use them to make predictions for new observations.',
  unsupervised: 'No response variable. The goal is to find overall patterns, groupings or structures in the data.',
  model: 'Estimating how the variables in our data behave. The model usually takes an explicit mathematical form, estimated from the data we have.',
}

/** Sort these into supervised / unsupervised (examples in the spirit of p. 365; answers follow the definitions). */
export const PROBLEMS = [
  { text: 'Predict the price of a house from its size and location', supervised: true, why: 'the price is the response variable' },
  { text: 'Group customers by how they shop', supervised: false, why: 'no response: we look for groups' },
  { text: 'Decide whether an email is spam', supervised: true, why: 'past emails are labelled spam / not spam' },
  { text: 'Find topics in a pile of news articles', supervised: false, why: 'no labels: structure is discovered' },
  { text: 'Flag scans that radiologists would mark (RadiologyML)', supervised: true, why: 'radiologists provide the labels' },
  { text: 'Group Iris flowers by their measurements, without species', supervised: false, why: 'K-Means finds clusters, no species used' },
]

export const RECIPE = {
  pairs: [
    { cookie: 'Ingredients', ml: 'Data', icon: '🥚' },
    { cookie: 'Recipe', ml: 'Model', icon: '📜' },
    { cookie: 'Mix and bake', ml: 'Analysis', icon: '🔥' },
    { cookie: 'Cookies', ml: 'Outcome / prediction', icon: '🍪' },
  ],
  note: 'Analogy from DS4A p. 365. The cookie factory tries many recipes on past ingredients to predict how today\'s batch will turn out, just as a model learned from past data predicts new data.',
}

/** Step 1: kinds of data being ingested (p. 366). */
export const INGEST_ITEMS = [
  { label: 'Spreadsheet row of patient vitals', structured: true },
  { label: 'Email from a patient', structured: false },
  { label: 'MRI image', structured: false },
  { label: 'Database table of appointments', structured: true },
  { label: 'Social media post', structured: false },
  { label: 'Video of a lecture', structured: false },
  { label: 'CSV of Iris measurements', structured: true },
  { label: 'Sensor log: time, speed, location', structured: true },
]

/** Try It Yourself: the Mental Wellness Assistant (pp. 367–368). Lanes: 1 ingest, 2 analyze, 3 produce results. */
export const WELLNESS = [
  { n: 1, title: 'Calendar data', text: 'Syncs with the academic calendar: deadlines, exam dates.', lane: 1 },
  { n: 2, title: 'Study habits', text: 'Sensors or apps track study time, breaks, late nights.', lane: 1 },
  { n: 3, title: 'Social media monitoring', text: 'With consent, scans public posts for emotional tone (NLP).', lane: 1 },
  { n: 4, title: 'User input', text: 'Optional daily or weekly self-check surveys.', lane: 1 },
  { n: 5, title: 'Stress level estimation', text: 'Models estimate stress from deadlines, habits and tone.', lane: 2 },
  { n: 6, title: 'Pattern recognition', text: 'Finds recurring behaviours that trigger high stress.', lane: 2 },
  { n: 7, title: 'Alerts and recommendations', text: 'Sends coping strategies when stress is predicted.', lane: 3 },
  { n: 8, title: 'Resource allocation', text: 'Suggests rescheduling study plans.', lane: 3 },
  { n: 9, title: 'Feedback loop', text: 'Learns from what worked and refines its advice.', lane: 3 },
]
export const LANES = ['Step 1: Ingest', 'Step 2: Analyze', 'Step 3: Results']
