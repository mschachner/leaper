import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/leaper/',
  test: {
    // Unit tests (vitest). The browser tests in e2e/ run under Playwright.
    include: ['tests/**/*.test.js'],
  },
})
