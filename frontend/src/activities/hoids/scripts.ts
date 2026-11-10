/**
 * Scripts and Try items for Shah (HoIDS) Chapter 8 Hands-On Problems 8.1–8.4 (pp. 231–233).
 * Wording paraphrases the book; every number is read from the solver output. Pure functions.
 */
import type { ExerciseDetail, SolveResult } from '../../types'
import type { Scene, TryItem } from '../types'

type Coef = { term: string; estimate: number; p: number }
type M = { n: number; r2: number; adj_r2: number; F: number; coefficients: Coef[] }
const coef = (m: M, term: string) => m.coefficients.find((c) => c.term === term)!
const sig = (c: Coef) => (c.p < 0.001 ? 'clearly significant (p < 0.001)' : c.p < 0.05 ? `significant (p = ${c.p.toFixed(3)})` : `not significant (p = ${c.p.toFixed(2)})`)
const pct = (v: number) => `${(v * 100).toFixed(1)} %`

// 8.1 · restaurant ratings (the book's OA 8.3 data)
type Cand = { label: string; params: number[]; sse: number }
export function hop81Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const m = s.model as M, c = s.candidates as Cand[]
  const F = coef(m, 'food'), S = coef(m, 'service'), A = coef(m, 'ambience')
  return [
    { id: 'intro', title: 'Restaurant ratings', lines: [`${s.n_restaurants} restaurants, each with the average ratings previous customers gave for food, ambience and service.`, 'The question: how do those three ratings go with the overall rating?'] },
    { id: 'data', title: 'Food and the overall rating', lines: ['Each dot is one restaurant: its average food rating and its overall rating.'] },
    { id: 'form', title: 'The model, in mathematical form', lines: ['rating = b0 + b1·ambience + b2·food + b3·service', 'Four parameters: a constant and one slope for each rating.'] },
    { id: 'hand', title: 'Trying parameters by hand', lines: [`Predicting the average for everyone leaves a sum of squared errors of ${c[0].sse.toFixed(1)}.`, `A third of each rating: ${c[1].sse.toFixed(1)}.`, `Least squares finds the smallest possible: ${c[2].sse.toFixed(1)}.`] },
    { id: 'fit', title: 'The fitted model', lines: [`Each extra point of food rating goes with about ${F.estimate.toFixed(2)} more points overall, ${sig(F)}.`, `Service: about ${S.estimate.toFixed(2)}, ${sig(S)}. Ambience: about ${A.estimate.toFixed(2)}, ${sig(A)}.`, `R² = ${m.r2.toFixed(3)}: the model accounts for ${pct(m.r2)} of the variation, on these ${m.n} restaurants.`] },
    { id: 'read', title: 'Reporting it in appropriate terms', lines: ['Food goes with the overall rating most strongly, holding the other ratings fixed.', 'Fifteen restaurants are a small sample, and this is an association, not a cause.'] },
  ]
}
export function hop81Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const m = s.model as M, c = s.candidates as Cand[]
  const best = [...c].sort((a, b) => a.sse - b.sse)[0].label
  const sigs = ['ambience', 'food', 'service'].filter((t) => coef(m, t).p < 0.05)
  return [
    { id: 'params', q: 'How many parameters does the model have?', options: ['3', '4', '5'], answer: '4', why: 'The constant b0 and one slope for each of ambience, food and service.' },
    { id: 'best', q: 'Which parameter set has the smallest sum of squared errors?', options: c.map((x) => x.label), answer: best },
    { id: 'food', q: 'Coefficient of food (two decimals)', answer: coef(m, 'food').estimate, tolerance: 0.006 },
    { id: 'r2', q: 'R² of the fitted model (two decimals)', answer: m.r2, tolerance: 0.006 },
    { id: 'sig', q: 'Which rating is significant at the 5 % level?', options: ['food only', 'service only', 'ambience only', 'all three'], answer: sigs.length === 3 ? 'all three' : sigs.length === 1 ? `${sigs[0]} only` : 'food only', why: 'With 15 restaurants, only the food coefficient is clearly different from zero.' },
  ]
}

