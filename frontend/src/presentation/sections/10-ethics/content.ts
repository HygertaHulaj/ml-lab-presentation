/**
 * DS4A Chapter 8 "Ethics in Practice: Social Justice in Data Science" (book pp. 394–395): on-screen wording,
 * paraphrased. One external fact is added and cited (Gender Shades, 2018); discussion questions are our own.
 * Measured numbers come from GET /api/v1/concepts/ethics.
 */
export const SOCIAL_JUSTICE = 'Social justice: the fair distribution of wealth, opportunities and privileges within a society.'

export const EVERYDAY = [
  'talking to Siri on an iPhone',
  'deciding who qualifies for a mortgage loan',
  'deciding who is "high risk" of reoffending',
  'deciding who is qualified for a job',
]

export const DECISIONS = ['who gets into college', 'who is credit-worthy', 'whose résumé is worth reading', 'who is insurable']
export const BIASES = ['gender', 'sexual orientation', 'disability', 'location', 'ethnicity', 'race']

/** Beyond the book, cited: the best-known measurement of the facial-recognition gap the book describes. */
export const GENDER_SHADES = {
  cite: 'Buolamwini & Gebru, "Gender Shades", Proceedings of Machine Learning Research 81, 2018',
  finding: 'Three commercial gender-classification systems misclassified darker-skinned women up to 34.7 % of the time, against at most 0.8 % for lighter-skinned men.',
  scope: 'This study measured gender classification from face images, not police identity matching. It shows that error rates can differ across groups; it is not a measurement of any police system.',
  url: 'https://proceedings.mlr.press/v81/buolamwini18a.html',
}

export const POLICE_CHAIN = [
  { k: 'Training data under-represent some groups', tone: 'human' },
  { k: 'More recognition errors for those groups', tone: 'warn' },
  { k: 'Wrong matches: innocent people identified', tone: 'warn' },
  { k: 'Greater chance of unjust surveillance', tone: 'warn' },
  { k: 'The public loses trust in the technology', tone: 'dim' },
] as const

export const MITIGATIONS = [
  'Examine the datasets used to train the algorithm',
  'Train with data representative of people of different ethnicities',
  'Install quality checks for bias in every AI innovation',
]

export const BENEFITS = [
  { k: 'Across industries', v: 'Finance, healthcare, insurance, transportation and law enforcement.' },
  { k: 'Less human input', v: 'Fewer human decisions can mean less room for human bias, with high efficiency and convenience.' },
  { k: 'Social cues', v: 'Analysing facial expressions to help neurodivergent people in social situations.' },
]

export const DISCUSSION = [
  'Who should check a model for bias before it is used on people, and how?',
  'Is a model that is 95 % accurate overall good enough if one group gets 27 % errors?',
  'If an AI can detect an applicant\'s income from an anonymous essay, how could that help reviewers, and how could it harm applicants?',
]

export const SUMMARY = [
  { k: 'Only as fair as its data', v: 'AI decisions are only as strong as their input; bias can enter consciously or unconsciously.' },
  { k: 'Look per group', v: 'Overall accuracy can hide a group that the model fails. Measure errors for each group.' },
  { k: 'High stakes', v: 'In policing, misidentification can mean unjust surveillance, and lost public trust.' },
  { k: 'Fixable, with effort', v: 'Representative data, reweighting and bias checks in every AI product.' },
  { k: 'Also a tool for fairness', v: 'Used with care, AI can reduce human bias, for example in college admissions.' },
]
