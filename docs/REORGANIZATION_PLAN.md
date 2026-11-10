# Reorganization plan — ML Learning Lab V2

Principle: **add the presentation beside the working lab, then move proven pieces into it**. Nothing that works is deleted. The classic lab (`/`, `/training`, `/evaluation`, …), the K-Means lesson and `/film` keep their URLs.

## A. What already exists
- The finished opening video (MP4 + VTT/SRT) and its interactive 3D version (`/film`), both on shared story data.
- A real-computation backend: K-Means trace, regression, gradient descent, trees, logistic regression, evaluation, exercises (36 endpoints, 83 tests).
- A cinematic lesson engine (GSAP playhead, camera, narration, shortcuts, reduced motion) and the K-Means lesson.
- The classic lab pages for DS4A/Shah Chapter 8 exercises.
- A design-token file (`shared/story/visual-tokens.json`).

## B. What can be reused
| Asset | Reused for |
|---|---|
| `LessonTimelineController` | step and playhead control in presentation sections (play, pause, step, reverse) |
| `useLessonShortcuts`, `usePrefersReducedMotion`, `toggleFullscreen` | shell keyboard, reduced motion, full screen |
| `visual-tokens.json` | presentation colours, type and motion |
| `iris.json` and `/api/v1/datasets/iris` | small real datasets for concept demos |
| `ml/decision_tree.py`, scikit-learn | the "learned rule" (a decision stump) in the AI section; later §8.3 |
| K-Means lesson | Lab section, clustering simulation |
| Training, Gradient Descent and Evaluation labs | Lab section links now; Evaluation section later |
| `LearnView` definitions (with section refs) | wording for the AI, ML and 8.2 reveals |

## C. What should be improved
- One global presentation shell instead of separate full-screen pages, each with its own controls.
- One reduced-motion and audio setting, shared across sections and persisted.
- Static definition cards become progressive, visual explanations.
- The video intro needs a designed ending: the video's last-frame pixels become the AI section's data points.
- The MP4 size (a grain-free re-encode, *not* a re-render; optional).

## D. What is missing
- `/presentation/*` routes, shell, navigation, section index, progress persistence.
- `CinematicVideoPlayer` with poster, fallback, captions, replay and skip.
- Sections: AI (now), Machine Learning, How Learning Works, Section 8.2 modules, Lab hub, Summary.
- k-NN backend trace (for the classification simulation).
- A concept-visualization component system (`visualizations/`).

## E. What must be developed next (order)
1. **Phase 0–1 (now):** audit, plan, flow; the `presentation/` folder; routes.
2. **Phase 2 (now):** `PresentationShell` (navigation, keyboard, progress, index, full screen, mute and volume, reduced motion, auto-hiding chrome, persistence).
3. **Phase 3 (now):** video intro, then the pixels-to-data transition into AI.
4. **Phase 4 (now):** AI section: question, examples, definition, nested AI ⊃ ML ⊃ DL with focus, rules versus learned (real backend stump with intermediate states), DS4A "Identify AI" exercise.
5. Phase 5: Machine Learning: traditional programming versus training and inference, synchronized.
6. Phase 6: How learning works: a reversible data-to-prediction journey with a train/test split.
7. Phase 7: Section 8.2 modules in source order (`SECTION_8_2_CONTENT_MAP.md`).
8. Phase 8: Lab: embed K-Means; add a k-NN backend trace and visualization.
9. Phase 9: Summary, QA, profiling.

## F. Intentionally out of scope (this iteration)
- Re-rendering or re-editing the film.
- Restyling the classic lab pages.
- §8.3–8.6 modules (decision trees, regression versus classification, evaluation, deep learning, data quality) as full sections. They are linked to the existing labs until later phases.
- Server-side presentation state (progress is a per-viewer convenience stored in `localStorage`).

## Target structure (adapted to this repository)
```
frontend/src/
  presentation/
    shell/          PresentationShell.vue, SectionIndex.vue, PresenterControls.vue, store.ts (Pinia), sections.ts (registry), tokens.ts
    media/          CinematicVideoPlayer.vue, PixelDissolve.ts (video frame → particles)
    sections/
      01-introduction/        IntroSection.vue
      02-artificial-intelligence/  AiSection.vue, NestedFields.vue, ExampleVignettes.vue, RulesVsLearning.vue, IdentifyAi.vue, content.ts
      03-machine-learning/ … 07-summary/   (registered with an "in development" state until built)
  visualizations/
    shared/         ParticleField.ts (deterministic field shared by transition and sections), StepExplanation.vue, ConceptIntroduction.vue
  experiences/cinematic/   (unchanged; the film)
  engine/, lessons/, views/, components/   (unchanged; lessons + classic lab)
backend/app/
  ml/concepts.py               threshold-scan decision stump (pure NumPy, validated against scikit-learn)
  api/v1/concepts.py           GET /api/v1/concepts/rule-vs-learned
```
Rules: sections never import from each other; shared visuals live in `visualizations/`; ML numbers come from the backend.
