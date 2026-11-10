# Characters — design, animation controllers, production workflow

## Cast (`world/characters/Character.ts → CAST`)
| Character | Silhouette and palette | Personality in motion |
|---|---|---|
| **Noé** (pre-med student) | Curly dark hair, teal scrubs, amber ID badge, white sneakers, tablet with a live scan | Walks briskly, glances around, reads his tablet; curious → concerned; asks with open hands |
| **Dr. Salizar** (radiologist) | Taller; white lab coat over navy; hair in a bun; stethoscope | Still and focused at the monitor (hand to chin); warm smile; decisive gestures; touches the screen to correct |
| **Dr. Haddad** (specialist) | Navy long coat, grey hair, glasses | Arrives with purpose, leans in, nods (confirmation), arms crossed in concern |
| Radiologists A/B | Seated background figures | Typing loops; heads turn toward the team in scene 7 |

All characters share proportions (stylised: about 1.9 heads high, large head for readable faces) and one rim-lit PBR material system.

## Animation controllers (implemented)
- **Rig.** 13 joints (hips, spine, chest, neck, head, shoulders and elbows, hips and knees). Capsule limbs are parented to the joints.
- **Poses (18).** idle, holdTablet, readTablet, point, pointL, gesture, gestureL, typing, explain, chinThink, listen, lookAround, lean, touchScreen, sit, surprisedBody, armsCrossed. They blend by weight with soft-edged time windows.
- **Locomotion.** A walk cycle whose phase comes from the distance travelled (no foot sliding at different speeds), with hip sway and counter-rotating chest.
- **Face.** Expressions neutral, smile, curious, concerned, surprised, focused and thoughtful, built from brow height, angle and asymmetry, mouth curve (smile ↔ frown arc), mouth opening and eye openness. Deterministic blinking. Pupils and head/neck follow a world-space gaze target. Syllable-like lip motion while a dialogue cue plays.
- **Choreography.** In `sets/lab.ts`, written in absolute film seconds (`track()` for paths and facing, `blend()` for pose and expression windows). This keeps scrubbing exact.

Mapping to the brief: Noé idle, walking, looking around, surprised, curious, concerned, smiling, pointing and listening are all present. Dr. Salizar reviewing a scan, explaining, pointing/gesturing, selecting and correcting a finding (touchScreen), and consulting a specialist are all present.

## What code cannot do here, and the production workflow
The procedural rig is a functional prototype. A Pixar-quality performance needs:
1. **Design.** Turnarounds and expression sheets from these silhouettes and palettes.
2. **Model** in Blender with clean quad topology and separate eyes, teeth and tongue. Keep it at 15–30 k tris per hero for real-time use.
3. **Rig.** Rigify body; a face rig with about 20 ARKit-style shape keys (browInnerUp, mouthSmile, jawOpen, eyeBlink…). Name the bones like `poses.ts` joints so the controllers map one to one.
4. **Animate** clips: walk, idle, talk, gesture, touch-screen, nod, sit-type. Use NLA strips; you can block with mocap, then polish by hand.
5. **Export** to glTF 2.0 (`.glb`) with animations, shape keys and Draco compression, into `frontend/public/film/characters/`.
6. **Integrate.** Replace `new Character(spec)` with a GLB wrapper that uses `THREE.AnimationMixer`, calling `mixer.setTime(t - clipStart)` so animation stays a pure function of film time. Drive shape keys from the same expression weights. Keep `setState()` as the interface.
7. **Optional.** Pre-render hero close-ups (2C, 3A, 8A) in Blender Cycles or EEVEE as image sequences and composite them in Remotion with `<OffthreadVideo>`.
