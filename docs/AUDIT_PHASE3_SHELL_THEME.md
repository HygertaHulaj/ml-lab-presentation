# Audit phase 3: one presenter shell, one theme, readable from the back (8 Nov 2026)

Source: `PRESENTATION_COMPOSITION_AUDIT.md` C2 and §5. Checkpoint before the work:
`../checkpoints/ml-learning-lab-2026-11-08-before-phase3.tar.gz`.

## 1. Content opens inside the presentation (C2)
- `presentation/shell/EmbedLayer.vue` + `ShellApi.openEmbed()`: an activity or a 3D lesson opens **over the current step**. The
  section stays mounted underneath, so closing (Esc, or "← Back to the presentation") returns to the same step with its state.
  The URL does not change. While an embed is open the shell hands it every key, so nothing fires twice underneath.
- The activity player and the lesson shell detect the embed (`EMBED_CLOSE` injection) and replace their route links with
  "Back to the presentation". Standalone routes (`/activities/*`, `/lessons/*`) are unchanged and still honour `?return=`.
- Each section lists its practice in the registry (`embeds`); the section's last step shows them as "Practise here":
  8.2 → Activity 2, K-Means in 3D · 8.3 → Activities 3–6 · Movies → the 3D lesson, Problem 8.4 activity, Airlines, Rock ·
  8.4 → Activities 7–8. The Movies section's separate link row was removed.

## 2. One theme, one motion setting, one key map (§5)
- Lessons take the **presenter's theme** (Warm Lab / Lecture Hall Light, key **L** everywhere) and **reduced-motion setting**
  (`usePresentation().reducedMotionSetting`, falling back to the OS). 284 Tailwind palette classes in the lesson shell and panels
  became theme tokens; nothing in the lesson chrome is fixed navy/cyan any more.
- The **3D stage stays a dark inset** in both themes (`themeVars('warm')` on the stage only): its materials, glow and fog are
  tuned for a dark ground. This is a deliberate choice, not an omission.
- **Semantic colour roles** are defined once (`SEMANTIC` in `presentation/theme.ts`): observations `--c-obs` (data), the model's
  prediction `--c-pred` (compute), the reference/target `--c-ref` (human), errors `--c-err` (warn). The regression 3D scene uses
  the same roles (`SEMANTIC_HEX`), so the dots, the fitted line, the least-squares reference and the residuals have one meaning in
  the panels, the 3D view and the presentation.
- **Keys** (shared meaning): → / ← teaching steps · Space play/pause media in lessons and activities (in the chapter it still
  advances, unless the step owns media) · **1 / 2 / 3** modes in lessons and activities · **L** theme · **F** full screen ·
  **Esc** back from an embed. Legacy lesson aliases E (explore) and M (math) remain on the standalone lesson routes; in the
  chapter M stays mute.

## 3. Reading sizes (§5: essential text ≥ 22 px at 1080p)
- Measured first (`e2e/typescale.measure.spec.ts`, run with `MEASURE_OUT`): 282 classes of HTML text were under 22 px at
  1920×1080.
- Rule: `font-size: max(<design size>, var(--up-A))`, where `--up-A` (on `.pres-root`) grows from the design size **A px at
  1366 px wide to 22 px at 1920 px wide**. Smaller screens keep their tested layout; the projector gets 22 px. Applied to every
  essential rule in the presentation sections and shared concept visuals (≈ 290 declarations); secondary text is exempt:
  kickers, citations (`.src`), chart ticks, the digit pixel grid, navigation chips, hints, key legends. SVG chart labels scale
  with their chart.
- Lessons: a lesson type scale (`--l-xs … --l-lg`, ≈ 18–23 px at 1920) for the panels, subtitles `clamp(17px, 1.25vw, 26px)`,
  wider side panel (`clamp(22rem, 26vw, 34rem)`).
- Overflow fixed where the larger text needed room: §8.4 Try It (quiz in four columns), and compact spacing below 1000 px of
  height for §8.2 Try It, §8.4 Try It and the Movies bowl. Text sizes were not reduced to fit.
- Guarded by `e2e/projection.spec.ts`: on every step of the core route at 1920×1080, essential text ≥ 22 px and no step scrolls.

## Checks
Unit 123 passed · `vue-tsc` clean · Playwright full suite (one worker) 107 passed + the two §8.3 layout cases fixed and rerun · projection check 11/11 core sections. Details: `IMPLEMENTATION_PROGRESS.md` (8 Nov, after audit phase 3).

## Remaining (phase 4 and beyond)
- Iris colours: the learning journey and the K-Means lesson still use different species palettes; clusters need their own
  palette, distinct from species (audit §5). Not changed in phase 3.
- Selected-observation persistence beyond Movies (e.g. an Iris flower across steps).
- K-Means 3D scene colours are not yet on the semantic roles (the regression scene is).
- Rehearse the 80-minute route on the real projector; handoff documents. The presentation is still not described as professor-ready.
