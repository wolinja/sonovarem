import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

/*
 * getUserMedia only works in a secure context. localhost is one; the CI origin
 * (http://backend:8000 inside Docker Compose) is not, so Chromium is told to treat it as one.
 * The headless shell ignores that flag, so the projects run the full Chromium ("new headless").
 */
const origin = new URL(baseURL).origin
const insecureOrigin = ['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)
  ? []
  : [`--unsafely-treat-insecure-origin-as-secure=${origin}`]

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'blob' : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* The voice journeys record real audio: Chromium's fake microphone, permission pre-granted. */
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        ...insecureOrigin,
      ],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    /* Farmers use Android phones; keep a mobile viewport in every run. */
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'], channel: 'chromium' } },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
