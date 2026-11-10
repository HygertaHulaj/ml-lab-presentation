# The Scan That Changed Everything — production bible

*How Machines Learn to See What We Cannot.* A 2:52 cinematic introduction to machine learning that hands over, without a page break, to the ML Learning Lab.

| Document | Contents |
|---|---|
| this file | reference analysis, creative direction, visual system, audio and subtitle spec, architecture, run instructions, status |
| [02-storyboard.md](02-storyboard.md) | shot-by-shot storyboard and the animation strategy for each scene |
| [04-camera-plan.md](04-camera-plan.md) | camera grammar and the shot list |
| [05-characters.md](05-characters.md) | character design, animation controllers, Blender/GLB production workflow |
| [transcript.txt](transcript.txt) | full narrated script with timestamps (generated) |
| [keyframes/](keyframes/) | 18 frames at 1920×1080 captured by Playwright, one per key story beat |

---

## A. Reference video analysis (WhatsApp Video 2026-11-04, 58 s, 720×1280, 30 fps)

The reference explains a computer booting. I studied 24 evenly spaced frames.

| Element | What it does | Reused as a principle (not copied) |
|---|---|---|
| Character | Minimal stick figure: big white sphere head, round glasses, blue tie. Reads instantly at any scale. | A strong, simple silhouette. We built a *distinct* cast instead: Noé (curly hair, teal scrubs, tablet, amber badge), Dr. Salizar (white coat, bun, stethoscope), Dr. Haddad (navy coat, grey hair, glasses). |
| Scale play | The tiny character walks on a motherboard as if it were a city. | Noé standing inside the data field (scene 8). The camera dives through a monitor into a hall-sized MRI volume (scenes 3–4). |
| Colour as meaning | Orange traces = power, blue = logic/CPU, violet = memory/RAM. | Cyan = data and signal, electric blue = computation, violet = learned features, amber = human attention and insight, green = validated, muted red = warning (`visual-tokens.json`). |
| Camera | Continuous dives (case → board → chip → "inside" the CPU), push-ins and top-down reveals. Almost no hard cuts. | A spline camera with quaternion hand-offs. The only cuts sit behind full-screen flashes. The window fly-through uses real geometry. |
| Explanation UI | Holographic checklists ("HARDWARE CHECK") with ticks appearing one by one; glowing labels. | Six pipeline panels appear one per narration beat. The correction loop and clinical path holograms highlight one stage at a time. |
| Captions | Word-by-word highlighted captions in the lower third. | Karaoke captions that are a pure function of `t`, with keywords in cyan and speaker labels for dialogue. |
| Pacing | One idea per 2–4 s; narration leads, visuals confirm. | Scenes of 15–25 s; at most about 3 words per second (validated). |
| Ending | Back in the real-world lab, then a logo card. | The particles become the lab's real dataset, then "INSIDE MACHINE LEARNING". |

Weaknesses I avoided: AI-generated text glitches ("CANISLAMT", "PROFESSOR SYSEMG"), a character that does not interact with its world, and colour-flashing captions.

## B. Creative direction

- **Logline.** A pre-med student asks how anyone can review so many scans. The answer takes us inside a learning machine, through its mistakes and its usefulness, and out into machine learning itself.
- **Tone.** Night-shift calm, then curiosity, then wonder in the machine, then humility (mistakes), then quiet relief (a second pair of eyes), then an open question, then the reveal.
- **Emotional arc.** Scale (city) → person (Noé) → question → system → inside → error → value → abstraction → invitation.
- **Rules.** Show before telling. Real computations wherever numbers appear. Humans decide. No slideshow: every scene is one continuous 3D space.
- **Audience.** CS, data science and ML students and professors. Accurate terms, but plain language in scenes 1–3.

## C. Visual design system (`shared/story/visual-tokens.json`)

