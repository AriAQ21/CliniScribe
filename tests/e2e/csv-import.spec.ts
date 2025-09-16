// tests/e2e/csv-import.spec.ts
// CSV/Excel import workflow - file upload, validation, appointment creation, error handling

// tests/e2e/csv-import.spec.ts
// CSV/Excel import workflow - file upload, validation, duplicate handling

import { test, expect, Page } from '@playwright/test';
import { expectOnDashboard } from './utils';

async function seedAppointments(page: Page) {
  await page.route('**/appointments/user/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        appointments: [
          { id: 1, patientName: 'Seed Patient', doctorName: 'Dr. Seed', room: 'Room A', date: '2099-12-31', time: '09:00' },
        ],
      }),
    });
  });
}

async function login(page: Page) {
  await seedAppointments(page);
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'alice@email.com');
  await page.fill('input[type="password"]', 'password');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expectOnDashboard(page);
}

async function openImportDialog(page: Page) {
  const direct = [
    page.getByRole('button', { name: /import appointments/i }),
    page.getByRole('button', { name: /import/i }),
    page.getByRole('button', { name: /upload/i }),
  ];
  for (const d of direct) {
    if (await d.count()) {
      try {
        await expect(d.first()).toBeVisible({ timeout: 15000 });
        await d.first().click();
        const dialog = page.getByRole('dialog');
        if (await dialog.count()) return dialog;
      } catch {}
    }
  }
  const menu = page.getByRole('button', { name: /more|menu|options|…|⋯/i });
  if (await menu.count()) {
    await menu.first().click().catch(() => {});
    const item = page.getByRole('menuitem', { name: /import|upload/i });
    if (await item.count()) {
      await item.first().click();
      const dialog = page.getByRole('dialog');
      if (await dialog.count()) return dialog;
    }
  }
  if (await page.locator('input[type="file"]').count()) return page;
  throw new Error('Import trigger not found.');
}

test.describe('CSV/Excel Import', () => {
  test('should import valid CSV appointments successfully', async ({ page }) => {
    await page.route('**/appointments/bulk', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: '3 appointments imported successfully', imported: 3, total_processed: 3, duplicates_skipped: 0 }),
      });
    });

    await login(page);
    const c = await openImportDialog(page);

    const csv = `Patient Name,Doctor Name,Date,Time,Room
John Doe,Dr. Smith,2024-01-15,09:00,Room 101
Jane Smith,Dr. Johnson,2024-01-15,10:30,Room 102`;

    await c.locator('input[type="file"]').first().setInputFiles({ name: 'appointments.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

    const go = (await c.getByRole('button', { name: /(upload|import appointments)/i }).count())
      ? c.getByRole('button', { name: /(upload|import appointments)/i }).first()
      : page.getByRole('button', { name: /(upload|import appointments)/i }).first();

    await go.click();

    await expect(page.getByRole('status').getByText(/appointments imported|success/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should show validation errors for malformed dates', async ({ page }) => {
    await page.route('**/appointments/bulk', async route => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Invalid date format in CSV' }) });
    });

    await login(page);
    const c = await openImportDialog(page);

    const invalid = `Patient Name,Doctor Name,Date,Time,Room
John Doe,Dr. Smith,invalid-date,09:00,Room 101`;

    await c.locator('input[type="file"]').first().setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(invalid) });

    const go = (await c.getByRole('button', { name: /(upload|import appointments)/i }).count())
      ? c.getByRole('button', { name: /(upload|import appointments)/i }).first()
      : page.getByRole('button', { name: /(upload|import appointments)/i }).first();

    await go.click();

    await expect(page.getByRole('status').getByText(/invalid date|invalid.*csv/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle duplicate appointments', async ({ page }) => {
    await page.route('**/appointments/bulk', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: '1 new appointment imported, 1 duplicate skipped', imported: 1, duplicates_skipped: 1, total_processed: 2 }),
      });
    });

    await login(page);
    const c = await openImportDialog(page);

    const csv = `Patient Name,Doctor Name,Date,Time,Room
John Doe,Dr. Smith,2024-01-15,09:00,Room 101
John Doe,Dr. Smith,2024-01-15,09:00,Room 101`;

    await c.locator('input[type="file"]').first().setInputFiles({ name: 'appointments.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

    const go = (await c.getByRole('button', { name: /(upload|import appointments)/i }).count())
      ? c.getByRole('button', { name: /(upload|import appointments)/i }).first()
      : page.getByRole('button', { name: /(upload|import appointments)/i }).first();

    await go.click();

    await expect(page.getByRole('status').getByText(/duplicate/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('status').getByText(/skipped/i).first()).toBeVisible({ timeout: 15000 });
  });
});
