// This tests:
// 1. Upload audio → see transcript appear after processing
// 2. Edit transcript → Save persists changes
// 3. Edit transcript → Cancel discards changes


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

test.describe('Transcription Workflow', () => {
  test('should complete upload and show transcript', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    // Clear all route mocks from previous tests to ensure clean state
    await page.unroute('**');
    
    // Clear ALL localStorage BEFORE component mounts - be very aggressive
    await page.addInitScript(() => {
      console.log('🧪 Clearing ALL localStorage in addInitScript');
      localStorage.clear();
      console.log('🧪 localStorage keys after complete clear:', Object.keys(localStorage));
    });
    
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    
    // Setup appointment details WITHOUT the conflicting transcript mocks
    await page.route('**/appointments/1/details', async route => {
      const body = {
        appointment_id: 1,
        patient_name: 'John Doe',
        doctor_name: 'Dr. Smith',
        room: 'Room 101',
        appointment_date: '2025-09-05',
        appointment_time: '09:00:00',
        user_id: 123,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    // CRITICAL: Mock transcript endpoints to return EMPTY/404 to prevent existing transcript loading
    await page.route('**/transcribe/text/**', async route => {
      console.log('🧪 Blocking transcript text request:', route.request().url());
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No transcript found' }),
      });
    });

    // Mock transcript status to return empty for any existing audio IDs
    await page.route('**/transcribe/status/**', async route => {
      const url = route.request().url();
      // Only block if this is NOT our test audio ID
      if (!url.includes('clean-recording-123')) {
        console.log('🧪 Blocking transcript status request:', url);
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'No status found' }),
        });
      } else {
        // Let our test audio ID through
        await route.continue();
      }
    });

    const audioId = 'clean-recording-123';
    const transcriptText = 'Patient discusses symptoms and medical history in detail.';

    // Mock the transcribe endpoint for new recording
    await page.route('**/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'queued' }),
      });
    });

    // Mock transcription status endpoint for new recording
    await page.route(`**/transcribe/status/${audioId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_id: audioId, status: 'completed', transcript: transcriptText }),
      });
    });

    await login(page);
    
    await openAnyAppointment(page);
    await expectOnDetails(page);

    await giveConsent(page);
    
    // Wait for consent to be processed
    await page.waitForTimeout(500);
    
    // Ensure Start Recording button is visible and click it
    const startButton = page.getByRole('button', { name: /start recording/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    
    // Wait for recording state to update and verify the "Pause Recording" button appears
    await expect(page.getByRole('button', { name: /pause recording/i })).toBeVisible({ timeout: 10000 });
    
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /^send for transcription$/i }).click();

    await expect(page.getByText(transcriptText)).toBeVisible({ timeout: 15000 });
  });

  test('should save transcript edits', async ({ page }) => {
    // Clear route mocks from previous tests to isolate this test
    await page.unroute('**');
    
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    // ensure an "existing" transcript is present via LS
    await page.addInitScript(() => {
      localStorage.setItem('mt:lastAudioId:1', 'audio-1-edit-test');
    });

    // GET text with unique audio ID for this test
    await page.route('**/transcribe/text/audio-1-edit-test', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: 'Original transcript' }) });
    });

    let savedText = '';
    await page.route('**/transcribe/update/**', async route => {
      const post = await route.request().postData();
      if (post) {
        // Handle FormData
        const formData = new FormData();
        const boundary = route.request().headers()['content-type']?.match(/boundary=([^;]+)/)?.[1];
        if (boundary) {
          // Parse multipart form data manually
          const parts = post.split(`--${boundary}`);
          for (const part of parts) {
            const match = part.match(/name="new_text"\r?\n\r?\n(.+?)(?:\r?\n|$)/s);
            if (match) {
              savedText = match[1].trim();
              break;
            }
          }
        } else {
          // Fallback to URLSearchParams if not multipart
          savedText = new URLSearchParams(post).get('new_text') || '';
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    await login(page);
    await page.goto('/appointment/1');
    await expectOnDetails(page);

    await expect(page.getByText('Original transcript')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /edit transcription/i }).click();
    await page.locator('textarea').fill('Edited transcript content');
    await page.getByRole('button', { name: /save/i }).click();

    expect(savedText).toBe('Edited transcript content');
  });

  test('should cancel transcript edits without saving', async ({ page }) => {
    // Clear route mocks from previous tests to isolate this test
    await page.unroute('**');
    
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    // present transcript
    await page.addInitScript(() => {
      localStorage.setItem('mt:lastAudioId:1', 'audio-1-cancel-test');
    });
    await page.route('**/transcribe/text/audio-1-cancel-test', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: 'Original transcript' }) });
    });

    let called = false;
    await page.route('**/transcribe/update/**', async route => {
      called = true; // should remain false
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    await login(page);
    await page.goto('/appointment/1');
    await expectOnDetails(page);

    await expect(page.getByText('Original transcript')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /edit transcription/i }).click();
    await page.locator('textarea').fill('This should be discarded');
    await page.getByRole('button', { name: /cancel/i }).click();

    // editing UI closed & no save call made
    await expect(page.locator('textarea')).toHaveCount(0);
    expect(called).toBe(false);
  });
});
