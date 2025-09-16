// This tests:
//     * User logs in → sees appointments fetched from real DB.
//     * Clicking an appointment opens the real detail page.

import { test, expect } from '@playwright/test';

test.describe('Appointments Dashboard (real, no mocks)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('user sees appointments and can open details', async ({ page }) => {
    // 1. Log in
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@email.com');
    await page.fill('input[type="password"]', 'password');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // 2. Wait for dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    // 3. Assert the dashboard shows appointments
    await expect(page.locator('body')).toContainText(/Appointments/i, { timeout: 15000 });

    // 4. Click the first "View Details" button
    const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
    await expect(detailsBtn).toBeVisible({ timeout: 15000 });
    await detailsBtn.click();

    // 5. Verify detail page uses singular route
    await expect(page).toHaveURL(/\/appointment\/\d+/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(/Appointment|Transcript|Details/i, {
      timeout: 15000,
    });
  });
});
