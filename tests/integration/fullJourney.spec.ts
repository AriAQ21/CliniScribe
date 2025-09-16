// This tests the “happy path full journey”:
// Login → Dashboard → See appointments.
// Navigate to appointment detail page.
// Consent + record audio.
// Pause + send for transcription.
// Transcript appears.
// Edit transcript → save.
// Reload page → confirm saved transcript is still shown.

import { test, expect } from '@playwright/test';
import {
  login,
  seedDashboardAppointments,
  seedAppointmentDetails,
  expectOnDetails,
  openAnyAppointment,
  giveConsent,
} from './utils';
import { setupTestEnvironment } from './test-setup';

test.describe('Full Clinician Journey', () => {
  test('should complete the full flow with mocked transcript response', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupTestEnvironment(page);

    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    let savedTranscript = 'This is a mocked transcript generated for testing.';

    await page.route('**/transcribe', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: 'dummy-id', status: 'queued' }) });
    });
    await page.route('**/transcribe/status/dummy-id', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed', transcript: savedTranscript }) });
    });
    await page.route('**/transcribe/text/dummy-id', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: 'dummy-id', transcript: savedTranscript }) });
    });
    await page.route('**/transcribe/update/dummy-id', async route => {
      const postData = await route.request().postData();
      let newText = '';
      
      if (postData) {
        // Handle both URLSearchParams and FormData formats
        if (postData.includes('------WebKitFormBoundary')) {
          const lines = postData.split('\n');
          const contentIndex = lines.findIndex(line => line.includes('name="new_text"'));
          if (contentIndex !== -1 && contentIndex + 2 < lines.length) {
            newText = lines[contentIndex + 2];
          }
        } else {
          newText = new URLSearchParams(postData).get('new_text') || '';
        }
      }
      
      savedTranscript = newText;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    await login(page);
    await openAnyAppointment(page);
    await expectOnDetails(page);

    await giveConsent(page);
    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByText(/recording in progress - \d+:\d{2}/i)).toBeVisible();
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /send for transcription/i }).click();

    await expect(page.getByText(/mocked transcript/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /edit transcription/i }).click();
    const edited = 'Edited transcript text';
    await page.locator('textarea').fill(edited);
    await page.getByRole('button', { name: /save/i }).click();

    // persist via GET
    await page.reload();
    await expect(page.getByText(edited)).toBeVisible({ timeout: 15000 });
  });
});
