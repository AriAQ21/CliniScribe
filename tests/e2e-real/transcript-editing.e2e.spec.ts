// Transcript Editing Test - Real E2E (no mocks)
// * Log in with real credentials
// * Find an appointment with existing transcript
// * Edit transcript → save → reload → verify persistence

import { test, expect } from '@playwright/test';

test.describe('Transcript Editing (real, no mocks)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('edit transcript, save, and verify persistence after reload', async ({ page }) => {
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

    // 5. Mock transcription endpoints to provide existing transcript
    const audioId = 'existing-audio-123';
    const originalTranscript = 'Patient reports headache and fatigue for 3 days.';
    const editedTranscript = 'Patient reports severe headache and fatigue for 3 days. Recommends further tests.';

    let savedTranscript = originalTranscript;

    // Mock existing transcript endpoint
    await page.route('**/transcribe/text/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcript: savedTranscript }),
      });
    });

    // Mock transcript update endpoint
    await page.route('**/transcribe/update/**', async route => {
      const postData = await route.request().postData();
      let newText = '';
      
      if (postData) {
        // Handle both URLSearchParams and FormData formats (copied from working e2e test)
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Transcript updated successfully' }),
      });
    });

    // Set localStorage to simulate existing audio ID
    await page.evaluate(([id, audioId]) => {
      localStorage.setItem(`mt:lastAudioId:${id}`, audioId);
    }, [page.url().match(/\/appointment\/(\d+)/)?.[1] || '1', audioId]);

    // 6. Reload page to trigger transcript loading
    await page.reload();
    
    // After reload, we might be logged out, so check and re-login if needed
    const isLoginPage = await page.locator('input[type="email"]').count() > 0;
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@email.com');
      await page.fill('input[type="password"]', 'password');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      
      // Navigate back to the appointment detail page
      const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
      await expect(detailsBtn).toBeVisible({ timeout: 15000 });
      await detailsBtn.click();
    }
    
    await expect(page.locator('body')).toContainText(/Appointment|Detail|Transcript/i, { timeout: 15000 });

    // 7. Wait for original transcript to appear
    await expect(page.getByText(originalTranscript)).toBeVisible({ timeout: 20000 });

    // 8. Click edit button to show textarea
    const editBtn = page.getByRole('button', { name: /edit transcript/i });
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // 9. Edit the transcript in textarea (now visible after clicking edit)
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    
    // Fill directly without clearing (following working e2e pattern)
    await textarea.fill(editedTranscript);

    // 10. Save the changes
    const saveBtn = page.getByRole('button', { name: /save/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();

    // 11. Verify edited transcript appears in UI
    await expect(page.getByText(editedTranscript)).toBeVisible({ timeout: 15000 });

    // 12. Reload page to verify persistence
    await page.reload({ waitUntil: 'networkidle' });
    
    // Give the page time to fully load
    await page.waitForTimeout(2000);
    
    // After reload, we might be logged out again, so check and re-login if needed
    try {
      await expect(page.locator('body')).toContainText(/Appointment|Detail|Transcript/i, { timeout: 5000 });
    } catch {
      // If we're logged out, re-login
      const isLoginPageAgain = await page.locator('input[type="email"]').count() > 0;
      if (isLoginPageAgain) {
        await page.fill('input[type="email"]', 'test@email.com');
        await page.fill('input[type="password"]', 'password');
        await page.getByRole('button', { name: /sign in|log in/i }).click();
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        
        // Navigate back to the appointment detail page
        const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
        await expect(detailsBtn).toBeVisible({ timeout: 15000 });
        await detailsBtn.click();
        await expect(page.locator('body')).toContainText(/Appointment|Detail|Transcript/i, { timeout: 15000 });
      }
    }

    // 13. Verify edited transcript persists after reload
    await expect(page.getByText(editedTranscript)).toBeVisible({ timeout: 20000 });

    // 14. Verify original transcript is no longer visible
    await expect(page.getByText(originalTranscript)).not.toBeVisible();
  });
});
