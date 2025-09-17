import { test, expect } from '@playwright/test';
import { login, seedDashboardAppointments, seedAppointmentDetails, giveConsent } from './utils';

test.describe('Transcription Flow (seeded Test User)', () => {
  test('select a "Test" appointment with Not started status → transcription flow works', async ({ page }) => {
    await login(page);

    // Seed the dashboard and details for the same appointment ID
    await seedDashboardAppointments(page, [
      {
        id: '123',
        patientName: 'Test Appointment',
        doctorName: 'Dr. Smith',
        room: 'Room 101',
      },
    ]);
    await seedAppointmentDetails(page, '123');

    await page.goto('/dashboard');

    const testCard = page.locator('div').filter({ hasText: 'Test Appointment' }).first();
    await expect(testCard).toBeVisible({ timeout: 20_000 });

    const detailsBtn = testCard.getByRole('button', { name: /view details/i });
    await detailsBtn.click();

    await expect(page).toHaveURL(/\/appointment\/\d+/, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Appointment|Transcript|Details/i);

    // Mock transcription endpoints
    const audioId = 'sr-integration-123';
    const transcriptText = 'This is a mocked transcript for the integration test.';

    await page.route('**/transcribe', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'queued' }) });
    });
    await page.route(`**/transcribe/status/${audioId}`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'completed', transcript: transcriptText }) });
    });
    await page.route(`**/transcribe/text/${audioId}`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, transcript: transcriptText }) });
    });

    // Consent + recording flow
    await giveConsent(page);
    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByText(/recording in progress/i)).toBeVisible();

    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /^send for transcription$/i }).click();

    await expect(page.getByText(/transcription in progress/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(transcriptText)).toBeVisible({ timeout: 15_000 });
  });
});
