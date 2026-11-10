/**
 * DS4A Section 8.5 "Deep Learning" (book pp. 389–392): on-screen wording, paraphrased from the book.
 * Numbers never live here: they come from GET /api/v1/concepts/deep-learning.
 */
export const DEFS = {
  ann: 'Artificial neural network (ANN): a machine learning method whose structure was built to resemble the human brain.',
  deep: 'Deep learning: a subfield of machine learning that uses ANNs with multiple layers (deep neural networks) to model and solve especially complex problems.',
}

/** p. 389 lists these as advantages; worded here as what deep learning CAN do, since performance depends on the task (audit A3). */
export const GAINS = [
  'Can learn useful representations from images, language and other complex data',
  'Can pick up subtle patterns when there is enough representative data',
  'Often strong on large amounts of unstructured data',
  'Inference can be fast once trained; speed and accuracy depend on the system',
]
/** Beyond the book, cited: a more complex method is not automatically the best choice (bridge to No Free Lunch, §8.4). */
export const DL_CAVEAT = {
  text: 'Not universally better: on medium-sized tabular datasets, tree-based models often matched or beat deep learning.',
  cite: 'Grinsztajn, Oyallon & Varoquaux, "Why do tree-based models still outperform deep learning on typical tabular data?", NeurIPS 2022 Datasets and Benchmarks',
}

export const COSTS = [
  'Much more training time',
  'Large datasets for training',
  'Powerful computer hardware',
  'Low interpretability: explanation methods give partial insight, not a full guarantee',
  'Can be overkill for less complex problems',
]

/** p. 389: where deep learning is used today. */
export const APPLICATIONS = [
  { k: 'Virtual assistants', s: 'Alexa, Siri', icon: 'voice' },
  { k: 'Translation', s: 'Google Translate, the menu in Istanbul', icon: 'lang' },
  { k: 'Driverless cars and drones', s: 'seeing the road', icon: 'car' },
  { k: 'Chatbots and service bots', s: 'answering in natural language', icon: 'chat' },
  { k: 'Facial recognition', s: 'Fig. 8.22; unlocking a phone', icon: 'face' },
  { k: 'Recommendations', s: 'personalised shopping, Netflix', icon: 'star' },
] as const

export const CASES = [
  { k: 'Face ID (Fig. 8.26, p. 391)', v: 'The idea behind digit recognition, scaled up: the phone analyses a user\'s facial features and unlocks only if they match the face stored in its memory.' },
  { k: 'Construction safety (case study, p. 392)', v: 'A deep-learning assistant ranks a project\'s thousands of open issues ("the 10 most critical things today"), tags site photos and flags protective equipment that is used incorrectly.' },
]

export const SUMMARY = [
  { k: 'A subset', v: 'All deep learning is machine learning; not all machine learning is deep learning.' },
  { k: 'Layers', v: 'A deep neural network passes data through many layers; each builds more complex features.' },
  { k: 'Data hungry', v: 'It shines with large amounts of (unstructured) data, at a cost in data, time and hardware.' },
  { k: 'Images are numbers', v: 'A picture becomes an array of shading values, processed like any other dataset.' },
  { k: 'Hard to explain', v: 'Thousands of weights, no simple rule: the far end of the interpretability trade-off (Fig. 8.13).' },
]
