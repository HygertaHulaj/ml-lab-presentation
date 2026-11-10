/**
 * Encode a drawing the way the handwritten-digits dataset was made (UCI "optdigits"): the ink is cropped, scaled to
 * fit and centred in a 32×32 bitmap, and each 4×4 block is counted (0–16), giving an 8×8 image of 64 values.
 * This is input encoding only; the prediction itself is made by the backend's network.
 */
export function encodeDrawing(ink: (x: number, y: number) => boolean, w: number, h: number, fit = 28): number[] {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const out = new Array<number>(64).fill(0)
  if (x1 < 0) return out
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  const s = fit / Math.max(bw, bh)
  const ox = (32 - bw * s) / 2, oy = (32 - bh * s) / 2
  const bmp = new Uint8Array(32 * 32)
  for (let by = 0; by < 32; by++) for (let bx = 0; bx < 32; bx++) {
    // sample the source at the centre of this bitmap pixel
    const sx = Math.floor(x0 + (bx + 0.5 - ox) / s), sy = Math.floor(y0 + (by + 0.5 - oy) / s)
    if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1 && ink(sx, sy)) bmp[by * 32 + bx] = 1
  }
  for (let k = 0; k < 64; k++) {
    const cx = (k % 8) * 4, cy = Math.floor(k / 8) * 4
    let n = 0
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) n += bmp[(cy + dy) * 32 + cx + dx]
    out[k] = n
  }
  return out
}
