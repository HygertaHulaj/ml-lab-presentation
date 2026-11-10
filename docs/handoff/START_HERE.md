# Start here: Lecture 8, Machine Learning (DS4A Ch. 8 · Shah Ch. 8)

**One link:** http://localhost:8080/presentation (Docker) — or http://localhost:5173/presentation (local development).
Press **→** to advance. Everything else (activities, 3D lessons) opens inside the presentation and returns with **Esc**.

## 1. Start the application (Windows, no internet needed after setup)

Option A, Docker (recommended on the classroom PC):
```powershell
.\scripts\start-docker.ps1      # builds and starts the database, the API (:8000) and the app (:8080)
```
Then open http://localhost:8080/presentation. Stop with `.\scripts\stop-docker.ps1`.

Option B, local (Python 3.12 + Node 20 installed):
```powershell
.\scripts\setup.ps1             # once: virtual environment, npm packages, database
.\scripts\start-backend.ps1     # API on :8000
.\scripts\start-frontend.ps1    # app on :5173
```
If Docker is not available: `.\scripts\start-offline-sqlite.ps1` runs the same API on a local SQLite file.
Run only one backend at a time (both use port 8000).

Every dataset, the film (`frontend/public/film/the-scan-that-changed-everything.mp4`, with English captions) and all
fonts are bundled. No network access is used during the talk.

## 2. Ten-minute check before class
1. Open the link on the projector; press **F** for full screen. The title slide appears with the film poster.
2. Check the room: press **L** to switch between Warm Lab (dark) and Lecture Hall Light (bright rooms). The choice is remembered.
3. Jump to `…/presentation/section-8-4?step=4`: the confusion matrix must show **22 / 11 / 11 / 37**. If it shows
   "The backend is not reachable", the API is not running (step 1).
4. Jump to `…/presentation/worked-example-movies?step=5` and press → a few times: the line and the cost map move. If the
   3D lessons are needed, open one from "Practise here" at the end of the worked example; Esc returns.
5. Sound: the film has its own audio; **M** mutes the presentation. Captions are always on.
6. Reduced motion (for motion-sensitive viewers or a slow PC): the ♿ button in the controls.

## 3. If something fails during the talk
- **No WebGL / a very slow PC:** the 2D chapter works without WebGL; only the 3D lessons and the film's live version need it.
  The film is an MP4. As a last resort, `docs/handoff/fallback/Lecture8-fallback.pdf` has every core step as a 1080p frame,
  in talk order (a backup, not a substitute for the interactive version).
- **The API stops:** each screen says so; restart step 1 and reload. Nothing is lost (positions are kept per viewer).
- **Lost your place:** **I** opens the section index (with the planned minutes); every step has its own address.

## 4. What is in the handoff
| File | For |
|---|---|
| `Lecture8-speaker-script.pdf` | the printable speaker script: what to say per section, the numbers, the careful points, likely questions (source: `speaker-script.html`) |
| `PRESENTER_NOTES.md` | the 80-minute core route, section by section: question, key points, steps, practice, transition |
| `ABSTRACT.md` | a short abstract and the learning objectives |
| `SOURCES_AND_ERRATA.md` | the chapter and source map, references, textbook errata, dataset origins and licences |
| `STUDENT_EXPLORATION.md` | where students can explore after the lecture |
| `fallback/` | key frames and the fallback PDF (`make_fallback_pdf.py` rebuilds it) |

Status: functionally verified (see `docs/IMPLEMENTATION_PROGRESS.md`). **Not yet rehearsed** with the presenter on the real
projector; the 80 minutes are a plan. Nothing has been sent to anyone.
