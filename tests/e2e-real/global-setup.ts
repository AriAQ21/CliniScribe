// tests/e2e-real/global-setup.ts
import { chromium } from '@playwright/test';

export default async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // APP_URL comes from the e2e-tests-real service env: http://frontend:8081
  const base = process.env.APP_URL ?? 'http://localhost:8081';
  await page.goto(base + '/auth');

  // Use your existing dummy user
  await page.fill('input[type="email"]', 'test@email.com');
  await page.fill('input[type="password"]', 'password');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Arrive on dashboard and persist session
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: 'storageState.json' });
  await browser.close();
};