// 8.2 · Airline Costs
export function hop82Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const m1 = s.model_1 as M, m2 = s.model_2 as M
  const L = coef(m1, 'flight_length_miles'), T = coef(m1, 'daily_flight_time_hours'), C = coef(m2, 'customers_served_1000s')
  return [
    { id: 'intro', title: 'The Airline Costs data', lines: [`${m1.n} US airlines from the early 1950s (Proctor & Duncan, 1954).`, 'Two questions: how many customers does an airline serve, and how large are its assets?'] },
    { id: 'data', title: 'Customers and flight length', lines: ['Each dot is one airline: its average flight length and the customers it serves, in thousands.'] },
    { id: 'fit', title: 'Model 1', lines: ['Model 1 predicts customers from flight length and daily flight time per plane.', `Each extra mile of flight length goes with about ${L.estimate.toFixed(0)} thousand more customers.`] },
    { id: 'table', title: 'Reading the model', lines: [`Flight length is ${sig(L)}.`, `Daily flight time is ${sig(T)}: once length is known, it adds nothing.`, `R² = ${m1.r2.toFixed(3)}: the model explains ${pct(m1.r2)} of the variation in customers.`] },
    { id: 'assets', title: 'Model 2', lines: ['Model 2 predicts total assets from customers served.', `Each extra 1,000 customers goes with about $${Math.round(C.estimate * 100000).toLocaleString('en')} more assets.`, `R² = ${m2.r2.toFixed(3)}: a strong association, carried partly by the four biggest airlines.`] },
    { id: 'insight', title: 'Insight', lines: ['Longer routes, more customers; more customers, more assets: size goes with size.', 'These are associations among 31 airlines seventy years ago, not causes.'] },
  ]
}
export function hop82Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const m1 = s.model_1 as M, m2 = s.model_2 as M
  const L = coef(m1, 'flight_length_miles'), T = coef(m1, 'daily_flight_time_hours')
  const which = L.p < 0.05 && T.p < 0.05 ? 'both' : L.p < 0.05 ? 'flight length only' : T.p < 0.05 ? 'daily flight time only' : 'neither'
  return [
    { id: 'sig', q: 'In model 1, which predictor is significant?', options: ['flight length only', 'daily flight time only', 'both', 'neither'], answer: which },
    { id: 'r21', q: 'R² of model 1 (two decimals)', answer: m1.r2, tolerance: 0.006 },
    { id: 'sign', q: 'In model 2, more customers go with…', options: ['more assets', 'fewer assets', 'no change'], answer: coef(m2, 'customers_served_1000s').estimate > 0 ? 'more assets' : 'fewer assets' },
    { id: 'r22', q: 'R² of model 2 (two decimals)', answer: m2.r2, tolerance: 0.006 },
    { id: 'cause', q: 'Can we conclude that serving more customers causes higher assets?', options: ['No: it is an association', 'Yes: R² is high'], answer: 'No: it is an association', why: 'Observational data on 31 airlines: size goes with size.' },
  ]
}

// 8.3 · rock samples, gradient descent
type A1 = { intercept: number; coefficients: Record<string, number>; r2: number; correlations_with_perm: Record<string, number> }
type A2 = { intercept: number; coefficients: Record<string, number>; iterations_run: number; stop_reason: string }
export function hop83Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const a1 = s.answers[0].answer as A1, a2 = s.answers[1].answer as A2
  const corr = Object.entries(a1.correlations_with_perm).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  return [
    { id: 'intro', title: 'The rock samples', lines: ['48 rock samples from a petroleum reservoir, measured by image analysis.', 'Question one: is permeability linearly related to the pores\' area, perimeter and shape? Question two: find the line by gradient descent.'] },
    { id: 'corr', title: 'First look', lines: [`The strongest correlation with permeability is ${corr[0][0]} (r = ${corr[0][1].toFixed(2)}).`, corr.slice(1).map(([f, r]) => `${f}: r = ${r.toFixed(2)}`).join('; ') + '.'] },
    { id: 'ols', title: 'The linear model', lines: ['Least squares fits perm on all three measurements.', `R² = ${a1.r2.toFixed(3)}: about ${Math.round(a1.r2 * 100)} % of the variation is linear. Permeability is very skewed, so the fit is only partly linear.`] },
    { id: 'gd', title: 'Gradient descent', lines: ['Now find the same model step by step: start at zero, move every θ downhill on the cost.', `The cost falls quickly, then flattens: ${a2.stop_reason} after ${a2.iterations_run} iterations.`] },
    { id: 'compare', title: 'Same answer', lines: [`Gradient descent: intercept ${a2.intercept.toFixed(2)}; least squares: ${a1.intercept.toFixed(2)}.`, 'The coefficients agree to many decimals: two routes, one minimum.'] },
  ]
}
export function hop83Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const a1 = s.answers[0].answer as A1
  const best = Object.entries(a1.correlations_with_perm).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0]
  return [
    { id: 'best', q: 'Which measurement has the strongest correlation with permeability?', options: ['area', 'peri', 'shape'], answer: best },
    { id: 'r2', q: 'R² of the linear model (two decimals)', answer: a1.r2, tolerance: 0.006 },
    { id: 'lin', q: 'Is the relationship fully linear?', options: ['Only partly', 'Yes, perfectly'], answer: 'Only partly', why: 'About 30 % of the variation is left unexplained.' },
    { id: 'same', q: 'Where does gradient descent end up?', options: ['At the least-squares coefficients', 'At different coefficients'], answer: 'At the least-squares coefficients' },
    { id: 'scale', q: 'Why standardise the features before gradient descent?', options: ['So one learning rate suits all features', 'To change the answer', 'It is not needed'], answer: 'So one learning rate suits all features', why: 'area is about 10⁴ while shape is about 0.1.' },
  ]
}

