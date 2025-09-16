// tests/e2e/complete-clinician-journey.spec.ts
// CSV import → pick appointment → record → send → transcript → edit → save

// tests/e2e/complete-clinician-journey.spec.ts
// CSV import → pick appointment → record → send → transcript → edit → save

import { test, expect, Page } from '@playwright/test';
import { expectOnDashboard, openAnyAppointment, giveConsent, assertAppointmentDetailsVisible, seedDashboardAppointments, login } from './utils';
import { setupTestEnvironment } from './test-setup';

async function openImportDialog(page: Page) {
  const tryClick = async (loc: ReturnType<Page['getByRole']> | ReturnType<Page['locator']>) => {
    if ((await loc.count()) && (await loc.first().isVisible().catch(() => false))) {
      await loc.first().click();
      return true;
    }
    return false;
  };

  if (await tryClick(page.getByRole('button', { name: /import appointments|import|upload/i }))) {
    const dialog = page.getByRole('dialog');
    if (await dialog.count()) return dialog;
  }

  const menus = page.getByRole('button', { name: /more|menu|options|…|⋯/i });
  if (await menus.count()) {
    await menus.first().click().catch(() => {});
    const item = page.getByRole('menuitem', { name: /import|upload/i });
    if (await item.count()) {
      await item.first().click();
      const dialog = page.getByRole('dialog');
      if (await dialog.count()) return dialog;
    }
  }

  if (await page.locator('input[type="file"]').count()) return page;

  throw new Error('Could not open an "Import/Upload" UI.');
}

test.describe('Complete Clinician Journey', () => {
  test('should complete full workflow from CSV import to transcript editing', async ({ page }) => {
    await setupTestEnvironment(page);
    
    await page.route('**/appointments/bulk', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '2 appointments imported successfully',
          imported: 2,
          total_processed: 2,
          duplicates_skipped: 0,
        }),
      });
    });

    await page.route('**/transcribe', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: 'journey123', status: 'queued' }) });
    });
    await page.route('**/transcribe/status/journey123', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed', transcript: 'Patient reports headache symptoms for the past week.' }) });
    });

    let savedTranscript = '';
    await page.route('**/transcribe/update/journey123', async route => {
      try {
        const postData = await route.request().postData();
        // console.log('🧪 Route update - Raw postData:', postData);
        
        // Try to parse as FormData first, then fallback to URLSearchParams
        if (postData) {
          if (postData.includes('new_text=')) {
            // Parse as URLSearchParams if it looks like form data
            savedTranscript = new URLSearchParams(postData).get('new_text') || '';
          } else {
            // Try to parse as FormData boundaries
            const formDataMatch = postData.match(/name="new_text"[\r\n]+([^\r\n-]+)/);
            savedTranscript = formDataMatch ? formDataMatch[1].trim() : '';
          }
        }
        // console.log('🧪 Parsed savedTranscript:', savedTranscript);
        
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
      } catch (error) {
        console.error('🧪 Error parsing transcript update:', error);
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Failed to parse request' }) });
      }
    });

    await seedDashboardAppointments(page, [
      { id: 1, patientName: 'John Doe', doctorName: 'Dr. Smith', room: 'Room 101', date: new Date().toISOString().slice(0, 10), time: '09:00' },
      { id: 2, patientName: 'Jane Smith', doctorName: 'Dr. Johnson', room: 'Room 102', date: new Date().toISOString().slice(0, 10), time: '10:30' },
    ]);
    await login(page);

    const dialog = await openImportDialog(page);

    const csv = `Patient Name,Doctor Name,Date,Time,Room
John Doe,Dr. Smith,${new Date().toISOString().slice(0, 10)},09:00,Room 101
Jane Smith,Dr. Johnson,${new Date().toISOString().slice(0, 10)},10:30,Room 102`;

    await dialog.locator('input[type="file"]').first().setInputFiles({ name: 'appointments.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    const confirm = (await dialog.getByRole('button', { name: /(upload|import appointments)/i }).count())
      ? dialog.getByRole('button', { name: /(upload|import appointments)/i }).first()
      : page.getByRole('button', { name: /(upload|import appointments)/i }).first();
    await confirm.click();

    // Robust toast
    await expect(page.getByRole('status').getByText(/import(ed)?|success|appointments imported/i).first()).toBeVisible({ timeout: 15000 });

    // Open appointment
    await openAnyAppointment(page);

    await giveConsent(page);
    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByText(/recording in progress - \d+:\d{2}/i)).toBeVisible();
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /send for transcription/i }).click();

    await expect(page.getByText(/headache symptoms/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /edit transcription/i }).click();
    const edited = 'Patient reports severe headache symptoms for the past week. Recommending further testing.';
    await page.locator('textarea').fill(edited);
    await page.getByRole('button', { name: /save/i }).click();

    expect(savedTranscript).toBe(edited);
    await expect(page.getByRole('status').getByText(/saved/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle workflow with multiple imported appointments', async ({ page }) => {
    await seedDashboardAppointments(page, [
      { id: 1, patientName: 'John Doe', doctorName: 'Dr. Smith', room: 'Room 101', date: new Date().toISOString().slice(0, 10), time: '09:00' },
      { id: 2, patientName: 'Jane Smith', doctorName: 'Dr. Johnson', room: 'Room 102', date: new Date().toISOString().slice(0, 10), time: '10:30' },
    ]);
    await login(page);

    await expect(page.getByText('John Doe').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Jane Smith').first()).toBeVisible({ timeout: 15000 });

    const viewDetails = page.locator('text=View Details');
    expect(await viewDetails.count()).toBeGreaterThan(0);
  });

  test('should handle error recovery during workflow', async ({ page }) => {
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, [
      { id: 1, patientName: 'John Doe', doctorName: 'Dr. Smith', room: 'Room 101', date: new Date().toISOString().slice(0, 10), time: '09:00' },
    ]);

    let call = 0;
    await page.route('**/transcribe', async route => {
      call++;
      if (call === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Transcription service temporarily unavailable' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_id: 'retry123', status: 'queued' }) });
      }
    });

    await page.route('**/transcribe/status/retry123', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued' }) });
    });

    await login(page);

    await openAnyAppointment(page);

    await giveConsent(page);
    await page.getByRole('button', { name: /start recording/i }).click();
    await page.getByRole('button', { name: /pause recording/i }).click();
    await page.getByRole('button', { name: /send for transcription/i }).click();

    await expect(page.getByText(/temporarily unavailable/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /send for transcription/i }).click();
    await expect(page.getByText(/transcription in progress/i)).toBeVisible({ timeout: 15000 });
  });
});
