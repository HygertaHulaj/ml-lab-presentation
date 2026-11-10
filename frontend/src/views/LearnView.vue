<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Check, X } from 'lucide-vue-next'
import PageHeader from '../components/layout/PageHeader.vue'

interface Concept { key: string; title: string; section: string; definition: string; intuition: string; example: string; useful: string; lab?: { to: string; label: string } }

// Definitions paraphrase DS4A Ch. 8 and Shah Ch. 8; section references point to the source.
const concepts: Concept[] = [
  { key: 'ai', title: 'Artificial intelligence', section: 'DS4A §8.1', definition: 'Computer systems that perform tasks which normally require or mimic human intelligence.',
    intuition: 'The umbrella: anything that behaves "intelligently", whether through hand-written rules or learning.', example: 'Voice assistants, translation, spam filters.', useful: 'When a task needs perception, language or judgement.' },
  { key: 'ml', title: 'Machine learning', section: 'DS4A §8.1 · Shah §8.2', definition: 'A subfield of AI where statistical models improve their performance on a task by learning from data instead of following fixed instructions.',
    intuition: 'Shah: "things learn when they change their behaviour in a way that makes them perform better in the future."', example: 'Face ID learns your face from example images.', useful: 'When writing explicit rules is impossible but examples are available.' },
  { key: 'dl', title: 'Deep learning', section: 'DS4A §8.5', definition: 'Machine learning with artificial neural networks that have many layers.',
    intuition: 'Each layer transforms the data into a more useful representation; very flexible, very hard to interpret.', example: 'Handwritten-digit recognition, image recognition, ChatGPT.', useful: 'Large amounts of unstructured data (images, audio, text) and enough computing power.' },
  { key: 'feat', title: 'Features and target', section: 'DS4A §8.3 · Shah §8.2', definition: 'Features (explanatory variables) are the inputs; the target (response, label) is what we want to predict.',
    intuition: 'Never use a variable that reveals the answer as a feature (e.g. `sales` when predicting `sales_cat`).', example: 'Penguins: bill length and flipper length → species.', useful: 'Always the first decision in a supervised problem.' },
  { key: 'sup', title: 'Supervised vs unsupervised', section: 'DS4A §8.2', definition: 'Supervised: a response variable is known and we learn to predict it. Unsupervised: no response; we look for patterns or groups.',
    intuition: 'Supervised learning has an "answer key" during training.', example: 'Supervised: predicting house prices. Unsupervised: grouping customers by behaviour.', useful: 'Decide by asking: do we have labelled outcomes?' },
  { key: 'rc', title: 'Regression vs classification', section: 'DS4A §8.3', definition: 'Regression predicts a quantitative response; classification predicts a categorical response.',
    intuition: 'Only the type of the response decides.', example: 'Car age → regression; spam or not → classification.', useful: 'Determines the model family and the evaluation metrics.', lab: { to: '/exercises/ds4a-ac4', label: 'Activity AC 4' } },
  { key: 'tt', title: 'Training and test data', section: 'DS4A §8.4', definition: 'Training data is used to fit the model; test data is held out to simulate new, unseen observations (model validation).',
    intuition: 'A student who memorises past exam answers is not ready for a new exam.', example: 'Car seats: 319 training stores, 81 test stores.', useful: 'Always — performance on training data is optimistic.', lab: { to: '/evaluation', label: 'Overfitting lab' } },
  { key: 'ip', title: 'Inference vs prediction', section: 'DS4A §8.3', definition: 'Prediction prioritises accurate predictions; inference prioritises understanding the relationships between variables.',
    intuition: '"Which factors are associated with…?" signals inference.', example: 'RadiologyML: prediction. Car-seat sales drivers: inference.', useful: 'Determines whether interpretability matters.', lab: { to: '/exercises/ds4a-ac5', label: 'Activity AC 5' } },
  { key: 'ic', title: 'Interpretability vs complexity', section: 'DS4A §8.3', definition: 'Interpretability: how easily the relationships can be described in everyday terms. Complexity: the capacity to capture complex relationships.',
    intuition: 'More flexible models usually become harder to explain — a trade-off.', example: 'Depth-1 tree (one question) vs depth-7 tree (many questions).', useful: 'Choosing a model for a stakeholder who needs explanations.', lab: { to: '/decision-trees', label: 'Decision Tree Explorer' } },
  { key: 'dq', title: 'Data quality and bias', section: 'DS4A §8.6 · Ethics in Practice', definition: 'Results are only as good as the data: freshness, volume, diversity and quality all matter ("garbage in, garbage out").',
    intuition: 'A model trained on one narrow population may fail or be unfair for others.', example: 'Facial recognition trained mostly on light-skinned faces performs worse on darker skin.', useful: 'Before and after every model — check who is (not) represented.' },
]
const selected = ref('ml')
const current = computed(() => concepts.find((c) => c.key === selected.value)!)

