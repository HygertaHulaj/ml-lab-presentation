// Generates WebVTT + SRT captions and a plain transcript from shared/story/narration.json.
// Run: node scripts/build_subtitles.mjs   (outputs to frontend/public/film/ and docs/06-the-scan/)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { cues } = JSON.parse(readFileSync(resolve(root, 'shared/story/narration.json'), 'utf8'))
const NAME = { narrator: '', noe: 'Noé', salizar: 'Dr. Salizar', note: 'Note' }
const ts = (s, sep) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`
}
const line = (c) => (NAME[c.speaker] ? `${NAME[c.speaker]}: ` : '') + c.text

const vtt = ['WEBVTT', '', ...cues.flatMap((c) => [c.id, `${ts(c.start, '.')} --> ${ts(c.end, '.')}`, line(c), ''])].join('\n')
const srt = cues.flatMap((c, i) => [String(i + 1), `${ts(c.start, ',')} --> ${ts(c.end, ',')}`, line(c), '']).join('\n')
const txt = cues.map((c) => `[${ts(c.start, '.').slice(3, 8)}] ${line(c)}`).join('\n')

const pub = resolve(root, 'frontend/public/film')
mkdirSync(pub, { recursive: true })
writeFileSync(resolve(pub, 'the-scan-that-changed-everything.en.vtt'), vtt)
writeFileSync(resolve(pub, 'the-scan-that-changed-everything.en.srt'), srt)
mkdirSync(resolve(root, 'docs/06-the-scan'), { recursive: true })
writeFileSync(resolve(root, 'docs/06-the-scan/transcript.txt'), txt + '\n')
console.log(`wrote ${cues.length} cues → frontend/public/film/*.vtt|.srt and docs/06-the-scan/transcript.txt`)
