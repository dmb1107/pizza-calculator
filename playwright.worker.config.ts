import { defineConfig } from '@playwright/test';

/**
 * The Worker end to end (`npm run test:worker`, §14): the production build
 * served by `wrangler dev`, which runs `worker/` in workerd, the Workers
 * runtime, with its Durable Object; GitHub replaced by a local fake that
 * holds the one repository. Chromium, because a passkey can be made in the
 * suite only through its DevTools protocol's virtual authenticator. The
 * secrets are test values for this run only.
 */
const PORT = 8788;
const GITHUB = 8790;

export default defineConfig({
  testDir: 'e2e-worker',
  testIgnore: 'preview.spec.ts',
  reporter: [['list']],
  timeout: 90_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}/`, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: [
    {
      command: `node e2e-worker/fakeGitHub.mjs`,
      url: `http://127.0.0.1:${GITHUB}/__log`,
      env: { FAKE_GITHUB_PORT: String(GITHUB) },
      reuseExistingServer: !!process.env["REUSE_SERVERS"],
    },
    {
      command:
        `npm run build && rm -rf .wrangler/e2e && npx wrangler dev --port ${PORT} --local-upstream localhost:${PORT} --persist-to .wrangler/e2e ` +
        `--var GITHUB_API:http://127.0.0.1:${GITHUB} --var GITHUB_TOKEN:local-test-token --var SETUP_CODE:local-setup-code`,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: !!process.env["REUSE_SERVERS"],
      timeout: 180_000,
    },
  ],
});
