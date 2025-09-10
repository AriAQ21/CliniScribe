// playwright.e2e-real.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e-real',               // only runs the real E2E folder
  globalSetup: './tests/e2e-real/global-setup.ts',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:8081', // set by Docker service
    storageState: 'storageState.json',     // saved by global-setup (login session)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  retries: process.env.CI ? 1 : 0,
});
