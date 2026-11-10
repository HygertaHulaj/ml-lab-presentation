# Storyboard and animation strategy

Times come from `shared/story/storyboard.json`; narration comes from `narration.json`. "Strategy" says how each beat is actually built.
Key frames for each beat are in `keyframes/`.

| # | Scene · time | Shot | Picture | Sound / words | Strategy (implemented) |
|---|---|---|---|---|---|
| 1 | The Hospital Never Sleeps · 0:00–0:15 | 1A aerial descent 0–6 | Rain over the city; the hospital glows; the title card | rain, pad | `sets/exterior.ts`: GPU rain (LineSegments with a time-uniform shader), instanced lit facade panes with an office texture, mirrored panes under a translucent wet street, instanced city blocks, beacons |
| | | 1B push-in 6–12.5 | Toward the third-floor window; the lab is visible inside | "Every day, hospitals produce thousands of medical images." | The lab is real geometry behind real glass, so the shot needs no cut |
| | | 1C through-window 12.5–15 | The camera passes through the glass and settles in the lab | "Each one holds information that could change someone's life." | Fog, rain and bloom crossfade from exterior to lab |
| 2 | Meet Noé · 0:15–0:35 | 2A tracking 15–24 | Noé walks in with his tablet, glancing at seated radiologists | "This is Noé…" | `track()` keyframes; walk cycle from distance travelled; gaze targets |
| | | 2B focus shift 24–30 | Over the shoulder toward the streaming scan wall | ui-stream | Thumbnail atlas of synthetic MR/XR/CT, scrolled by `t`, with a scanning line |
| | | 2C push-in 30–35 | Close on Noé: curiosity becomes concern | Noé (thinking): "How does anyone review all of this carefully?" | Expression blend curious → concerned; readTablet pose |
| 3 | The Question · 0:35–0:50 | 3A two-shot orbit | Noé walks to Dr. Salizar at the PACS station and asks | Noé: "…how do you make sure nothing important is missed?" | Lip flap while talking; she turns and listens |
| | | 3B pan | She smiles and gestures; the workstation wakes | Salizar: "That's exactly why we're developing something new." | `gestureL` pose; the screen's brightness ramps; a cyan light spills onto the room |
| | | 3C screen dive | Push into the RadiologyML boot screen | dive whoosh | FOV widens 50 → 70; a flash hands over to the same boot screen in the digital hall |
| 4 | Introducing RadiologyML · 0:50–1:10 | 4A reveal | Holographic brain MRI (36 synthetic slices), data streams flowing in | "RadiologyML is an artificial intelligence system…" | Additive slices with opacity scaled by camera distance; particles on 9 Catmull-Rom streams |
| | | 4B arc track | Six panels appear: input → preprocessing → pattern detection → prediction → model score 0.82 → human review | "…learns patterns from examples that experts have already reviewed." Note: "fictional… not a diagnosis" | Panels are canvas textures with real content (a histogram of the image, real feature maps); timed by the sfx cues |
| 5 | Enter the Machine · 1:10–1:35 | 5A dive into slice | The slice lies flat as 64×64 pixel columns that rise | "To a machine, an image begins as numbers." | Column height = real intensity of the synthetic slice (instanced, 4,096 boxes) |
| | | 5B low glide | An 8×8 patch lifts; its actual values float above | "During training…" | Values printed from the same array |
| | | 5C fly-over | Four feature maps grow (edges, spots, blobs) | | Real convolution → ReLU → 2×2 max-pool (`mri.featureMap`, unit-tested) |
| | | 5D pull-out | Pulses run through a small network to an output; prediction vs. expert label, then a match | "…may become better…" | Shader-pulsed edges; panels say *illustrative network; other models differ*; the loss explained |
| 6 | Learning from Mistakes · 1:35–1:55 | 6A over-shoulder | POSSIBLE FINDING (muted red) on a vessel-like artifact | "Machine learning models can make mistakes." | A synthetic artifact streak; Dr. Salizar leans in, then touches the screen |
| | | 6B rise | Relabelled "REVIEWED · NOT A FINDING"; the loop hologram: prediction → error → expert correction → reviewed dataset → offline retraining → validation | "After careful validation…" | Six pre-drawn highlight states; the text states the deployed model does not change itself |
| 7 | A Second Pair of Eyes · 1:55–2:15 | 7A push-in | New scan: FLAGGED FOR REVIEW (amber), model score 0.88 | "One day, the system flags an unusual pattern." | |
| | | 7B follow | Dr. Haddad walks in; they study it; he nods | "…a specialist, who confirms…" | SPECIALIST: URGENT; the decision is credited to the medical team |
| | | 7C pull-back | The whole team; hologram: model flags → radiologist reviews → specialist confirms → care team acts | "The technology hasn't replaced the doctor…" | |
| 8 | What Did the Machine Really Learn? · 2:15–2:35 | 8A close-up | Noé, thoughtful; the room begins to dissolve | "But this raises a bigger question." | Lab materials fade, fog shifts |
| | | 8B rise and orbit | 150 real Iris flowers float, group by their measurements, link to class means; nearest-class-mean regions appear | "How can a computer learn from examples?…" | `datafield.ts`, real data; the region is a real nearest-mean classifier |
| 9 | The Machine Learning Reveal · 2:35–2:52 | 9A pull-back | 3,200 points spell MACHINE LEARNING; subtitle; four previews (classification, regression, clustering, evaluation) | assemble | The previews compute OLS, nearest neighbours and a confusion matrix on Iris |
| | | 9B settle | The letters fall apart; the Iris points settle *unlabelled* into sepal length × width → INSIDE MACHINE LEARNING | "Welcome to Machine Learning." | This is the same data and features the K-Means lab opens with; the Clustering path starts it |
