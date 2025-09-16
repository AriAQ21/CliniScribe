// This test will:
// Log in with demo credentials.
// Navigate to the dashboard.
// Click the first appointment.
// Upload an audio file.
// Submit for transcription.
// Confirm upload success via UI.
// tests/e2e/upload-audio.spec.ts
import { test, expect } from '@playwright/test';
import { login, seedDashboardAppointments, seedAppointmentDetails, expectOnDetails, openAnyAppointment } from './utils';
import { setupTestEnvironment } from './test-setup';

test('logs in and uploads audio file for transcription', async ({ page }) => {
  await setupTestEnvironment(page);
  await seedDashboardAppointments(page, '1');
  await seedAppointmentDetails(page, '1');

  // stub upload
  await page.route('**/transcribe', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: 'upload123', status: 'queued' }) });
  });

  // Mock transcription status endpoint
  await page.route('**/transcribe/status/upload123', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'processing' }) });
  });

  await login(page);
  await openAnyAppointment(page);
  await expectOnDetails(page);

  // open upload dialog
  await page.getByRole('button', { name: /upload audio/i }).click();
  const fileInput = page.locator('input[type="file"]');

  const fakeWav = Buffer.from('RIFFxxxxWAVEfmt ', 'utf8');
  await fileInput.setInputFiles({ name: 'test_audio.wav', mimeType: 'audio/wav', buffer: fakeWav });

  await expect(page.getByText(/file selected/i)).toBeVisible();

  // send for transcription from dialog
  await page.getByRole('button', { name: /send for transcription/i }).click();

  // placeholder / in-progress text should be visible
  await expect(page.getByText(/transcription in progress|will appear here/i)).toBeVisible({ timeout: 15000 });
});
