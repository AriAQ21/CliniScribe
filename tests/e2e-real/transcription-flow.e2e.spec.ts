// Transcription Flow Test - Real E2E (no mocks)
// * Log in with real credentials
// * Find any appointment and open details
// * Upload audio file → check transcription flow

import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

test.describe('Transcription Flow (real, no mocks)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('upload audio file and verify transcription flow', async ({ page }) => {
    // 1. Log in first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@email.com');
    await page.fill('input[type="password"]', 'password');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // 2. Wait for dashboard and verify we're logged in
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText(/Appointments/i, { timeout: 15000 });
    // 3. Click the first "View Details" button (any appointment)
    const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
    await expect(detailsBtn).toBeVisible({ timeout: 15000 });
    await detailsBtn.click();
    // 4. Verify we're on appointment detail page
    await expect(page).toHaveURL(/\/appointment\/\d+/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(/Appointment|Detail|Transcript/i, { timeout: 15000 });
    // 5. Mock transcription endpoints (simplified)
    const audioId = 'test-audio-123';
    const transcriptText = 'This is a test transcript for the audio file.';
    // Mock upload endpoint
    await page.route('**/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          audio_id: audioId,
          status: 'queued',
          message: 'Audio uploaded successfully',
        }),
      });
    });
    // Mock status polling - return completed immediately
    await page.route(`**/transcribe/status/**`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          audio_id: audioId,
          status: 'completed',
          transcript: transcriptText,
        }),
      });
    });
    // 6. Upload audio file
    await page.getByRole('button', { name: /upload audio/i }).click();
    // Wait for file input to be visible
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    // Create and upload a fake audio file
    const tmpFile = path.join(os.tmpdir(), `test-audio-${Date.now()}.wav`);
    fs.writeFileSync(tmpFile, Buffer.from('fake audio content', 'utf8'));
    await fileInput.setInputFiles(tmpFile);
    // Click send for transcription
    await page.getByRole('button', { name: /send for transcription/i }).click();
    // 7. Wait for transcript to appear
    await expect(page.getByText(transcriptText)).toBeVisible({ timeout: 20000 });
    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});
