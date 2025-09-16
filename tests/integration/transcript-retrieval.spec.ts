// tests/e2e/transcript-retrieval.spec.ts
// This tests:
// - Real UI login flow (fill + Sign In button)
// - Navigate to /appointment/1
// - Seed /appointments/1/details in a frontend-friendly shape
// - Seed /transcribe/text/* to return a saved transcript
// - Assert transcript text is shown and the placeholder is not


import { test, expect } from '@playwright/test';
import { login, seedDashboardAppointments, seedAppointmentDetails, expectOnDetails } from './utils';
import { setupTestEnvironment } from './test-setup';

test('Transcript retrieval shows previously saved transcript', async ({ page }) => {
  // Clear all route mocks from previous tests to ensure clean state
  await page.unroute('**');
  
  await setupTestEnvironment(page);
  
  // dashboard + details
  await seedDashboardAppointments(page, '1');
  await seedAppointmentDetails(page, '1');

  // saved transcript plumbing — your hook only fetches when LS has an audio id
  const savedAudioId = 'saved-123';
  const savedText = 'Patient reports mild headache for 3 days.';
  await page.route(`**/transcribe/text/${savedAudioId}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: savedText }),
    });
  });

  // login
  await login(page);

  // set LS key before entering details page
  await page.evaluate(id => {
    localStorage.setItem(`mt:lastAudioId:${id}`, 'saved-123');
  }, '1');

  // go to details
  await page.goto('/appointment/1');
  await expectOnDetails(page);

  // transcript appears
  await expect(page.getByText(savedText)).toBeVisible({ timeout: 15000 });

  // placeholder gone
  await expect(
    page.getByText('Transcription will appear here after recording is sent for processing')
  ).toHaveCount(0);
});
