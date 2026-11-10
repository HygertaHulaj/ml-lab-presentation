# Audit phase 4: verification and handoff (8 Nov 2026)

Source: `PRESENTATION_COMPOSITION_AUDIT.md` §5 (Iris colours), §7 steps 6–7 and §8. Checkpoint before the work:
`../checkpoints/ml-learning-lab-2026-11-08-before-phase4.tar.gz`. Nothing has been sent or published.

## 1. Iris colours (audit §5)
- One species palette, defined once (`SPECIES_TOKEN` in `presentation/theme.ts`): setosa teal, versicolor green, virginica
  violet. Used by the learning journey, §8.2, the rules-versus-learning demo (versicolor was teal there before) and the
  K-Means lesson's comparison scene (it had pink/green/yellow).
- Clusters have their own palette in hues no species uses (`CLUSTER_TOKENS`: pink, amber, blue; `CLUSTER_HEX` for K up to
  10 in 3D). Before, the K-Means lesson's first clusters were cyan/amber/violet, the presentation's species hues.
- The K-Means 3D scene's fog uses the shared dark-stage ground. Unit test: species colours distinct; no cluster colour is a
  species colour.

## 2. Verification
- `e2e/rehearsal.spec.ts`: a clean browser, one URL, then only → from the title to the appendix. Sections arrive in registry
  order; no step says "in development"; every core section's last step shows its answer and next question; no console
  errors. Twice: Warm Lab with full motion, Lecture Hall Light with reduced motion and sound off. **258 presses** in that run (press counts vary with animation timing; the notes now use step counts, 108 core steps) for the core
  route (per section in `docs/handoff/PRESENTER_NOTES.md`).
- `e2e/projection.spec.ts` (phase 3): essential text ≥ 22 px and no scrolling on every core step at 1920×1080.
- Full suite, one worker: **111 passed, 0 failed** (2 on-demand tools skipped): layout guard at four sizes, every section walkthrough, lessons, activities, the film, the classic lab. Backend 129, unit 124, `vue-tsc` clean.

## 3. Handoff (`docs/handoff/`)
| File | Content |
|---|---|
| `START_HERE.md` | the one start link, startup (Docker / local / offline SQLite), a ten-minute pre-class check, what to do if something fails |
| `PRESENTER_NOTES.md` | the 80-minute core route: per section the question, answer, key points, steps, practice, bridge; what to cut first |
| `ABSTRACT.md` | abstract and eight learning objectives |
| `SOURCES_AND_ERRATA.md` | chapter/source map, textbook errata and deliberate deviations, references, dataset origins and licences |
| `STUDENT_EXPLORATION.md` | where students explore after the lecture |
| `fallback/Lecture8-fallback.pdf` | 108 pages: every core step at 1920×1080 after its reveals, in talk order (the film ships as its MP4) |
| `make_fallback_pdf.py` + `frontend/e2e/fallback.capture.spec.ts` | rebuild the frames and the PDF |

README: a "The lecture (start here)" section and current test counts.

## 4. Readiness, honestly
Done: the agreed corrections (phase 1), the storyline and ending (phase 2), one shell / theme / reading size (phase 3),
automated verification and the handoff set (phase 4).
**Not done, and not something software can do:** a rehearsal with the presenter on the real projector (the 80 minutes are a
plan; the press counts exclude discussion), and a run on the receiving machine. Licences marked "verify" in
`SOURCES_AND_ERRATA.md` (DS4A repository files, the airline costs copy) should be confirmed before the files are redistributed.
Sending anything to the professor remains a separate, explicit decision.
