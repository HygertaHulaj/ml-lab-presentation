/**
 * DS4A Section 8.6 "Use High-Quality Data in Machine Learning" (book pp. 392–393): on-screen wording, paraphrased.
 * Numbers never live here: they come from GET /api/v1/concepts/data-quality.
 */
export const DIMENSIONS = [
  { k: 'Freshness', tone: 'data', def: 'Data must be relevant and current. AI needs frequent signals to adjust to its environment.', radiology: 'RadiologyML needs the latest images from new and existing imaging equipment.' },
  { k: 'Volume', tone: 'compute', def: 'How much data a database can hold and a model can ingest; successful machine learning needs many data points to find patterns.', radiology: 'RadiologyML needs computers that handle big data: millions of medical images.' },
  { k: 'Diversity', tone: 'feature', def: 'Diverse data give a broader picture and better decisions: data from people all over the world, not just wealthy majority populations.', radiology: 'Noé notices RadiologyML is trained on images from one community (mostly Hispanic, wealthy and older) and worries it is not diverse enough to work worldwide.' },
  { k: 'Quality', tone: 'human', def: 'The most important of the four: guard against fraud, erroneous reporting and incorrect information.', radiology: 'Images compressed to a lower resolution to save storage may be too coarse for good predictions.' },
] as const

/** Practice (written for this presentation, not from the book): which dimension is at risk? */
export const PRACTICE = [
  { q: 'A spam filter trained in 2015 misses the new kinds of spam that appear this year.', answer: 'Freshness', why: 'The world changed; the data did not.' },
  { q: 'A speech assistant trained only on adult voices often fails to understand children.', answer: 'Diversity', why: 'Some groups are missing from the training data.' },
  { q: 'A hospital trains a model on 40 patient records and its predictions are unstable.', answer: 'Volume', why: 'Too few data points to find reliable patterns.' },
  { q: 'Half the sales records were typed in by hand and many prices have an extra zero.', answer: 'Quality', why: 'Erroneous reporting: wrong values in, wrong patterns out.' },
  { q: 'A self-driving car trained only on sunny Californian roads drives in snow in Norway.', answer: 'Diversity', why: 'The training data do not represent where the model is used.' },
  { q: 'To save money, security-camera images are stored at a tenth of their resolution before training.', answer: 'Quality', why: 'Like compressed scans: the detail the model needs is gone.' },
]
export const PRACTICE_OPTIONS = ['Freshness', 'Volume', 'Diversity', 'Quality']

export const SUMMARY = [
  { k: 'Garbage in, garbage out', v: 'A model is only as good as the data it learns from.' },
  { k: 'Freshness', v: 'Keep data current: new equipment and new situations need new examples.' },
  { k: 'Volume', v: 'More examples, more reliable patterns, up to a point.' },
  { k: 'Diversity', v: 'A model cannot recognise what it has never seen.' },
  { k: 'Quality', v: 'Wrong labels and lost detail cost accuracy; quality ranks above diversity and volume.' },
]
