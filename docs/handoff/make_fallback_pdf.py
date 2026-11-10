"""Builds docs/handoff/fallback/Lecture8-fallback.pdf from the captured 1920×1080 frames (in talk order).

Capture the frames first (app running):
    cd frontend; $env:FALLBACK_DIR="../docs/handoff/fallback"; npx playwright test e2e/fallback.capture.spec.ts --workers=1
Then:  python docs/handoff/make_fallback_pdf.py
"""
from pathlib import Path

from PIL import Image

here = Path(__file__).resolve().parent / 'fallback'
frames = sorted(here.glob('[0-9][0-9][0-9]-*.png'))
if not frames:
    raise SystemExit(f'no frames in {here}; capture them first (see the docstring)')
pages = [Image.open(f).convert('RGB') for f in frames]
out = here / 'Lecture8-fallback.pdf'
pages[0].save(out, save_all=True, append_images=pages[1:], resolution=144)
print(f'{out} · {len(pages)} pages')
