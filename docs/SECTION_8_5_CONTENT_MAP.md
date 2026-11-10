# Section 8.5 content map — DS4A "Deep Learning"

**Source:** *Data Science for All*, Chapter 8, Section 8.5, **book pp. 389–392** (PDF pages 414–417). Extracted 6 Nov 2026. Figs 8.23–8.25 were read from the rendered pages.
**Status: built.** Code locations:
- **Frontend:** `frontend/src/presentation/sections/08-section-8-5/`.
- **Backend:** `backend/app/ml/deep.py`, behind `GET /api/v1/concepts/deep-learning` and `POST /api/v1/concepts/digits/predict`.
- **Registry:** n = 8, between section-8-4 and the lab (lab 9, summary 10). Accent: violet (#c49af5 warm, 8.05:1 / #7a3db8 light, 5.98:1).
- **Tests:** `backend/tests/test_deep.py` (5), `frontend/tests/section85.spec.ts`, `frontend/e2e/section85.spec.ts`; also in the layout guard.
- **Speed:** training everything takes about a minute, so the deterministic result, including the fitted weights, is generated once into `backend/app/ml/data/deep_bundle.json` (`python -m app.ml.deep`). The API serves it in milliseconds, drawn digits are predicted with the NumPy forward pass over the stored weights, and a test checks the file equals a fresh training run.

**Real data plan.** Use scikit-learn's bundled handwritten digits: 1,797 images of 8×8 pixels with intensity 0–16. Nothing needs downloading. It is a small version of the book's Fig. 8.25, where MNIST images are 28×28. Train an `MLPClassifier` (64 → 32 → 16 → 10, fixed `random_state`) on a seeded 80 / 20 split.

| # | Heading / element (p.) | What the book says (paraphrase) | Planned module | Real numbers |
|---|---|---|---|---|
| 0 | Section intro (p. 389) | Alex points her phone at a menu in Istanbul and it is translated. All deep learning is machine learning, not the reverse. DL mimics the brain with neural networks | Nested rings AI ⊃ ML ⊃ DL; the translated-menu vignette | — |
| 1 | Power and cost (p. 389) | More precise, but needs much more training time, large datasets and powerful hardware, and has very low interpretability | Balance: gains vs costs | — |
| 2 | Why Study Deep Learning? (p. 389) | Virtual assistants, translation, driverless cars and drones, chatbots, facial recognition (Fig. 8.22), recommendations | Application grid | — |
| 3 | ANN + deep learning DEFINITIONS, Fig. 8.23 (pp. 389–390) | An ANN is built to resemble the brain. Deep learning uses ANNs with several layers. Green = explanatory variables, red = response | `NetworkFigure`: simple ANN (4 → 5 → 1) next to a deep network (5 → 6 → 6 → 6 → 4); → data flows layer by layer | schematic |
| 4 | The Mechanics of Deep Learning (p. 390) | More layers form more complex features and are strong on large unstructured data. Disadvantages: needs data and compute, hard to understand, almost impossible to interpret, overkill for simple problems | Pros and cons; link back to Fig. 8.13 (§8.3) | — |
| 5 | Case Study: ChatGPT (p. 390) | A large language model trained on huge amounts of text; it generates responses | Case card. **Accuracy note:** the book says "unsupervised". It is more precisely *self-supervised* pre-training (predicting the next word), followed by fine-tuning with human feedback. Say so carefully | — |
| 6 | Fig. 8.24 (pp. 390–391) | Large networks outperform traditional ML and small networks when data are plentiful | `LearningCurves`: the book's curve as a schematic, then (→) the measured curves at 30–1,437 training images | logistic 58.6 → 97.5 %; small MLP 67.2 → 96.9 %; large MLP 67.8 → **98.9 %** (best with the most data; the gap is a few points, and the slide says so) |
| 7 | Image Recognition, Fig. 8.25 (p. 391) | The image becomes an array of shading intensities, processed like any dataset | Pick a digit, see its 8×8 pixel grid and its 64 numbers | real digit images |
| 8 | (same) Forward pass | Trained on thousands of digits, the network learns which features mark each digit | `ForwardPass` / `NetReading`: the chosen digit's real activations per layer, the 10 probabilities, 2,778 weights, 365 passes, the 10 real mistakes (click one) | test accuracy 97.2 % (350 / 360) |
| 9 | Try it (an extension, not in the book) | — | `DrawDigit`: draw (or "Show me a 7"); encoded like the dataset (crop, fit 28 px in 32×32, count 4×4 blocks → 8×8, 0–16; `encode.ts`); the backend predicts | POST predict |
| 10 | Face ID (Fig. 8.26, pp. 391–392) + Case Study: construction safety (p. 392) | Facial recognition unlocks the phone. A deep-learning assistant ranks open issues and flags missing protective equipment | Two application cards; responsible-AI note (bias, §8.6 and the ethics box) | — |
| 11 | Summary | — | Cards | — |

## Accuracy notes
- ChatGPT: the book says "unsupervised"; the slide adds that it is self-supervised pre-training followed by fine-tuning with human feedback, and that generated text can be confidently wrong.
- Fig. 8.24 is conceptual in the book; the measured curves are shown next to it with their real, smaller gap.
- The feature "ladder" (pixels → edges → loops → shapes) is labelled as an illustration of the idea.
