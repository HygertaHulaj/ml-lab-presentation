/** Screen and hologram canvases used in the lab (all images synthetic; all scores fictional and labelled as such). */
import { sliceCanvas, font, holoPanel, makeCanvas, rrect, wrapText } from './textures'
import { STORY_IMAGES } from './mri'

export type ScanOverlay = 'none' | 'fp' | 'fpCorrected' | 'flag' | 'confirmed'

const C = { cyan: '#38d6f0', amber: '#f2b54a', green: '#5fd39a', red: '#e06666', text: '#e8eef8', dim: '#9fb0c8' }

/** PACS-style viewer: image on the left, study info on the right, optional model overlay. */
export function scanScreen(image: keyof typeof STORY_IMAGES, overlay: ScanOverlay): HTMLCanvasElement {
  const W = 1024, H = 640
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')!
  g.fillStyle = '#060a12'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#0d1524'
  g.fillRect(0, 0, W, 44)
  g.font = font('body', 20)
  g.fillStyle = C.dim
  g.fillText('PACS Viewer  ·  Study ' + { hero: 'MR-4471', falsePositive: 'MR-5120', flagged: 'MR-5893' }[image] + '  ·  synthetic image', 18, 29)
  const S = 560, x0 = 24, y0 = 62
  g.drawImage(sliceCanvas({ size: 256, ...STORY_IMAGES[image] }), x0, y0, S, S)
  g.strokeStyle = 'rgba(56,214,240,0.25)'
  g.strokeRect(x0 - 0.5, y0 - 0.5, S + 1, S + 1)
  const px = (x: number) => x0 + ((x + 1) / 2) * S
  const py = (y: number) => y0 + (1 - (y + 1) / 2) * S
  const box = (cx: number, cy: number, r: number, color: string, label: string, dashed = false) => {
    g.save()
    g.strokeStyle = color
    g.lineWidth = 4
    if (dashed) g.setLineDash([12, 8])
    g.strokeRect(px(cx - r), py(cy + r), (r * S), (r * S))
    g.restore()
    g.font = font('display', 22)
    const tw = g.measureText(label).width + 20
    g.fillStyle = color
    g.fillRect(px(cx - r), py(cy + r) - 34, tw, 30)
    g.fillStyle = '#04070e'
    g.fillText(label, px(cx - r) + 10, py(cy + r) - 12)
  }
  const info = (lines: [string, string][]) => {
    let y = 100
    for (const [k, v] of lines) {
      g.font = font('body', 18)
      g.fillStyle = C.dim
      g.fillText(k, 616, y)
      g.font = font('display', 24)
      g.fillStyle = C.text
      y = wrapText(g, v, 616, y + 30, 380, 30) + 48
    }
  }
  if (overlay === 'none') info([['Modality', 'MRI · axial T1-like'], ['Queue', '142 studies waiting'], ['Status', 'Awaiting radiologist review']])
  if (overlay === 'fp' || overlay === 'fpCorrected') {
    const a = STORY_IMAGES.falsePositive.artifact
    if (overlay === 'fp') {
      box(a.x, a.y, 0.17, C.red, 'POSSIBLE FINDING')
      info([['RadiologyML (fictional)', 'Model score 0.71'], ['Meaning', 'A pattern resembling past findings. Not a diagnosis.'], ['Status', 'Needs radiologist review']])
    } else {
      box(a.x, a.y, 0.17, C.green, 'REVIEWED · NOT A FINDING', true)
      info([['Expert correction', 'Normal vessel. No abnormality.'], ['Label', 'Corrected by Dr. Salizar'], ['Next', 'Queued for the reviewed dataset. Used only in a later, validated model version.']])
    }
  }
  if (overlay === 'flag' || overlay === 'confirmed') {
    const l = STORY_IMAGES.flagged.lesion
    box(l.x, l.y, 0.16, C.amber, overlay === 'flag' ? 'FLAGGED FOR REVIEW' : 'SPECIALIST: URGENT')
    info(overlay === 'flag'
      ? [['RadiologyML (fictional)', 'Model score 0.88'], ['Meaning', 'Unusual pattern. Prioritised for human review.'], ['Status', 'Not a diagnosis']]
      : [['Specialist review', 'Finding confirmed by a clinician.'], ['Next', 'Care team informed. Further clinical tests.'], ['Decision', 'Made by the medical team']])
  }
  return c
}

