# Animation specifications (V2 presentation)

| Element | Technology | Driven by | Duration / easing | Reduced motion |
|---|---|---|---|---|
| Ambient data field (shell) | Canvas 2D, `visualizations/shared/ParticleField.ts` | one rAF in `PresentationShell`; alpha tweened by sections through `shell.setFieldAlpha` | drift: slow sin/cos, about 0.05–0.07 rad/s; alpha 1.2 s `sine.inOut` | no drift, no twinkle |
| Section change | Vue `<Transition>` (opacity + blur) | route change | 0.6 s out, 0.6 s in | cut |
| Film | MP4 in `CinematicVideoPlayer` | native video | 172 s | unchanged (captions burned in) |
| Pixels → data hand-off | Canvas 2D, `media/PixelDissolve.ts` | GSAP tweens progress p 0 → 1; `render(p)` is pure | 3.6 s; per-particle delay sweeps left to right; cubic in-out; slight arc | particles skipped; the field fades in |
| Hand-off → AI | timer | after the dissolve | +5.2 s (2.6 s reduced) | same |
| Task vignettes (AI step 1) | SVG + GSAP timelines (`gsap.context`) | loop while mounted | 2–4 s cycles | static final frames |
| AI ⊃ ML ⊃ DL fields | SVG; camera = animated `viewBox` | GSAP on `{x,y,w,h}` when `focus` changes | 1.4 s `power2.inOut`; field opacity 0.9 s CSS | instant viewBox |
| Rules vs learning: search | SVG | GSAP tweens `scan.i` across the backend's candidate thresholds | 3.2 s `power1.inOut` | jumps to the learned rule |
| Rules vs learning: test | SVG opacity | sub-stage `tested` | 0.8 s | instant |
| ML pipelines (sample tokens, rule card, learner scan, model card) | SVG; `sections/03-machine-learning/pipeline.ts` holds pure pose and timing functions | GSAP tweens `prog.p`; the scrubber sets it directly | 7–7.5 s per lane, 13 s side by side (training in the first half, inference in the second); tokens leave one after another with quadratic in-out easing | p = 1 immediately (end state); the scrubber still works |
| Learning journey (150 flowers, regions, splits, vault, confusion matrix) | SVG; `sections/04-learning-process/journey.ts` `poseAt(stage, p)` and `splitReveal`/`leafReveal` | GSAP tweens `prog.p` at speed 0.5 / 1 / 2; the scrubber sets it directly | 5–8 s per stage; staggered cubic in-out per flower; splits in learning order | p = 1 immediately; the scrubber still works |
| Section 8.2 modules | SVG, CSS TransitionGroup moves, Canvas 2D (Tesla); `visualizations/shared/useProgress.ts` | GSAP-driven p (recipe 9 s, gradient descent 9 s over the backend frames, produce 5 s); CSS 0.5–0.9 s for card and cell moves | p = 1, static Tesla frame, no card or cell transitions |
| Quiz reveal | CSS border and background | `checked` | 0.25 s | same |

Rules: GSAP only animates state (numbers); components render from state. Every timeline is killed or reverted on unmount.

## Theme and colour (Warm Lab, Nov 2026)
- Never write a colour literal in a presentation or visualization component. Use `rgb(var(--c-<token>))` / `rgba(var(--c-<token>), a)` in CSS
  and `:style` on SVG (presentation attributes such as `fill="…"` cannot read `var()`). Canvas code reads `cssRGB(canvas, '<token>')`.
- Tokens: ground, ground2, surface, surface2, text, strong, soft, dim, faint, data, data-soft, compute, feature, human, coral, ok, warn, ink,
  plus the per-act `accent`. Defined once in `presentation/theme.ts` for `warm` (default) and `light` (Lecture Hall Light, key L).
- Canvas blending: `lighter` on Warm Lab, `source-over` on Light (additive light vanishes on a pale ground).
- Contrast: every text token stays ≥ 4.5:1 on ground and surface in both themes (`e2e/theme.spec.ts`).
