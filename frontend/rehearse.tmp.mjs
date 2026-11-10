import { chromium } from 'playwright'
const SECTIONS = { 'intro':3,'ai':8,'machine-learning':6,'how-learning-works':8,'section-8-2':11,'section-8-3':14,'worked-example-movies':8,'section-8-4':15,'section-8-5':12,'research':3,'section-8-6':8,'ethics':10,'conclusion':5 }
for (let i = 0; i < 30; i++) { try { await fetch('http://localhost:4173/'); break } catch { await new Promise(r => setTimeout(r, 1000)) } }
const b = await chromium.launch({ channel: 'msedge' }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const failed = []; const slow = []
p.on('response', (r) => { if (r.url().includes(':8011') && r.status() >= 400) failed.push(`${r.status()} ${r.url().replace('http://localhost:8011', '')}`) })
p.on('requestfailed', (r) => { if (r.url().includes(':8011')) failed.push(`FAILED ${r.url().replace('http://localhost:8011', '')} ${r.failure()?.errorText}`) })
const errs = []
for (const [s, n] of Object.entries(SECTIONS)) for (let k = 0; k < n; k++) {
  if (s === 'intro' && k === 1) continue
  const t0 = Date.now()
  await p.goto(`http://localhost:4173/presentation/${s}?step=${k}`)
  await p.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => slow.push(`${s}#${k} still loading after 120 s`))
  const dt = (Date.now() - t0) / 1000; if (dt > 8) slow.push(`${s}#${k} ${dt.toFixed(0)} s`)
  const e = await p.$$eval('.err, [data-testid$="-error"]', (els) => els.filter((x) => x.offsetParent).map((x) => x.textContent.trim().slice(0, 80)))
  if (e.length) errs.push(`${s}#${k}: ${e.join(' | ')}`)
}
console.log('backend errors:', failed.length); failed.slice(0, 10).forEach((x) => console.log('  ', x))
console.log('error messages on slides:', errs.length); errs.slice(0, 10).forEach((x) => console.log('  ', x))
console.log('slow steps (> 8 s):', slow.length); slow.forEach((x) => console.log('  ', x))
const film = await (await fetch('http://localhost:4173/film/the-scan-that-changed-everything.mp4', { method: 'HEAD' })).headers.get('content-length')
console.log('film served, bytes:', film)
await b.close()
