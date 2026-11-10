/** The cinematic activities, in book order: DS4A Ch. 8 "Applying the Concepts" (pp. 398–401), then Shah Ch. 8 Hands-On Problems (pp. 231–233). */
import type { ActivityDef } from './types'
import { ac1Script, ac1Try, ac2Script, ac2Try, ac3Script, ac3Try, ac4Script, ac4Try, ac6Script, ac6Try, ac7Script, ac7Try, ac8Script, ac8Try } from './ds4a/scripts'
import { ac5Script, ac5Try } from './ds4a/ac5'
import { hop81Script, hop81Try, hop82Script, hop82Try, hop83Script, hop83Try, hop84Script, hop84Try } from './hoids/scripts'

const sortVisual = () => import('./ds4a/SortVisual.vue')

export const ACTIVITIES: ActivityDef[] = [
  { id: 'ds4a-ac1', book: 'DS4A', label: 'Activity 1', title: 'Identify Artificial Intelligence', page: 'p. 398', blurb: 'Eight everyday objects sorted into AI and not AI.', tone: 'accent', script: ac1Script, tryItems: ac1Try, visual: sortVisual },
  { id: 'ds4a-ac2', book: 'DS4A', label: 'Activity 2', title: 'Identify Data Ingestion, Data Analysis, and Results', page: 'p. 398', blurb: 'The Physical Fitness Assistant: nine features in the three ML steps.', tone: 'data', script: ac2Script, tryItems: ac2Try, visual: sortVisual },
  { id: 'ds4a-ac3', book: 'DS4A', label: 'Activity 3', title: 'Reading a Decision Tree', page: 'p. 399', blurb: '777 real colleges flow down a one-split tree: private or public?', tone: 'ok', script: ac3Script, tryItems: ac3Try, visual: () => import('./ds4a/Ac3Visual.vue') },
  { id: 'ds4a-ac4', book: 'DS4A', label: 'Activity 4', title: 'Regression versus Classification', page: 'p. 399', blurb: 'Six response variables: a number or a category?', tone: 'feature', script: ac4Script, tryItems: ac4Try, visual: sortVisual },
  { id: 'ds4a-ac5', book: 'DS4A', label: 'Activity 5', title: 'Inference versus Prediction', page: 'p. 399', blurb: 'Movies, an election and California fires: fill in the blanks.', tone: 'human', script: ac5Script, tryItems: ac5Try, visual: () => import('./ds4a/Ac5Visual.vue') },
  { id: 'ds4a-ac6', book: 'DS4A', label: 'Activity 6', title: 'Interpretability versus Complexity', page: 'p. 400', blurb: 'Three real penguin trees, depth 1, 5 and 7, grow side by side.', tone: 'data', script: ac6Script, tryItems: ac6Try, visual: () => import('./ds4a/Ac6Visual.vue') },
  { id: 'ds4a-ac7', book: 'DS4A', label: 'Activity 7', title: 'Accuracy, Precision, Recall, and Specificity', page: 'p. 400', blurb: '81 unseen car seat stores fill a confusion matrix.', tone: 'warn', script: ac7Script, tryItems: ac7Try, visual: () => import('./ds4a/Ac7Visual.vue') },
  { id: 'ds4a-ac8', book: 'DS4A', label: 'Activity 8', title: 'Overfitted, Underfitted, and Well-Fitted Models', page: 'pp. 400–401', blurb: 'Three models, training versus test: which one fits?', tone: 'compute', script: ac8Script, tryItems: ac8Try, visual: () => import('./ds4a/Ac8Visual.vue') },
  { id: 'hoids-hop8-1', book: 'HoIDS', label: 'Problem 8.1', title: 'Linear Regression: Restaurant Ratings', page: 'p. 231', blurb: '15 restaurants: the overall rating from food, ambience and service ratings. Try parameters by hand, then least squares.', tone: 'ok', script: hop81Script, tryItems: hop81Try, visual: () => import('./hoids/Hop81Visual.vue'), lesson: 'shah-8-1-restaurants' },
  { id: 'hoids-hop8-2', book: 'HoIDS', label: 'Problem 8.2', title: 'Linear Regression: Airline Costs', page: 'p. 232', blurb: '31 airlines of the 1950s: customers from flight length, assets from customers.', tone: 'compute', script: hop82Script, tryItems: hop82Try, visual: () => import('./hoids/Hop82Visual.vue'), lesson: 'shah-8-2-airlines' },
  { id: 'hoids-hop8-3', book: 'HoIDS', label: 'Problem 8.3', title: 'Gradient Descent: Rock Samples', page: 'p. 232', blurb: '48 petroleum rock samples: a linear model, then gradient descent down to the same answer.', tone: 'human', script: hop83Script, tryItems: hop83Try, visual: () => import('./hoids/Hop83Visual.vue'), lesson: 'shah-8-3-rock' },
  { id: 'hoids-hop8-4', book: 'HoIDS', label: 'Problem 8.4', title: 'Gradient Descent: Movies and Social Media', page: 'p. 233', blurb: 'Do budgets and likes predict how a movie is rated? Then gradient descent on the best predictor.', tone: 'feature', script: hop84Script, tryItems: hop84Try, visual: () => import('./hoids/Hop84Visual.vue'), lesson: 'shah-8-4-movies' },
]

export const activityById = (id: string) => ACTIVITIES.find((a) => a.id === id)
