// tests/e2e/transcript-editing.spec.ts
// Test Flow (mocked backend)
// User logs in with demo credentials.
// Navigate to /appointment/:id.
// Page loads appointment + transcript ("This is a test transcript").
// Click Edit Transcription → textarea appears.
// Type new text ("Updated transcript text").
// Click Save → Playwright intercepts the POST /transcribe/update/:audio_id call and mock return { status: "ok" }.
// Assert that updated text appears in UI.
// (Optional) Test Cancel → reverts to old text.

import { test, expect } from "@playwright/test";
import { login, seedDashboardAppointments, seedAppointmentDetails, expectOnDetails } from './utils';
import { setupTestEnvironment } from './test-setup';

// Track transcript state at module level so it's accessible by reference
let savedTranscript = "This is a test transcript";

test.describe("Transcript Editing", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all route mocks from previous tests to ensure clean state
    await page.unroute('**');
    
    // Reset transcript state for test isolation
    savedTranscript = "This is a test transcript";
  });

  test("user can edit and save transcript", async ({ page }) => {
    const audioId = 'save-test-abc';
    
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    // Mock transcript endpoints with unique audio ID for this test
    await page.route(`**/transcribe/text/${audioId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transcript: savedTranscript }),
      });
    });

    // Mock the transcript update endpoint
    await page.route(`**/transcribe/update/${audioId}`, async route => {
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success" }),
      });
    });

    // Login
    await login(page);

    // Set localStorage after login but before navigation - following working pattern
    await page.evaluate((id) => {
      localStorage.setItem(`mt:lastAudioId:${id}`, 'save-test-abc');
    }, '1');
    
    // Navigate to appointment details
    await page.goto("/appointment/1");
    await expectOnDetails(page);

    // Wait for the prefilled transcript to appear
    await expect(page.getByText("This is a test transcript")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /edit transcription/i }).click();

    const textarea = page.locator("textarea");
    await textarea.fill("Updated transcript text");

    await page.getByRole("button", { name: /save/i }).click();

    // Text remains updated after save (hook toggles editing off)
    await expect(page.getByText("Updated transcript text")).toBeVisible({ timeout: 15000 });
  });

  test("user can cancel transcript edit", async ({ page }) => {
    const audioId = 'cancel-test-abc';
    
    await setupTestEnvironment(page);
    await seedDashboardAppointments(page, '1');
    await seedAppointmentDetails(page, '1');

    // Mock transcript endpoints with unique audio ID for this test
    await page.route(`**/transcribe/text/${audioId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transcript: savedTranscript }),
      });
    });

    // Mock update endpoint to track if it gets called (it shouldn't)
    let updateCalled = false;
    await page.route(`**/transcribe/update/${audioId}`, async route => {
      updateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success" }),
      });
    });

    // Login
    await login(page);

    // Set localStorage after login but before navigation - following working pattern
    await page.evaluate((id) => {
      localStorage.setItem(`mt:lastAudioId:${id}`, 'cancel-test-abc');
    }, '1');
    
    // Navigate to appointment details
    await page.goto("/appointment/1");
    await expectOnDetails(page);

    await expect(page.getByText("This is a test transcript")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /edit transcription/i }).click();
    await page.locator("textarea").fill("Unsaved changes");
    await page.getByRole("button", { name: /cancel/i }).click();

    // Original text is still visible; the unsaved text should not be rendered
    await expect(page.getByText("This is a test transcript")).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);
    
    // Verify update was never called
    expect(updateCalled).toBe(false);
  });
});
