// This covers:
// Login
// Navigating to appointment
// Consent check
// Recording
// Pausing
// Sending for transcription
// Seeing confirmation of transcription


import { test, expect } from '@playwright/test';
import { login, seedDashboardAppointments } from './utils';

test.describe('Transcription Flow (seeded Test User)', () => {
  test('select a "Test" appointment with Not started status → transcription flow works', async ({ page }) => {

    await login(page);  

    // --- Step 1: Seed a "Test Appointment" so the dashboard shows it
    await seedDashboardAppointments(page, [
      {
        id: '123',
        patientName: 'Test Appointment',
        doctorName: 'Dr. Smith',
        room: 'Room 101',
      },
    ]);

    // --- Step 1: Go to dashboard
    await page.goto('/dashboard');

    // --- Step 2: Pick a Test appointment card
    const testCard = page.locator('div')
      .filter({ hasText: 'Test Appointment' })
      .first();
    await expect(testCard).toBeVisible({ timeout: 20_000 });

    // --- Step 3: Open details
    const detailsBtn = testCard.getByRole('button', { name: /view details/i });
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();

    // --- Step 4: Verify navigation to detail page
    await expect(page).toHaveURL(/\/appointment\/\d+/, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Appointment|Transcript|Details/i);

    // --- Step 5: Mock the backend transcription endpoints
    const audioId = 'sr-e2e-123';
    const transcriptText = 'This is a mocked transcript for the real E2E test.';

    await page.route('**/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'queued' }),
      });
    });

    await page.route(`**/transcribe/status/${audioId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'completed', transcript: transcriptText }),
      });
    });

    await page.route(`**/transcribe/text/${audioId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, transcript: transcriptText }),
      });
    });

    // --- Step 7: Consent + recording flow (use helper)
    await giveConsent(page);

    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByText(/recording in progress/i)).toBeVisible();

    // Pause + send for transcription
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /^send for transcription$/i }).click();

    // --- Step 8: Wait for transcription progress + mocked transcript
    await expect(page.getByText(/transcription in progress/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(transcriptText)).toBeVisible({ timeout: 15_000 });
  });
});

   
