// This tests:
// Appointment not found → shows "Appointment Not Found" page
// Upload fails (bad file / backend error) → shows error message

// tests/e2e/errors.spec.ts
// 404 not-found view, invalid upload error surfacing, and backend abort handling.

import { test, expect } from '@playwright/test';
import {
  login,
  seedDashboardAppointments,
  seedAppointmentDetails,
  openAnyAppointment,
  expectOnDetails,
  giveConsent,
  expectToast,
} from './utils';
import { setupTestEnvironment } from './test-setup';

test.describe('Error Handling', () => {
  test('should show "Appointment Not Found" for non-existent appointment', async ({ page }) => {
    await seedDashboardAppointments(page);
    await login(page);
    await page.route('**/appointments/99999/details', async route => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Appointment not found' }) });
    });

    await page.goto('/appointment/99999');

    const candidates = [
      page.getByRole('heading', { name: /appointment not found/i }),
      page.getByText(/\b404\b/i),
      page.getByText(/page not found|not found/i),
    ];

    let matched = false;
    for (const c of candidates) {
      if (await c.count()) {
        await expect(c.first()).toBeVisible({ timeout: 15000 });
        matched = true;
        break;
      }
    }
    expect(matched).toBeTruthy();
  });

  test('should show error message for invalid file upload', async ({ page }) => {
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    await page.route('**/transcribe', async route => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Invalid file format' }) });
    });

    await login(page);
    await openAnyAppointment(page);
    await expectOnDetails(page);
    await giveConsent(page);
    // Wait a moment after giving consent for UI to update
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start recording/i }).click();
    // Wait for recording to actually start and UI to update
    await page.waitForTimeout(1000);
    // Look for pause button with more flexible timeout
    await expect(page.getByRole('button', { name: /pause recording/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /send for transcription/i }).click();
    await expectToast(page, /invalid file format/i);
  });

  test('should handle backend connection failure', async ({ page }) => {
    // abort both dummy & imported lists
    await page.route('**/appointments/user/**', async route => {
      await route.abort();
    });
    await login(page);
    await expect(page.getByText(/failed to load appointments|error loading appointments/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
