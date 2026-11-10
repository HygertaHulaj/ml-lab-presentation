# Ethics in Practice content map — DS4A "Social Justice in Data Science"

**Source:** *Data Science for All*, Chapter 8 "Ethics in Practice: Social Justice in Data Science", **book pp. 394–395** (PDF pages 419–420).
**Status: built.**
- **Code:** `frontend/src/presentation/sections/10-ethics/`.
- **Backend:** `backend/app/ml/ethics.py`, behind `GET /api/v1/concepts/ethics` (about 6 s on the first call, then cached).
- **Tests:** `backend/tests/test_ethics.py` (3), `frontend/tests/ethics.spec.ts` and `frontend/e2e/ethics.spec.ts`. The section is also in the layout guard.
- **Registry:** id `ethics`, n = 10, between section-8-6 and the lab (lab 11, summary 12).
- **Accent:** coral (#f29b8c warm, 6.96:1 or better; #a5382b light, 5.96:1 or better).

**No face data are used.** The book's facial-recognition example rests on one mechanism: a model fails the groups that are under-represented in its training data. That mechanism is measured on the real penguin data. One species (Chinstrap) is made rarer in the training set while the test set stays fixed and complete, and results are averaged over 20 random draws. Every slide says it is an analogy.

| # | Element (p.) | What the book says (paraphrase) | Module | Real numbers |
|---|---|---|---|---|
| 0 | Opening (p. 394) | AI's growing influence (Siri, mortgages, "high risk" of reoffending, jobs); definition of social justice | Everyday uses + definition card | — |
| 1 | The Challenges (p. 394) | AI decides college, credit, résumés, insurance; biases (gender, sexual orientation, disability, location, ethnicity, race) can enter consciously or not | Decision chips; → bias chips | — |
| 2 | Facial recognition, Fig. 8.28 (p. 394) | Systems trained mostly on white and light-skinned faces; train on diverse populations and check every innovation for bias | Book text + (→) a **cited, external** measurement: Gender Shades (Buolamwini & Gebru, 2018), up to 34.7 % errors for darker-skinned women vs at most 0.8 % for lighter-skinned men | external, cited |
| 3 | The mechanism (illustrating p. 394) | — | `RepresentationDemo`: slider over the number of Chinstraps in training; error for that group vs everyone else vs overall accuracy | 0 → 100 %, 2 → 58 %, **5 → 27 % while overall accuracy is 94.6 %**, 48 → 5 %; majority 0 % throughout |
| 4 | Law enforcement, Fig. 8.29 (p. 394) | Few rules; misidentification; under-represented groups face more unjust surveillance; lost public trust | A cause-and-effect chain, revealed link by link | the analogy's 27 % vs 0 % |
| 5 | Mitigation (p. 394) | Examine training data, use representative data, check for bias in every AI innovation | `MitigationDemo`: per-group audit, then reweighting (`class_weight="balanced"`) | 27.0 % → **3.5 %** minority error; others 0.0 → 0.8 % |
| 6 | The Benefits (p. 395) | Many industries; less human input means less potential bias; social cues for neurodivergent people | Three cards | — |
| 7 | College admissions (p. 395) | AI can reduce affinity bias (the lacrosse example); ~300,000 essays: AI predicted gender and household income | Two cards + (→) a caveat: the same signal could be learned and reused by a model trained on past decisions | — |
| 8 | Discussion (ours, labelled) | — | Amplify vs reduce, and three questions | — |
| 9 | Summary | — | Five cards | — |

## Accuracy notes
- The Gender Shades figures come from outside the book. They are cited on the slide and labelled "beyond the book".
- The college-admissions caveat is ours, and the slide frames it as interpretation of the book's example.
- Reweighting is presented as a partial fix. The slide says that with no examples of a group, no weighting can help.