- **Palette.** Deep navy `#0b1630`, near-black `#04070e`, cyan `#38d6f0`, electric `#3b7bff`, violet `#8b7cf6`. Accents: amber `#f2b54a`, green `#5fd39a`, muted red `#e06666`.
- **Type.** Space Grotesk (display and labels, tracked uppercase), Inter (captions and body), JetBrains Mono (numbers). Captions are 30 px at 1080p (40 px in presenter mode); the projector minimum is 22 px.
- **Light.** Fresnel rim light on all characters (`materials.ts`), soft emissive screens, monitors as light sources, ACES tone mapping, controlled bloom per set, vignette, fine grain and subtle chromatic aberration (`FilmWorld` grade pass).
- **Motion.** `easeInOutSine` for flights and `easeOutCubic` for settles. Shots are at least 2.5 s. Hand-off blends are 0.6–1.4 s.

## D. Audio and subtitles

| Layer | Implementation | Notes |
|---|---|---|
| Voice-over and dialogue | Script in `narration.json` (speaker, timing, delivery notes in `voice`). In the app, optional browser speech (V), with a different pitch per speaker. | For a production VO, record to the cue timings and add the track through `<Audio>` in Remotion (`audioSrc` prop). |
| Music | `AmbientScore` (Web Audio): an 8-oscillator pad whose chord changes per scene and whose level and brightness follow `audio.music` (0.25 → 0.85, building to the reveal). | Synthesised at runtime, so there is nothing to license. Replace it with a licensed score by adding an audio file. |
| Ambience | Rain (exterior), room tone (lab), "data air" (digital), from filtered noise. | Ducked automatically by set. |
| Interface SFX | Storyboard `audio.sfx` cues (whoosh, boot, panel, warn, correct, flag, assemble, resolve…), fired only while playing forward. | Scrubbing never triggers them. |
| Captions | Always on by default. Speaker labels; `note` cues in amber italics. `scripts/build_subtitles.mjs` → `frontend/public/film/*.vtt` and `*.srt`, and `transcript.txt`. | The MP4 player loads the VTT track. |
| Audio-off mode | M mutes. Every fact is carried by captions and visuals; nothing requires sound. | |

## E. Architecture

```
shared/story/                    SINGLE SOURCE OF TRUTH (read by Vue and by Remotion)
  storyboard.json               scenes, shots, transitions, audio cues, pipeline/loop/stage labels
  narration.json                timed narration + dialogue + notes
  visual-tokens.json            colours, type, motion, bloom per set
  iris.json                     the real Iris data (scripts/export_iris.py, from scikit-learn)
frontend/src/experiences/cinematic/
  story.ts                      typed access + sceneAt / cueAt / transitionOverlayAt / validateStory
  concepts.ts                   OLS, nearest neighbour, confusion counts for the scene-9 previews (real, on Iris)
  audio/AmbientScore.ts         procedural score, ambience, SFX
  components/ConceptPreview.vue scene-9 mini visualisations
  world/                        framework-agnostic Three.js film (no Vue imports)
    FilmWorld.ts                renderer, EffectComposer (RenderPass → UnrealBloom → grade → Output), per-set fog/bloom, dispose
    CameraDirector.ts           spline shots, easing, quaternion slerp hand-offs, reduced-motion holds
    shots.ts                    world-space camera plan (ids match storyboard; tested)
    characters/                 Character rig + pose/expression library + cast
    sets/                       exterior · lab (+choreography) · digital + journey · datafield
    mri.ts                      synthetic MRI slices, real conv → ReLU → max-pool, downsample
    textures.ts, screens.ts     canvas textures: scans, PACS UI, holograms
frontend/src/views/FilmView.vue Mode B player (+ Mode A MP4 when present), captions, HUDs, hub, shortcuts
video/remotion/                 React/Remotion workspace; ScanFilm renders the SAME FilmWorld at t = frame/fps
backend/                        unchanged: FastAPI K-Means trace engine (POST /api/v1/simulations/kmeans)
```

