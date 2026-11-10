/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig({
  // TresJS: let the Vue compiler treat <TresXxx> tags as Three.js objects
  plugins: [vue({ ...templateCompilerOptions }), tailwindcss()],
  // the film reads ../shared/story (single source of truth shared with the Remotion workspace)
  server: { port: 5173, strictPort: true, fs: { allow: ['..'] } },
  test: { environment: 'jsdom', globals: true, include: ['tests/**/*.spec.ts'] },
})