type Choice = 'AI (not ML)' | 'ML — regression' | 'ML — classification' | 'ML — unsupervised' | 'Not AI'
const choices: Choice[] = ['ML — regression', 'ML — classification', 'ML — unsupervised', 'AI (not ML)', 'Not AI']
// Answer key written from the textbook definitions (not produced by a model).
const quiz: { q: string; a: Choice; why: string }[] = [
  { q: 'An app estimates the price of a used car from its age and mileage, learned from past sales.', a: 'ML — regression', why: 'Learned from data; the response (price) is quantitative.' },
  { q: 'A filter learns from labelled emails to mark new ones as spam or not spam.', a: 'ML — classification', why: 'Learned from labelled examples; the response is a category.' },
  { q: 'A shop groups its customers into segments without any predefined labels.', a: 'ML — unsupervised', why: 'No response variable — the algorithm finds structure.' },
  { q: 'A chess program follows a fixed, hand-written set of rules and searches moves.', a: 'AI (not ML)', why: 'Mimics intelligent behaviour, but nothing is learned from data.' },
  { q: 'A kitchen timer rings after 10 minutes.', a: 'Not AI', why: 'A fixed mechanism; no intelligent task.' },
  { q: 'A model predicts tomorrow\'s electricity demand in MWh from weather data.', a: 'ML — regression', why: 'Quantitative response, learned from historical data.' },
  { q: 'A hospital system flags X-rays as "abnormal" or "normal" after learning from radiologists\' labels.', a: 'ML — classification', why: 'Like DS4A\'s RadiologyML: categorical response learned from labelled data.' },
]
const answers = reactive<Record<number, Choice | undefined>>({})
const score = computed(() => quiz.filter((x, i) => answers[i] === x.a).length)
</script>

