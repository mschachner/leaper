import { defineConfig } from '@playwright/test';

// End-to-end tests for the editor. The backend is mocked (see e2e/helpers.js),
// so these need only the dev server. Set PW_CHANNEL=chrome to use an
// installed Chrome instead of Playwright's own Chromium.
const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/leaper/`,
    viewport: { width: 1280, height: 800 },
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/leaper/`,
    reuseExistingServer: true,
  },
});
