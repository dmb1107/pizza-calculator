import { defineConfig } from '@playwright/test';

/**
 * The iPhone suite (`npm run test:e2e`): the production build, driven in
 * Playwright's WebKit with an iPhone's screen, touch and user agent. WebKit,
 * not Chrome, because Safari's engine is where the phone differs: a tapped
 * button doesn't take focus, which hid the Reset bug from Chrome (FINDINGS-67).
 *
 * The build, not the dev server: StrictMode runs effects twice in dev, which
 * writes storage the production page doesn't.
 */
const PORT = 4179;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}/pizza-calculator/`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/pizza-calculator/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
