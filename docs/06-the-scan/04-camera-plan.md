# Camera plan

Implementation: `frontend/src/experiences/cinematic/world/CameraDirector.ts` and `shots.ts`.

## Grammar
- **One continuous space per act.** Act 1 (city → lab) has no cuts at all; the camera flies through real glass. Acts 2 and 3 enter and leave the machine through declared full-screen transitions only: the screen dive at 49 s, flash cuts at 69.3 s and 94.4 s. A unit test fails if a `cut: true` shot is not covered by a transition.
- **Every shot is two splines** (position and look-at, centripetal Catmull-Rom) plus an easing (`sine` for flights, `out` for settles) and a lens range.
- **Hand-offs.** For the first `blend` seconds of a shot, position is lerped and orientation slerped (quaternions) from the previous shot's last pose. A test checks that no non-cut boundary jumps by more than 0.5 m or 0.2 rad.
- **Move types used.** Aerial descent, push-in, through-window, tracking, over-the-shoulder rack, close push, orbit, pan-to-gesture, screen dive, reveal orbit, arc track, top-down dive, low glide, fly-over, pull-out, rise, settle.
- **Comprehension first.** The camera slows on every panel, value or face that the narration is talking about. Over-the-shoulder shots sit about 0.9 m to the side and above the head, so the subject is never blocked.
- **Reduced motion.** Each shot holds one composed frame (`hold`, default 60 %). Particles step instead of flying, and flashes are capped at 60 %.

## Shot list
Ids and boundaries are identical to `storyboard.json` (enforced by `tests/film.spec.ts`): 1A 1B 1C · 2A 2B 2C · 3A 3B 3C · 4A 4B · 5A 5B 5C 5D · 6A 6B · 7A 7B 7C · 8A 8B · 9A 9B.
Lens ranges run from 34–38° (aerial) to 70° (dive peak). Vertical 9:16 renders widen the FOV by 1.5× automatically.