<template>
  <PageHeader title="Learn Machine Learning" subtitle="The principal concepts of DS4A Chapter 8, each with a definition, intuition, example and a link to a hands-on lab." />

  <div class="grid gap-6 lg:grid-cols-2">
    <section class="card">
      <h2 class="mb-3 font-semibold">AI ⊃ Machine learning ⊃ Deep learning</h2>
      <svg viewBox="0 0 420 250" class="mx-auto w-full max-w-md" role="img" aria-label="Nested sets: deep learning inside machine learning inside artificial intelligence">
        <ellipse cx="210" cy="125" rx="200" ry="115" fill="#eef2ff" stroke="#6366f1" />
        <ellipse cx="230" cy="140" rx="140" ry="80" fill="#e0e7ff" stroke="#4f46e5" />
        <ellipse cx="250" cy="155" rx="75" ry="42" fill="#c7d2fe" stroke="#4338ca" />
        <text x="40" y="70" class="fill-slate-700 text-[14px] font-semibold">Artificial intelligence</text>
        <text x="110" y="110" class="fill-slate-700 text-[13px] font-semibold">Machine learning</text>
        <text x="205" y="160" class="fill-slate-800 text-[12px] font-semibold">Deep learning</text>
      </svg>
      <p class="mt-2 text-sm text-slate-600">All deep learning is machine learning, and all machine learning is AI — not the other way round (DS4A §8.5).</p>
    </section>
    <section class="card">
      <h2 class="mb-3 font-semibold">The three steps of the ML process (DS4A §8.2)</h2>
      <svg viewBox="0 0 440 150" class="w-full" role="img" aria-label="Ingest data, analyze data, produce model-based results, with a feedback loop">
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b" /></marker></defs>
        <g v-for="(s, i) in ['1. Ingest data', '2. Analyze data', '3. Model-based results']" :key="s">
          <rect :x="10 + i * 145" y="35" width="125" height="56" rx="10" :fill="['#eef2ff', '#e0e7ff', '#c7d2fe'][i]" stroke="#6366f1" />
          <text :x="72 + i * 145" y="68" text-anchor="middle" class="fill-slate-800 text-[12px] font-semibold">{{ s }}</text>
        </g>
        <path d="M135,63 L153,63" stroke="#64748b" marker-end="url(#arr)" /><path d="M280,63 L298,63" stroke="#64748b" marker-end="url(#arr)" />
        <path d="M362,93 C362,135 72,135 72,95" fill="none" stroke="#94a3b8" stroke-dasharray="4 3" marker-end="url(#arr)" />
        <text x="220" y="145" text-anchor="middle" class="fill-slate-500 text-[11px]">feedback: new data and corrections</text>
      </svg>
      <p class="mt-2 text-sm text-slate-600">Collect data → fit a model → act on the results (alerts, dashboards, decisions). <RouterLink class="text-brand-600 hover:underline" to="/exercises/ds4a-ac2">Activity AC 2</RouterLink></p>
    </section>
  </div>

  <section class="card mt-6">
    <h2 class="mb-3 font-semibold">Key concepts</h2>
    <div class="flex flex-wrap gap-1.5">
      <button v-for="c in concepts" :key="c.key" :class="['rounded-full border px-3 py-1 text-sm', selected === c.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 hover:bg-slate-50']" @click="selected = c.key">{{ c.title }}</button>
    </div>
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <div><div class="label">Definition</div><p class="text-sm">{{ current.definition }}</p></div>
      <div><div class="label">Intuition</div><p class="text-sm">{{ current.intuition }}</p></div>
      <div><div class="label">Example</div><p class="text-sm">{{ current.example }}</p></div>
      <div><div class="label">When it is useful</div><p class="text-sm">{{ current.useful }}</p></div>
    </div>
    <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span>Source: {{ current.section }}</span>
      <RouterLink v-if="current.lab" :to="current.lab.to" class="btn-secondary py-1 text-xs">Try it: {{ current.lab.label }}</RouterLink>
    </div>
  </section>

  <section class="card mt-6">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">Activity: what kind of approach is this?</h2>
      <span class="text-sm text-slate-600">Score: {{ score }} / {{ quiz.length }}</span>
    </div>
    <p class="mb-4 text-xs text-slate-500">The answer key below was written from the textbook definitions — no model is used to classify these scenarios.</p>
    <ol class="space-y-4">
      <li v-for="(item, i) in quiz" :key="i" class="rounded-lg border border-slate-200 p-3">
        <p class="text-sm font-medium">{{ i + 1 }}. {{ item.q }}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <button v-for="c in choices" :key="c" :class="['rounded-md border px-2.5 py-1 text-xs', answers[i] === c ? (c === item.a ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-400 bg-red-50 text-red-700') : 'border-slate-300 hover:bg-slate-50']" @click="answers[i] = c">{{ c }}</button>
        </div>
        <p v-if="answers[i]" class="mt-2 flex items-start gap-1.5 text-xs" :class="answers[i] === item.a ? 'text-emerald-700' : 'text-red-700'">
          <Check v-if="answers[i] === item.a" class="h-4 w-4" /><X v-else class="h-4 w-4" />
          <span>{{ answers[i] === item.a ? 'Correct.' : `Not quite — the answer is “${item.a}”.` }} {{ item.why }}</span>
        </p>
      </li>
    </ol>
  </section>
</template>
