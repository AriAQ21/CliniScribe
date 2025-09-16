import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { addHours, format } from 'date-fns';

test.use({ storageState: 'storageState.json' });

test('upload CSV → imported appointment appears on dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  // --- Step 1: Open Import dialog
  await page.getByRole('button', { name: /import appointments/i }).click();
  const dialog = page.locator('div[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });

  // --- Step 2: Generate a unique CSV with today +1h
  const now = new Date();
  const oneHourLater = addHours(now, 1);
  const todayDate = format(now, 'yyyy-MM-dd');
  const timeStr = format(oneHourLater, 'HH:mm');
  const timestamp = Date.now();
  const patientName = `Test Patient ${timestamp}`;

  const csvContent = `Patient Name,Date,Time,Meeting Type
${patientName},${todayDate},${timeStr},GP
`;

  const tmpCsvPath = path.join(os.tmpdir(), `appointments-${timestamp}.csv`);
  fs.writeFileSync(tmpCsvPath, csvContent);

  // --- Step 3: Upload CSV via hidden <input>
  const fileInput = dialog.locator('input[type="file"]');
  await fileInput.setInputFiles(tmpCsvPath);

  // --- Step 4: Confirm import + wait for POST /appointments/bulk
  const [bulkResponse] = await Promise.all([
    page.waitForResponse(r =>
      r.url().includes('/appointments/bulk') && r.request().method() === 'POST' && r.ok(),
      { timeout: 20_000 }
    ),
    dialog.getByRole('button', { name: /import appointments/i }).click(),
  ]);
  expect(bulkResponse.ok()).toBeTruthy();

  // --- Step 5: Wait for dialog to close
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  // --- Step 6: Reload dashboard + wait for appointments GET
  await page.reload();
  await page.waitForResponse(r =>
    r.url().includes('/appointments/user/') && r.request().method() === 'GET' && r.ok(),
    { timeout: 20_000 }
  );

  // --- Step 7: Assert the new appointment appears
  await expect(page.getByText(patientName, { exact: false }))
    .toBeVisible({ timeout: 20_000 });
});