/** Research workstation: RadiologyML boot screen. */
export function workstationScreen(): HTMLCanvasElement {
  const W = 1024, H = 600
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')!
  const bg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7)
  bg.addColorStop(0, '#0c2040')
  bg.addColorStop(1, '#03060d')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // network glyph
  const layers = [4, 6, 6, 2]
  const pts: [number, number][][] = layers.map((n, li) => Array.from({ length: n }, (_, i) => [300 + li * 140, 190 + (i - (n - 1) / 2) * 44] as [number, number]))
  g.strokeStyle = 'rgba(56,214,240,0.35)'
  g.lineWidth = 1.5
  for (let l = 0; l < pts.length - 1; l++) for (const a of pts[l]) for (const b of pts[l + 1]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke() }
  for (const layer of pts) for (const p of layer) { g.fillStyle = '#8be9ff'; g.beginPath(); g.arc(p[0], p[1], 8, 0, Math.PI * 2); g.fill() }
  g.textAlign = 'center'
  g.font = font('display', 72)
  g.fillStyle = '#e8eef8'
  g.fillText('RadiologyML', W / 2, 420)
  g.font = font('body', 24)
  g.fillStyle = C.cyan
  g.fillText('RESEARCH PROTOTYPE  ·  FICTIONAL SYSTEM  ·  NOT FOR CLINICAL USE', W / 2, 466)
  rrect(g, W / 2 - 220, 510, 440, 10, 5)
  g.fillStyle = 'rgba(255,255,255,0.1)'
  g.fill()
  rrect(g, W / 2 - 220, 510, 300, 10, 5)
  g.fillStyle = C.cyan
  g.fill()
  return c
}

/** The controlled improvement loop (scene 6). `active` = index of the highlighted stage (-1 none). */
export function loopHologram(stages: string[], active: number): HTMLCanvasElement {
  return holoPanel(1280, 720, 'How a correction improves a future model', C.amber, (g, w) => {
    const cx = w / 2, cy = 400, R = 230
    const n = stages.length
    const pos = stages.map((_, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2
      return [cx + Math.cos(a) * R * 1.55, cy + Math.sin(a) * R] as [number, number]
    })
    g.lineWidth = 3
    for (let i = 0; i < n; i++) {
      const a = pos[i], b = pos[(i + 1) % n]
      g.strokeStyle = i < active ? C.green : 'rgba(159,176,200,0.35)'
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke()
    }
    stages.forEach((s, i) => {
      const [x, y] = pos[i]
      const on = i === active, done = i < active
      g.font = font('display', 26)
      const tw = g.measureText(s).width + 36
      rrect(g, x - tw / 2, y - 26, tw, 52, 26)
      g.fillStyle = on ? C.amber : done ? 'rgba(95,211,154,0.25)' : 'rgba(10,20,40,0.9)'
      g.fill()
      g.strokeStyle = on ? C.amber : done ? C.green : 'rgba(159,176,200,0.5)'
      g.stroke()
      g.fillStyle = on ? '#04070e' : C.text
      g.textAlign = 'center'
      g.fillText(s, x, y + 9)
      g.textAlign = 'left'
    })
    g.font = font('body', 22)
    g.fillStyle = C.dim
    g.textAlign = 'center'
    g.fillText('Corrections are collected, reviewed and tested offline.', cx, cy - 10)
    g.fillText('The deployed model does not change itself.', cx, cy + 22)
    if (active >= stages.length - 1) {
      g.fillStyle = C.green
      g.font = font('display', 24)
      g.fillText('A new version is released only if validation shows it is better', cx, cy + 66)
    }
    g.textAlign = 'left'
  })
}

/** The clinical path (scene 7): who decides what. */
export function clinicalPathHologram(active: number): HTMLCanvasElement {
  const steps = ['Model flags pattern', 'Radiologist reviews', 'Specialist confirms', 'Care team acts']
  return holoPanel(1280, 520, 'People make the decisions', C.amber, (g, w) => {
    const y = 290
    steps.forEach((s, i) => {
      const x = 170 + i * ((w - 340) / 3)
      const on = i <= active
      g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2)
      g.fillStyle = on ? (i === 0 ? C.cyan : C.amber) : 'rgba(10,20,40,0.9)'
      g.fill()
      g.strokeStyle = on ? C.text : 'rgba(159,176,200,0.5)'
      g.lineWidth = 3
      g.stroke()
      g.fillStyle = '#04070e'
      g.font = font('display', 30)
      g.textAlign = 'center'
      g.fillText(String(i + 1), x, y + 11)
      g.fillStyle = on ? C.text : C.dim
      g.font = font('display', 26)
      g.fillText(s, x, y + 90)
      if (i < steps.length - 1) {
        g.strokeStyle = i < active ? C.amber : 'rgba(159,176,200,0.35)'
        g.beginPath(); g.moveTo(x + 46, y); g.lineTo(x + (w - 340) / 3 - 46, y); g.stroke()
      }
    })
    g.textAlign = 'center'
    g.font = font('body', 22)
    g.fillStyle = C.dim
    g.fillText('The model prioritises images for review. Clinicians diagnose and decide.', w / 2, 460)
    g.textAlign = 'left'
  })
}
