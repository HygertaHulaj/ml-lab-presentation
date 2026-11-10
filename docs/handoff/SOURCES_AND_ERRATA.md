# Sources, chapter map and errata

## Chapter and source map
| Section of the talk | Source | Pages |
|---|---|---|
| Opening film | written for this presentation (fictional scenario) | — |
| What is AI? · What is ML? | DS4A Ch. 8 §8.1, §8.2, §8.5 | pp. 364–365, 389 |
| How learning works | DS4A §8.2–§8.4 (Iris workflow, our breakdown of the three steps) | 365–388 |
| §8.2 Three steps | DS4A §8.2 | 365–368 |
| §8.3 Characteristics of methods | DS4A §8.3 | 368–379 |
| Worked example: movies | Shah, *A Hands-On Introduction to Data Science*, Ch. 8, Hands-On Problem 8.4 | 233 |
| §8.4 Evaluation | DS4A §8.4 (+ "back to the movies": Shah 8.4 data) | 380–388 |
| §8.5 Deep learning | DS4A §8.5 | 389–392 |
| §8.6 High-quality data | DS4A §8.6 | 392–393 |
| Ethics in practice | DS4A Ch. 8 Ethics in Practice | 394–395 |
| Conclusion | the whole chapter; DS4A Key Terms | 396 |
| Practice (embedded) | DS4A Applying the Concepts; Shah Hands-On Problems 8.2–8.4 | 398–401; 232–233 |

Detailed maps: `docs/SECTION_8_*_CONTENT_MAP.md`, `docs/ETHICS_CONTENT_MAP.md`, `docs/CINEMATIC_ACTIVITIES.md`.

## Textbook errata and deliberate deviations
| Where | The book | Here | Why |
|---|---|---|---|
| DS4A p. 383, specificity | TN / (TN + FN) | **TN / (TN + FP)** (actual negatives in the denominator) | conventional definition; in the book's matrix FP = FN, so the number is the same. Shown on the slide. |
| DS4A Fig. 8.21 (p. 387) | the best model has the lowest **test** error | blue is chosen by **cross-validation** on the training points; the test error is reported once | selecting on the test set makes it no longer a test; the reproduction is labelled |
| DS4A p. 389, deep learning | broad superiority ("more precisely than other forms of AI", "almost instantly") | "can …, depending on the task, the data and the model", with a cited counterexample | not universally true (Grinsztajn et al., 2022) |
| Shah Problem 8.1 | the book's file is called `ratings.csv` | the file supplied is `ratings.tsv` (tab-separated); the data are the book's OA 8.3 | file name only |
| Shah Problem 8.4 (b) | "does the prediction improve?" | the question is kept; the answer says R² rose **in-sample**, and §8.4 shows the held-out score | in-sample fit is not predictive evidence |
| Iris journey | — | feature scores computed **after** the split, on training flowers only | avoids test-label leakage |

## References
- Davis, J., & Glanz, H., *Data Science for All*, Chapter 8 (pp. 363–401); datasets: github.com/datasci4all/Datasets (Ch_8_Data).
- Shah, C., *A Hands-On Introduction to Data Science*, Chapter 8, Hands-On Problems 8.2–8.4 (pp. 232–233).
- Buolamwini, J., & Gebru, T. (2018). Gender Shades. *Proceedings of Machine Learning Research* 81. https://proceedings.mlr.press/v81/buolamwini18a.html
- Grinsztajn, L., Oyallon, E., & Varoquaux, G. (2022). Why do tree-based models still outperform deep learning on typical tabular data? NeurIPS Datasets and Benchmarks.
- Fisher, R. A. (1936). The use of multiple measurements in taxonomic problems. *Annals of Eugenics* 7(2).
- James, Witten, Hastie & Tibshirani, *An Introduction to Statistical Learning* (origin of the Carseats data and of Fig. 8.17's design).

## Dataset origins and licences
| Dataset | Origin | Licence / terms |
|---|---|---|
| Iris | Fisher (1936), bundled with scikit-learn | public-domain data; scikit-learn BSD-3-Clause |
| Car seats, college, penguins (DS4A) | DS4A official repository; originally ISLR `Carseats` (simulated), ISLR `College`, palmerpenguins | the README records the repository as MIT-licensed, but no licence file is bundled here: **confirm on the repository before redistributing**. palmerpenguins data: CC0 |
| Movies 2014–2015 (CSM) | M. Ahmed et al., UCI Machine Learning Repository dataset 424, doi:10.24432/C5SP5T | CC BY 4.0 (attribution above) |
| Airline costs | Proctor & Duncan (1954), *Journal of Air Law and Commerce* 21(3); course copy retrieved via the Internet Archive | terms not stated: **verify before redistributing** |
| Shah Table 8.2 (Examples 8.1–8.2) | the book's OA 8.1 `regression.csv`, supplied by the user (identical to the printed table) | from the book's online appendix |
| Rock samples | R `datasets::rock` (BP Research), via Rdatasets | distributed with R (GPL) |
| Handwritten digits | UCI Optical Recognition of Handwritten Digits, bundled with scikit-learn | UCI CC BY 4.0; scikit-learn BSD-3-Clause |
| Breast cancer, diabetes (classic lab) | UCI / Efron et al. (2004), bundled with scikit-learn | as distributed with scikit-learn |
| Restaurant ratings (Shah 8.1) | the book's OA 8.3 `ratings.tsv` (15 restaurants), supplied by the user | from the book's online appendix: for teaching with the book |

The film, the RadiologyML scenario and every medical image in it are fictional and synthetic.