// 8.4 · movies and social media
export function hop84Script(_d: ExerciseDetail, s: SolveResult): Scene[] {
  const ma = s.model_a as M, mb = s.model_b as M
  const corr = s.correlations as Record<string, number>, best = String(s.best)
  const c = s.answers[2].answer as { gd_slope: number; ols_slope: number; gd_intercept: number; iterations_run: number }
  return [
    { id: 'intro', title: 'The movie data', lines: [`${s.n_movies} movies from 2014 and 2015, with their budgets and social-media reactions.`, `${s.n_complete} have every factor recorded; all models use those, so they compare fairly.`] },
    { id: 'a', title: '(a) Budget and followers', lines: [`Budget and aggregate followers explain only ${pct(ma.r2)} of the variation in ratings.`, `Budget is ${sig(coef(ma, 'budget'))}; followers are ${sig(coef(ma, 'aggregate_followers'))}.`] },
    { id: 'b', title: '(b) Adding interactions', lines: [`Add likes, dislikes and comments: R² rises from ${ma.r2.toFixed(3)} to ${mb.r2.toFixed(3)}.`, `Adjusted R², which penalizes extra predictors, goes from ${ma.adj_r2.toFixed(3)} to ${mb.adj_r2.toFixed(3)}. The expanded model accounts for more variation in these observed ratings; whether it predicts new movies better requires separate validation.`] },
    { id: 'best', title: '(c) The best predictor', lines: [`On its own, ${best.replace(/_/g, ' ')} has the strongest correlation with rating: r = ${corr[best].toFixed(3)}.`] },
    { id: 'gd', title: 'Gradient descent', lines: [`Gradient descent on ${best} (standardised): the line tilts and settles as the cost falls.`, `It stops after ${c.iterations_run} iterations.`] },
    { id: 'compare', title: 'The optimal intercept and gradient', lines: [`Intercept ${c.gd_intercept.toFixed(3)}; gradient ${(c.gd_slope * 1e6).toFixed(4)} rating points per $1 million, the same as least squares.`] },
  ]
}
export function hop84Try(_d: ExerciseDetail, s: SolveResult): TryItem[] {
  const ma = s.model_a as M, mb = s.model_b as M
  const c = s.answers[2].answer as { ols_slope: number }
  return [
    { id: 'ra', q: 'R² of model (a), budget + followers (two decimals)', answer: ma.r2, tolerance: 0.006 },
    { id: 'rb', q: 'R² of model (b), with likes, dislikes and comments (two decimals)', answer: mb.r2, tolerance: 0.006 },
    { id: 'imp', q: 'On these movies, does adjusted R² rise when the interactions are added?', options: ['Yes, adjusted R² rises', 'No'], answer: mb.adj_r2 > ma.adj_r2 ? 'Yes, adjusted R² rises' : 'No' },
    { id: 'best', q: 'Which factor has the strongest absolute correlation with rating (the highest one-predictor R²)?', options: ['budget', 'aggregate_followers', 'likes', 'dislikes', 'comments'], answer: String(s.best) },
    { id: 'slope', q: 'Gradient per $1 million of budget (three decimals)', answer: c.ols_slope * 1e6, tolerance: 0.0006 },
  ]
}
