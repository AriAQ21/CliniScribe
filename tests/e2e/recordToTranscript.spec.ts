// This tests:
// Focus on the integration between recorded audio and the transcription lifecycle:
// Simulate recording (with mic permissions).
// Pause and send for transcription.
// Mock backend so /transcribe/status/:id eventually returns a transcript.
// Verify transcript actually appears in the Transcription section of the UI (not just “transcription in progress”).

// Record → pause → send → transcript appears

// tests/e2e/recordToTranscript.spec.ts
import { test, expect } from '@playwright/test';
import {
  login,
  seedDashboardAppointments,
  seedAppointmentDetails,
  openAnyAppointment,
  expectOnDetails,
  giveConsent,
} from './utils';
import { setupTestEnvironment } from './test-setup';

test.describe('Record → Upload → Transcript Flow', () => {
  test('should record audio, upload it, and display transcript', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupTestEnvironment(page);

    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    const audioId = 'rt-123';
    const mockedTranscript = 'Patient reports headache symptoms for the past week.';

    await page.route('**/transcribe', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: audioId, status: 'queued' }) });
    });
    await page.route(`**/transcribe/status/${audioId}`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: audioId, status: 'completed', transcript: mockedTranscript }) });
    });
    await page.route(`**/transcribe/text/${audioId}`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: audioId, transcript: mockedTranscript }) });
    });

    await login(page);
    await openAnyAppointment(page);
    await expectOnDetails(page);

    await giveConsent(page);
    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByText(/recording in progress - \d+:\d{2}/i)).toBeVisible();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /send for transcription/i }).click();

    await expect(page.getByText(/headache symptoms for the past week/i)).toBeVisible({ timeout: 15000 });
  });
});
