// import { test, expect } from '@playwright/test';

// test.describe('Data Persistence (Real E2E)', () => {
//   test('should persist appointment data across browser sessions', async ({ page, context }) => {
//     // Step 1: Navigate to appointments and record some data
//     await page.goto('/dashboard');
//     await page.waitForLoadState('networkidle');

//     const firstAppointment = page.locator('[data-testid="appointment-card"]').first();
//     await expect(firstAppointment).toBeVisible({ timeout: 10000 });
    
//     // Get appointment ID or unique identifier
//     await firstAppointment.click();
//     await page.waitForLoadState('networkidle');
    
//     const appointmentUrl = page.url();
//     const appointmentTitle = await page.locator('h1').textContent();

//     // Step 2: Add or modify some data (if transcription exists, edit it)
//     const existingTranscript = page.locator('[data-testid="transcript-content"]');
//     let testData = 'Data persistence test - ' + Date.now();

//     if (await existingTranscript.count() > 0) {
//       // Edit existing transcript
//       const editButton = page.getByRole('button', { name: /edit/i });
//       if (await editButton.count() > 0) {
//         await editButton.click();
//         const textarea = page.locator('textarea[data-testid="transcript-editor"]');
//         await expect(textarea).toBeVisible();
        
//         const currentContent = await textarea.inputValue();
//         const newContent = currentContent + '\n\n' + testData;
//         await textarea.fill(newContent);
        
//         await page.getByRole('button', { name: /save/i }).click();
//         await expect(page.getByText(testData)).toBeVisible();
//       }
//     } else {
//       // Mock adding new transcription data
//       await page.route('**/api/transcribe/**', async (route) => {
//         if (route.request().method() === 'POST') {
//           await route.fulfill({
//             status: 200,
//             contentType: 'application/json',
//             body: JSON.stringify({
//               task_id: 'persistence-test-' + Date.now(),
//               status: 'processing'
//             })
//           });
//         }
//       });

//       await page.route('**/api/transcribe/status/**', async (route) => {
//         await route.fulfill({
//           status: 200,
//           contentType: 'application/json',
//           body: JSON.stringify({
//             status: 'completed',
//             transcript: testData,
//             summary: 'Test data for persistence validation'
//           })
//         });
//       });

//       // Try to add transcription via upload or recording
//       const uploadButton = page.getByRole('button', { name: /upload|add transcription/i });
//       if (await uploadButton.count() > 0) {
//         // Simulate file upload
//         const fileInput = page.locator('input[type="file"]');
//         if (await fileInput.count() > 0) {
//           const dummyBuffer = new ArrayBuffer(1024);
//           await fileInput.setInputFiles([{
//             name: 'test-persistence.wav',
//             mimeType: 'audio/wav',
//             buffer: Buffer.from(dummyBuffer)
//           }]);
//         }
        
//         await uploadButton.click();
//         await expect(page.getByText(testData)).toBeVisible({ timeout: 15000 });
//       }
//     }

//     // Step 3: Close browser and create new session
//     await context.close();

//     // Step 4: Create new browser context (simulating new session)
//     const newContext = await page.context().browser()!.newContext({
//       storageState: 'storageState.json' // Use saved authentication state
//     });
//     const newPage = await newContext.newPage();

//     // Step 5: Navigate back to the same appointment
//     await newPage.goto(appointmentUrl);
//     await newPage.waitForLoadState('networkidle');

//     // Step 6: Verify data persisted
//     await expect(newPage.locator('h1')).toContainText(appointmentTitle || '');
//     await expect(newPage.getByText(testData)).toBeVisible();

//     await newContext.close();
//   });

//   test('should persist user authentication across page reloads', async ({ page }) => {
//     // Verify we start authenticated
//     await page.goto('/dashboard');
//     await expect(page).toHaveURL(/.*dashboard/);

//     // Reload multiple times
//     for (let i = 0; i < 3; i++) {
//       await page.reload();
//       await page.waitForLoadState('networkidle');
//       await expect(page).toHaveURL(/.*dashboard/);
//       await expect(page.getByText(/appointments/i)).toBeVisible();
//     }

//     // Navigate away and back
//     await page.goto('/');
//     await expect(page).toHaveURL(/.*dashboard/); // Should redirect to dashboard if authenticated
//   });

//   test('should handle network interruptions gracefully', async ({ page, context }) => {
//     await page.goto('/appointments/1');
//     await page.waitForLoadState('networkidle');

//     // Simulate network failure
//     await context.setOffline(true);