Key decisions:
1. **One world, two outputs.** `FilmWorld.render(t)` is a pure function of time. The interactive player drives `t` with the existing GSAP `LessonTimelineController`; Remotion drives it with `useCurrentFrame()`. The pre-rendered MP4 and the live story therefore show the same frames.
2. **Vue stays the app.** React exists only inside `video/remotion`.
3. **Plain Three.js for the film, TresJS kept for lessons.** The film needs a custom post-processing chain and must run in Remotion without Vue. The K-Means lesson keeps using TresJS.
4. **Backend computes, frontend renders** (CLAUDE.md). The film never runs K-Means. The last scene places the 150 real Iris points as an *unlabelled* sepal-length × sepal-width scatter, which is exactly the dataset and features the K-Means lab starts with. The "Clustering" path opens `/lessons/kmeans-iris?from=film`, where every iteration comes from FastAPI.
5. **Disposal.** Every set disposes its geometry, materials and textures. FilmView kills the rAF loop, timeline, audio context and speech, and restores GSAP lag smoothing on unmount.

## F. Skills and dependencies

- Skills used: `frontend-design` (visual direction), `run`/browser-pane verification, Playwright. Project skills added: `.claude/skills/{cinematic-storytelling, threejs-scene-direction, medical-ai-visualization, narrative-quality-assurance}`. These sit alongside the existing `cinematic-animation` and `algorithm-visualization`, which already cover ML-algorithm visualisation and animation performance, so I did not duplicate those two.
- Remotion skills (remotion-best-practices and similar) were not installed in this environment. The workspace follows Remotion 4 conventions (`registerRoot`, `Composition`, `delayRender` per frame, `remotion.config.ts`).
- New dependencies: in `video/remotion` only: `remotion`, `@remotion/cli`, `react`, `react-dom`, TypeScript. The frontend already had `three` and `gsap`. Web fonts come from Google Fonts, with a system fallback when offline.

## G. Production and asset plan (honest status)

| Asset | Status | Production path |
|---|---|---|
| Environments (city, hospital, lab, digital hall, journey, data field) | **Implemented**, procedural | Could be swapped for Blender-modelled GLBs (lab props, hospital facade) through `GLTFLoader` in the same set modules |
| Characters | **Functional animated prototype**: procedural rig, 13 joints, walk cycle, 18 poses, 7 expressions, blink, gaze, lip flap | Pixar-level faces and cloth need a Blender rig, so code alone is not enough. See [05-characters.md](05-characters.md) |
| Medical images | **Synthetic** (procedural); no patient data | Licensed or de-identified sets would need a data-use agreement; not needed for this film |
| Narration VO | Script and timings **done**; browser TTS as a placeholder | Record a human VO to `narration.json` timings, export WAV, pass to Remotion `audioSrc` |
| Music | Procedural score **done** | Optionally commission or license a score to `audio.music` intensity |
| Rendered MP4 | Remotion composition **working** (verified stills; full render: see the run instructions) | `npm run render` (1080p) / `render:vertical` (9:16) |

## H. Run it

```bash
# backend (K-Means engine for the lab)
cd backend && ..\.venv\Scripts\uvicorn app.main:app --port 8000
# frontend
cd frontend && npm run dev            # http://localhost:5173/film
```
URL options: `?t=62` (start at a time), `?autoplay=1`, `?quality=low` (no bloom, DPR 1).
Keys: SPACE play/pause · ← → scenes · C captions · M mute · V voice · S skip to the lab · R restart · F full screen · P presenter.

Rendered film (Mode A):
```bash
cd video/remotion && npm install
npm run studio                         # preview in Remotion Studio
npm run render                         # → out/the-scan-that-changed-everything.mp4 (1920×1080, 30 fps)
npm run render:vertical                # 1080×1920
copy out\the-scan-that-changed-everything.mp4 ..\..\frontend\public\film\
node ../../scripts/build_subtitles.mjs # VTT/SRT/transcript (already generated)
```
When the MP4 is in `frontend/public/film/`, the start screen offers "Rendered film (MP4)" with native controls and captions.
Rendering uses headless Chrome with ANGLE (GPU). On a machine without a GPU, add `--gl=swangle`; it is much slower.

Tests:
```bash
cd frontend && npx vitest run && npx vue-tsc --noEmit && npx playwright test e2e/film.spec.ts
cd backend && ..\.venv\Scripts\python -m pytest -q
```
