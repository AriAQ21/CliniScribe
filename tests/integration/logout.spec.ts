// This tests:
// Log in using valid credentials
// Wait for dashboard to load
// Click the logout button in the header
// Confirm redirection to the /auth page

// tests/e2e/logout.spec.ts
import { test, expect } from '@playwright/test';

test('user can log out from the dashboard', async ({ page }) => {
  // Step 1: Go to login page
  await page.goto('/auth');

  // Step 2: Fill in and submit login form
  await page.getByLabel('Email').fill('alice@email.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Step 3: Wait for dashboard to load (check for known dashboard element)
  await expect(page.getByRole('heading', { name: 'CliniScribe' })).toBeVisible();

  // Step 4: Click logout button
  await page.getByRole('button', { name: 'Logout' }).click();

  // Step 5: Expect to be redirected to login page
  await expect(page).toHaveURL('/auth');

  // Optional: Check login page content is visible again
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