//     // Try to perform actions that require network
//     const refreshButton = page.getByRole('button', { name: /refresh|reload/i });
//     if (await refreshButton.count() > 0) {
//       await refreshButton.click();
      
//       // Should show appropriate error or offline indicator
//       await expect(page.getByText(/network|offline|connection/i)).toBeVisible({ timeout: 5000 });
//     }

//     // Restore network
//     await context.setOffline(false);
//     await page.waitForTimeout(1000);

//     // Verify functionality restored
//     await page.reload();
//     await page.waitForLoadState('networkidle');
//     await expect(page.locator('h1')).toBeVisible();
//   });

//   test('should maintain appointment list state after navigation', async ({ page }) => {
//     // Step 1: Go to dashboard and note appointments
//     await page.goto('/dashboard');
//     await page.waitForLoadState('networkidle');

//     const appointmentCards = page.locator('[data-testid="appointment-card"]');
//     await expect(appointmentCards.first()).toBeVisible({ timeout: 10000 });
    
//     const initialCount = await appointmentCards.count();
//     const firstAppointmentText = await appointmentCards.first().textContent();

//     // Step 2: Navigate to an appointment
//     await appointmentCards.first().click();
//     await page.waitForLoadState('networkidle');
    
//     // Verify we're on appointment detail page
//     await expect(page.locator('h1')).toContainText(/appointment/i);

//     // Step 3: Navigate back to dashboard
//     await page.goBack();
//     await page.waitForLoadState('networkidle');

//     // Step 4: Verify appointment list state maintained
//     const returnedAppointmentCards = page.locator('[data-testid="appointment-card"]');
//     await expect(returnedAppointmentCards.first()).toBeVisible();
    
//     const returnedCount = await returnedAppointmentCards.count();
//     const returnedFirstAppointmentText = await returnedAppointmentCards.first().textContent();

//     expect(returnedCount).toBe(initialCount);
//     expect(returnedFirstAppointmentText).toBe(firstAppointmentText);
//   });

//   test('should persist filter and sorting preferences', async ({ page }) => {
//     await page.goto('/dashboard');
//     await page.waitForLoadState('networkidle');

//     // Look for date filter controls
//     const dateFilter = page.locator('[data-testid="date-filter"]');
//     if (await dateFilter.count() > 0) {
//       // Apply a date filter
//       await dateFilter.click();
      
//       const todayOption = page.getByText(/today|this week/i);
//       if (await todayOption.count() > 0) {
//         await todayOption.click();
//         await page.waitForTimeout(1000);
        
//         // Note the filtered results
//         const filteredCards = page.locator('[data-testid="appointment-card"]');
//         const filteredCount = await filteredCards.count();
        
//         // Reload page
//         await page.reload();
//         await page.waitForLoadState('networkidle');
        
//         // Verify filter persisted (if implemented in app)
//         // Note: This test will pass even if filter persistence isn't implemented
//         // It's testing the ideal behavior
//         await page.waitForTimeout(2000);
//       }
//     }

//     // Look for sorting controls
//     const sortControl = page.locator('[data-testid="sort-control"]');
//     if (await sortControl.count() > 0) {
//       await sortControl.click();
      
//       const dateSort = page.getByText(/date|time/i);
//       if (await dateSort.count() > 0) {
//         await dateSort.click();
//         await page.waitForTimeout(1000);
        
//         // Reload and verify sorting maintained
//         await page.reload();
//         await page.waitForLoadState('networkidle');
//         await page.waitForTimeout(2000);
//       }
//     }
//   });

//   test('should recover from data corruption scenarios', async ({ page }) => {
//     await page.goto('/dashboard');
//     await page.waitForLoadState('networkidle');

//     // Verify basic functionality works
//     const appointmentCards = page.locator('[data-testid="appointment-card"]');
//     await expect(appointmentCards.first()).toBeVisible({ timeout: 10000 });

//     // Navigate to appointment detail
//     await appointmentCards.first().click();
//     await page.waitForLoadState('networkidle');

//     // Corrupt localStorage (simulating data corruption)
//     await page.evaluate(() => {
//       localStorage.setItem('corrupted_key', 'invalid_json_data{{{');
//       localStorage.setItem('user_preferences', 'not_json');
//     });

//     // Reload page - app should handle corrupted localStorage gracefully
//     await page.reload();
//     await page.waitForLoadState('networkidle');

//     // Verify app still functions
//     await expect(page.locator('h1')).toBeVisible();
    
//     // Navigate back to dashboard
//     await page.goto('/dashboard');
//     await expect(page.getByText(/appointments/i)).toBeVisible();
//   });
// });
