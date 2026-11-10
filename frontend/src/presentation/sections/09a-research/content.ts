/**
 * Recent research, beyond the book: Kruschel, Hambauer, Weinzierl, Zilker, Kraus & Zschech (2025),
 * "Challenging the Performance-Interpretability Trade-Off: An Evaluation of Interpretable Machine Learning Models",
 * Business & Information Systems Engineering 68(1), 159–183 (online 13 Feb 2025), doi:10.1007/s12599-024-00922-2,
 * open access (CC BY 4.0), preprint arXiv:2409.14429.
 *
 * These are PUBLISHED values quoted from the paper (Section 3 and Table 4, tuned hyperparameters), not computed by this
 * app; the slides label them as such. Checked against the open-access text on 9 Nov 2026.
 */

export const PAPER = {
  title: 'Challenging the Performance-Interpretability Trade-Off: An Evaluation of Interpretable Machine Learning Models',
  authors: 'Kruschel, Hambauer, Weinzierl, Zilker, Kraus & Zschech',
  journal: 'Business & Information Systems Engineering 68(1), 159–183',
  date: 'published online 13 February 2025 · open access',
  doi: '10.1007/s12599-024-00922-2',
}

/** the study design (paper, Section 3) */
export const DESIGN = [
  { big: '14', label: 'models compared', detail: '7 modern interpretable models (GAMs), linear/logistic regression, a decision tree, and 5 black boxes' },
  { big: '20', label: 'real tabular datasets', detail: '10 classification (scored by AUROC), 10 regression (scored by RMSE), up to 150,000 rows each' },
  { big: '5-fold', label: 'cross-validation', detail: 'with a hyperparameter grid search for every model' },
  { big: '68,500', label: 'model runs', detail: 'so every model gets a fair chance' },
]

export type Group = 'gam' | 'classic' | 'blackbox'
export const GROUP_LABEL: Record<Group, string> = { gam: 'Interpretable: modern GAM', classic: 'Interpretable: classic (line, tree)', blackbox: 'Black box' }

/** average rank over the 20 datasets after tuning (1 = best, 14 = worst), paper Table 4 */
export const RANKS: { model: string; group: Group; rank: number }[] = [
  { model: 'CatBoost', group: 'blackbox', rank: 2.85 },
  { model: 'EBM', group: 'gam', rank: 4.05 },
  { model: 'XGBoost', group: 'blackbox', rank: 4.30 },
  { model: 'Random forest', group: 'blackbox', rank: 4.83 },
  { model: 'IGANN', group: 'gam', rank: 6.30 },
  { model: 'Neural net (MLP)', group: 'blackbox', rank: 6.48 },
  { model: 'GAMI-Net', group: 'gam', rank: 6.83 },
  { model: 'TP-Splines', group: 'gam', rank: 7.55 },
  { model: 'P-Splines', group: 'gam', rank: 7.63 },
  { model: 'TabNet', group: 'blackbox', rank: 9.75 },
  { model: 'NAM', group: 'gam', rank: 10.08 },
  { model: 'Linear/logistic regr.', group: 'classic', rank: 11.08 },
  { model: 'Decision tree', group: 'classic', rank: 11.55 },
  { model: 'ExNN', group: 'gam', rank: 11.75 },
]

/** the findings, in the paper's own numbers (Section 4.1, tuned setting) */
export const FINDINGS = [
  { k: 'An interpretable model came 2nd', v: 'EBM (average rank 4.05) beat XGBoost, random forest and the neural networks; only CatBoost (2.85) did better. On the 10 classification datasets EBM ranked first of all 14 models (3.35).' },
  { k: 'The gap is small', v: 'Black boxes won on 14 of 20 datasets, but on classification the best interpretable model trailed the best black box by at most 0.015 AUROC (weather: 0.878 vs 0.893).' },
  { k: 'Old interpretable models do lose', v: 'Linear/logistic regression (11.08) and a single decision tree (11.55) ranked near the bottom. The trade-off is real for them, not for modern GAMs.' },
]

export const MEANING = [
  { k: 'Try an interpretable model first', v: 'On tabular data, a model you can read may cost little or no accuracy. The authors argue it should be the first choice, with a black box only when it is clearly better.', tone: 'ok' },
  { k: 'Reading the model helps fairness', v: 'Each variable has its own plotted curve, so a biased effect can be seen and corrected before the model is used (the paper shows this on a crime dataset). This links to Ethics in Practice.', tone: 'human' },
  { k: 'Know the limits', v: 'Tabular data only, medium-sized datasets, one family of interpretable models, a limited tuning grid. For images and text, as in Section 8.5, the result may not carry over.', tone: 'warn' },
] as const
