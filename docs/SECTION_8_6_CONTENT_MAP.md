# Section 8.6 content map — DS4A "Use High-Quality Data in Machine Learning"

**Source:** *Data Science for All*, Chapter 8, Section 8.6, **book pp. 392–393** (PDF pages 417–418). Extracted 6 Nov 2026.
**Status: built.**
- **Code:** `frontend/src/presentation/sections/09-section-8-6/`.
- **Backend:** `backend/app/ml/data_quality.py`, behind `GET /api/v1/concepts/data-quality` (about 7 s on the first call, then cached in-process).
- **Tests:** `backend/tests/test_data_quality.py` (4), `frontend/tests/section86.spec.ts` and `frontend/e2e/section86.spec.ts`. The section is also in the layout guard.
- **Registry:** n = 9, between section-8-5 and the lab (lab 10, summary 11).
- **Accent:** gold (#d9c35c warm, 8.4:1 or better; #7d6a00 light, 4.85:1 or better).

The book defines the four dimensions and gives a RadiologyML example for each, but has no figures or data. Each dimension is therefore **measured** on real data with a simple, fast model (logistic regression), so students see the effect rather than only read about it.

| # | Heading / element (p.) | What the book says (paraphrase) | Module | Real numbers |
|---|---|---|---|---|
| 0 | Section intro (p. 392) | AI's success can look seamless. Four dimensions decide usefulness: freshness, volume, diversity, quality. "Garbage in, garbage out" | Four dimension cards | — |
| 1 | Data Freshness (p. 393) | Data must be relevant and current. RadiologyML needs the latest images from new and existing equipment | Definition + `FreshnessDemo`: real test digits as a **simulated** new scanner would record them (55 % shading). The old model drops; retraining with fresh images restores it | old model 97.5 % → 90.0 % on the new scanner; +50 fresh 96.4 %, +100 fresh 97.5 % |
| 2 | Data Volume (p. 393) | Many data points are needed to find patterns. RadiologyML needs millions of images | Definition + `VolumeDemo`: accuracy against training images (log scale) | 20 → 49.2 %, 200 → 90.6 %, 1,437 → 97.5 % |
| 3 | Data Diversity (p. 393) | Diverse data give a broader picture; data must come from people everywhere, not only wealthy majorities. Noé worries RadiologyML is trained on one community (mostly Hispanic, wealthy, older) | Definition + `DiversityDemo`: the real island × species table (no Chinstrap on Biscoe); one-island model vs all-islands model of the same size (110 penguins) | Biscoe only: Chinstrap **0 %**, 80 % overall; all islands: Chinstrap 95 %, 99 % overall |
| 4 | Data Quality (p. 393) | Quality ranks highest, above diversity and even volume. Guard against fraud, erroneous reporting and incorrect information. Compressed low-resolution scans may predict poorly | Definition + `QualityDemo`: the same digit at 8×8, 4×4 and 2×2 with retrained accuracy; then wrong training labels | 97.5 / 86.7 / 51.7 %; wrong labels 0 / 10 / 20 / 40 / 60 % → 97.5 / 94.4 / 93.3 / 90.3 / 79.4 % |
| 5 | Closing paragraph (p. 393) | Training data must represent the data the model will be applied to, like a sample and its population in statistical inference; the four dimensions help achieve this | Schematic population; a stratified sample vs a one-community sample (labelled illustrative) | — |
| 6 | Practice (beyond the book, labelled so) | — | `ChoiceQuiz`: six scenarios, "which dimension is at risk?" | — |
| 7 | Summary | — | Five cards + a bridge to the chapter's Ethics in Practice box (pp. 394–395) | — |

## Accuracy notes
- The freshness drift is simulated: the images are real, but a fainter scanner is applied in code, and the slide says so.
- In the diversity demo the effect comes from real data. Chinstrap penguins live only on Dream, so a Biscoe-only training set contains none and the model cannot recognise them. This mirrors the book's concern without inventing data.
- Bars on the freshness and quality slides start at 50 %, and the slides say so.
