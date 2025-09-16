// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',   // only look here
  timeout: 60 * 1000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://frontend:8081',  // service URL inside Docker network
    headless: true,
  },
});
