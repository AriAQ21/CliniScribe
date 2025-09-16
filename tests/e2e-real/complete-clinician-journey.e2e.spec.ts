// import { test, expect } from '@playwright/test';

// test.describe('Complete Clinician Journey (Real E2E)', () => {
//   test('should complete full clinician workflow from login to transcription', async ({ page, context }) => {
//     // Grant necessary permissions
//     await context.grantPermissions(['microphone']);

//     // Step 1: Authentication (already handled by global setup, but verify)
//     await page.goto('/');
//     await expect(page).toHaveURL(/.*dashboard/);

//     // Step 2: View appointments list
//     await expect(page.getByText(/appointments/i)).toBeVisible();
    
//     // Should see some appointments
//     const appointmentCards = page.locator('[data-testid="appointment-card"]');
//     await expect(appointmentCards.first()).toBeVisible({ timeout: 10000 });

//     // Step 3: Select an appointment
//     await appointmentCards.first().click();
//     await page.waitForLoadState('networkidle');
    
//     // Should be on appointment detail page
//     await expect(page.locator('h1')).toContainText(/appointment/i);
//     await expect(page.getByText(/patient/i)).toBeVisible();

//     // Step 4: Check appointment details are loaded
//     await expect(page.getByText(/date|time/i)).toBeVisible();
//     await expect(page.getByText(/status/i)).toBeVisible();

//     // Step 5: Start recording (if no existing transcription)
//     const existingTranscript = page.getByTestId('existing-transcript');
//     const hasExistingTranscript = await existingTranscript.count() > 0;

//     if (!hasExistingTranscript) {
//       // Record new audio
//       const recordButton = page.getByRole('button', { name: /start recording|record/i });
//       await expect(recordButton).toBeVisible();
//       await recordButton.click();

//       // Verify recording started
//       await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
      
//       // Record for sufficient time
//       await page.waitForTimeout(4000);
      
//       // Stop recording
//       await page.getByRole('button', { name: /stop recording|stop/i }).click();
      
//       // Verify audio is ready
//       await expect(page.locator('audio')).toBeVisible();
//     }

//     // Step 6: Upload/Process transcription
//     const processButton = page.getByRole('button', { name: /upload|send|process/i });
//     if (await processButton.count() > 0) {
//       // Mock transcription API
//       await page.route('**/api/transcribe/**', async (route) => {
//         if (route.request().method() === 'POST') {
//           await route.fulfill({
//             status: 200,
//             contentType: 'application/json',
//             body: JSON.stringify({
//               task_id: 'journey-test-' + Date.now(),
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
//             transcript: 'Patient presents with symptoms of fatigue and headaches. Medical history includes hypertension. Recommended blood work and follow-up in two weeks.',
//             summary: 'Follow-up appointment needed for patient with fatigue, headaches, and hypertension. Blood work ordered.'
//           })
//         });
//       });

//       await processButton.click();
      
//       // Wait for processing
//       await expect(page.getByText(/processing|uploading/i)).toBeVisible();
//     }

//     // Step 7: Verify transcription results
//     await expect(page.getByText(/Patient presents with symptoms/i)).toBeVisible({ timeout: 15000 });
//     await expect(page.getByText(/Follow-up appointment needed/i)).toBeVisible();

//     // Step 8: Edit transcription if needed
//     const editButton = page.getByRole('button', { name: /edit/i });
//     if (await editButton.count() > 0) {
//       await editButton.click();
      
//       const transcriptTextarea = page.locator('textarea[data-testid="transcript-editor"]');
//       await expect(transcriptTextarea).toBeVisible();
      
//       // Add some additional notes
//       await transcriptTextarea.fill('Patient presents with symptoms of fatigue and headaches. Medical history includes hypertension. Recommended blood work and follow-up in two weeks. Additional note: Patient reports stress at work may be contributing factor.');
      
//       // Save changes
//       const saveButton = page.getByRole('button', { name: /save/i });
//       await saveButton.click();
      
//       // Verify changes saved
//       await expect(page.getByText(/stress at work/i)).toBeVisible();
//     }

//     // Step 9: Update appointment status
//     const statusDropdown = page.locator('[data-testid="status-selector"]');
//     if (await statusDropdown.count() > 0) {
//       await statusDropdown.click();
//       const completedOption = page.getByRole('option', { name: /completed/i });
//       if (await completedOption.count() > 0) {
//         await completedOption.click();
//         await expect(page.getByText(/completed/i)).toBeVisible();
//       }
//     }

//     // Step 10: Navigate back to dashboard
//     const backButton = page.getByRole('button', { name: /back|dashboard/i });
//     if (await backButton.count() > 0) {
//       await backButton.click();
//     } else {
//       await page.goto('/dashboard');
//     }
    
//     // Verify back on dashboard
//     await expect(page).toHaveURL(/.*dashboard/);
//     await expect(page.getByText(/appointments/i)).toBeVisible();

//     // Step 11: Verify appointment shows updated status in list
//     await page.waitForTimeout(2000); // Allow for state updates
//     const updatedAppointmentCard = appointmentCards.first();
//     // Note: Status might not be immediately visible in card, that's OK for this test
//   });

//   test('should handle complete workflow with file upload instead of recording', async ({ page }) => {
//     await page.goto('/appointments/1');
//     await page.waitForLoadState('networkidle');

//     // Look for file upload option
//     const uploadArea = page.locator('[data-testid="audio-upload"]');
//     const fileInput = page.locator('input[type="file"]');
    
//     if (await uploadArea.count() > 0 || await fileInput.count() > 0) {
//       // Create a dummy audio file
//       const dummyAudioBuffer = new ArrayBuffer(1024);
//       const dummyFile = new File([dummyAudioBuffer], 'test-audio.wav', { type: 'audio/wav' });
      
//       if (await fileInput.count() > 0) {
//         await fileInput.setInputFiles([{
//           name: 'test-audio.wav',
//           mimeType: 'audio/wav',
//           buffer: Buffer.from(dummyAudioBuffer)
//         }]);
//       }

//       // Mock upload and transcription
//       await page.route('**/api/transcribe/**', async (route) => {
//         if (route.request().method() === 'POST') {
//           await route.fulfill({
//             status: 200,
//             contentType: 'application/json',
//             body: JSON.stringify({
//               task_id: 'upload-test-' + Date.now(),
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
//             transcript: 'Uploaded audio transcription: Patient consultation regarding follow-up care.',
//             summary: 'Follow-up care consultation completed via uploaded audio file.'
//           })
//         });
//       });

//       // Process the uploaded file
//       const processButton = page.getByRole('button', { name: /upload|process|transcribe/i });
//       if (await processButton.count() > 0) {
//         await processButton.click();
        
//         // Verify transcription appears
//         await expect(page.getByText(/Uploaded audio transcription/i)).toBeVisible({ timeout: 15000 });
//       }
//     }
//   });

//   test('should maintain workflow state across page reloads', async ({ page }) => {
//     // Start workflow
//     await page.goto('/appointments/1');
//     await page.waitForLoadState('networkidle');

//     // Get initial appointment details
//     const initialTitle = await page.locator('h1').textContent();
    
//     // Reload page
//     await page.reload();
//     await page.waitForLoadState('networkidle');
    
//     // Verify appointment details persist
//     await expect(page.locator('h1')).toContainText(initialTitle || '');
    
//     // Verify any existing transcription persists
//     const transcriptSection = page.locator('[data-testid="transcript-section"]');
//     if (await transcriptSection.count() > 0) {
//       await expect(transcriptSection).toBeVisible();
//     }
//   });
// });
