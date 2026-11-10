/**
 * Pages the lecture does not use are HIDDEN, not deleted (presenter's choice, 9 Nov 2026).
 * The app keeps only the presentation (film → conclusion), the chapter activities (/activities: Applying the Concepts
 * 1–8, Hands-On Problems 8.1–8.4) and the 3D lessons the presentation opens (/lessons/:id).
 *
 * Set to `true` to bring back everything else: the classic lab (Dashboard, Learn ML, Exercise Academy, Training Studio,
 * Gradient Descent, Decision Trees, Evaluation Lab, New Problem, Practice), the standalone /film page, the movie
 * workshop (/workshops/movies) and the "Algorithm Lab" appendix of the presentation. Their code is untouched.
 */
export const SHOW_EXTRA_PAGES = false
