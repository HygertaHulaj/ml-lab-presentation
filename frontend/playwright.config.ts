import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests. Uses the Microsoft Edge installed on Windows (no browser download) with software WebGL so the
 * 3D lesson renders headless. Servers are started automatically, or reused if already running.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1440, height: 900 } }, testIgnore: /responsive/ },
    { name: 'mobile', use: { channel: 'msedge', viewport: { width: 390, height: 844 }, isMobile: false }, testMatch: /responsive/ },
  ],
  webServer: [
    {
      command: '..\\.venv\\Scripts\\uvicorn app.main:app --port 8000 --app-dir ..\\backend',
      url: 'http://localhost:8000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 120_000 },
  ],
})
