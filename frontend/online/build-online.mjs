// Builds the ONLINE version of the presentation for Netlify into frontend/dist-online.
// Usage (from frontend/):  node online/build-online.mjs https://<your-render-service>.onrender.com
// - points the app at the online backend (VITE_API_URL),
// - replaces the 694 MB film with the 36 MB web copy (online/the-scan-that-changed-everything.web.mp4, same film, 1080p),
// - adds the redirect rule so every slide address (/presentation/section-8-3?step=4) also works on reload.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const api = (process.argv[2] ?? '').replace(/\/+$/, '')
if (!/^https:\/\/[\w.-]+$/.test(api)) {
  console.error('Give the backend address, e.g.  node online/build-online.mjs https://ml-lab-api.onrender.com')
  process.exit(1)
}
const out = 'dist-online'
rmSync(out, { recursive: true, force: true })
execSync(`npx vite build --outDir ${out} --emptyOutDir`, { stdio: 'inherit', env: { ...process.env, VITE_API_URL: api } })

const film = join(out, 'film', 'the-scan-that-changed-everything.mp4')
rmSync(film, { force: true })
copyFileSync(join('online', 'the-scan-that-changed-everything.web.mp4'), film)
writeFileSync(join(out, '_redirects'), '/*    /index.html   200\n')
if (!existsSync(join(out, 'index.html'))) throw new Error('build failed: no index.html')
console.log(`\nReady: frontend/${out}  (backend ${api}, film ${(statSync(film).size / 1e6).toFixed(1)} MB)`)
