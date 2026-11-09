import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '127.0.0.1';
const BASE_URL = process.env.BASE_URL ?? `http://${HOST}:${PORT}`;

/**
 * Start the preview server explicitly when `BASE_URL` is supplied by the
 * caller (e.g. a container that already serves `dist/` on a published port).
 * Otherwise let Playwright manage it.
 */
const manageServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  // Astro's preview server over the built output. `reuseExistingServer` keeps
  // local iteration fast when a preview is already running.
  webServer: manageServer
    ? {
        command: `ASTRO_TELEMETRY_DISABLED=1 npx astro preview --host ${HOST} --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
