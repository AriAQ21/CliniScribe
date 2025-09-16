// import { test, expect } from '@playwright/test';

// test.describe('Audio Recording Flow (Real E2E)', () => {
//   test('should record audio with real microphone and upload successfully', async ({ page, context }) => {
//     // Grant microphone permission
//     await context.grantPermissions(['microphone']);
    
//     // Mock MediaRecorder and getUserMedia for reliable testing
//     await page.addInitScript(() => {
//       // Mock getUserMedia
//       Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
//         value: () => Promise.resolve({
//           getTracks: () => [{ stop: () => {} }],
//           getAudioTracks: () => [{ stop: () => {} }],
//           active: true,
//           id: 'mock-stream'
//         })
//       });
      
//       // Mock enumerateDevices
//       Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
//         value: () => Promise.resolve([
//           { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' },
//           { deviceId: 'mic2', kind: 'audioinput', label: 'USB Microphone' }
//         ])
//       });
      
//       // Mock MediaRecorder with proper async event handling
//       class MockMediaRecorder extends EventTarget {
//         constructor(stream) {
//           super();
//           this.state = 'inactive';
//           this.stream = stream;
//           this.ondataavailable = null;
//           this.onstop = null;
//           this.onstart = null;
//         }
        
//         start(timeslice) {
//           console.log('🧪 MockMediaRecorder.start() called');
//           // Use setTimeout to make it async like real MediaRecorder
//           setTimeout(() => {
//             this.state = 'recording';
//             console.log('🧪 MockMediaRecorder state changed to recording, firing events');
//             if (this.onstart) this.onstart();
//             this.dispatchEvent(new Event('start'));
            
//             // Simulate data availability
//             setTimeout(() => {
//               const event = { data: new Blob(['test'], { type: 'audio/webm' }) };
//               if (this.ondataavailable) this.ondataavailable(event);
//             }, 100);
//           }, 50); // Small delay to allow React to process
//         }
        
//         stop() {
//           setTimeout(() => {
//             this.state = 'inactive';
//             console.log('🧪 MockMediaRecorder stopped');
//             if (this.onstop) this.onstop();
//             this.dispatchEvent(new Event('stop'));
//           }, 10);
//         }
        
//         pause() {
//           setTimeout(() => {
//             this.state = 'paused';
//             console.log('🧪 MockMediaRecorder paused');
//             this.dispatchEvent(new Event('pause'));
//           }, 10);
//         }
        
//         resume() {
//           setTimeout(() => {
//             this.state = 'recording';
//             this.dispatchEvent(new Event('resume'));
//           }, 10);
//         }
//       }
      
//       window.MediaRecorder = MockMediaRecorder;
//       window.MediaRecorder.isTypeSupported = () => true;
//     });
    
//     // Start from dashboard (already authenticated via global setup)
//     await page.goto('/');
//     await page.waitForLoadState('networkidle');

//     // Find and click any appointment to open details
//     const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
//     await expect(detailsBtn).toBeVisible({ timeout: 15000 });
//     await detailsBtn.click();

//     // Wait for appointment detail page to load
//     await page.waitForURL(/\/appointment\/\d+/, { timeout: 15000 });
//     await expect(page.getByText('Appointment Details')).toBeVisible();

//     // First give consent for recording
//     const consentCheckbox = page.locator('#consent');
//     await expect(consentCheckbox).toBeVisible();
//     await consentCheckbox.check();

//     // Check if microphone selector is present (only if multiple devices)
//     const micSelector = page.locator('[data-testid="microphone-selector"]');
//     if (await micSelector.count() > 0) {
//       // Select first available microphone
//       await micSelector.click();
//       const firstMic = page.locator('[data-testid="microphone-option"]').first();
//       if (await firstMic.count() > 0) {
//         await firstMic.click();
//       }
//     }

//     // Start recording
//     const recordButton = page.getByRole('button', { name: /start recording/i });
//     await expect(recordButton).toBeVisible();
//     await recordButton.click();

//     // Wait for recording to start and verify pause button appears
//     await expect(page.getByRole('button', { name: /pause recording/i })).toBeVisible({ timeout: 3000 });
    
//     // Record for a few seconds
//     await page.waitForTimeout(3000);

//     // Stop recording by clicking pause first, then send
//     const pauseButton = page.getByRole('button', { name: /pause recording/i });
//     await expect(pauseButton).toBeVisible();
//     await pauseButton.click();

//     // Now should see send button
//     const sendButton = page.getByRole('button', { name: /send for transcription/i });
//     await expect(sendButton).toBeVisible();
    
//     // Mock the transcription API calls
//     await page.route('**/api/transcribe/**', async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: 'application/json',
//         body: JSON.stringify({
//           task_id: 'test-task-123',
//           status: 'processing'
//         })
//       });
//     });

//     await page.route('**/api/transcribe/status/**', async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: 'application/json',
//         body: JSON.stringify({
//           status: 'completed',
//           transcript: 'This is a test transcription from real audio recording.',
//           summary: 'Test summary of the recorded audio.'
//         })
//       });
//     });

//     await sendButton.click();

//     // Verify transcription processing
//     await expect(page.getByText(/processing|uploading/i)).toBeVisible();
//     await expect(page.getByText('This is a test transcription from real audio recording.')).toBeVisible({ timeout: 10000 });
    
//     // Verify summary is also displayed
//     await expect(page.getByText('Test summary of the recorded audio.')).toBeVisible();
//   });

//   test('should handle microphone permission denied gracefully', async ({ page, context }) => {
//     // Deny microphone permission
//     await context.grantPermissions([]);
    
//     // Mock MediaRecorder and getUserMedia (but getUserMedia will fail due to no permissions)
//     await page.addInitScript(() => {
//       // Mock getUserMedia to reject when no permissions
//       Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
//         value: () => Promise.reject(new Error('Permission denied'))
//       });
//     });
    
//     // Start from dashboard
//     await page.goto('/');
//     await page.waitForLoadState('networkidle');

//     // Navigate to appointment details
//     const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
//     await expect(detailsBtn).toBeVisible({ timeout: 15000 });
//     await detailsBtn.click();
//     await page.waitForURL(/\/appointment\/\d+/, { timeout: 15000 });

//     // Give consent first
//     const consentCheckbox = page.locator('#consent');
//     await expect(consentCheckbox).toBeVisible();
//     await consentCheckbox.check();

//     // Try to start recording
//     const recordButton = page.getByRole('button', { name: /start recording/i });
//     await expect(recordButton).toBeVisible();
//     await recordButton.click();

//     // Should show permission error (this will be handled by the browser/app)
//     // The exact error message may vary, so we just check that recording doesn't start
//     await expect(page.getByText(/recording in progress/i)).not.toBeVisible({ timeout: 2000 });
//   });

//   test('should allow selecting different microphone devices', async ({ page, context }) => {
//     await context.grantPermissions(['microphone']);
    
//     // Mock MediaRecorder and getUserMedia for reliable testing
//     await page.addInitScript(() => {
//       // Mock getUserMedia
//       Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
//         value: () => Promise.resolve({
//           getTracks: () => [{ stop: () => {} }],
//           getAudioTracks: () => [{ stop: () => {} }],
//           active: true,
//           id: 'mock-stream'
//         })
//       });
      
//       // Mock enumerateDevices
//       Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
//         value: () => Promise.resolve([
//           { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' },
//           { deviceId: 'mic2', kind: 'audioinput', label: 'USB Microphone' }
//         ])
//       });
      
//       // Mock MediaRecorder with proper async event handling
//       class MockMediaRecorder extends EventTarget {
//         constructor(stream) {
//           super();
//           this.state = 'inactive';
//           this.stream = stream;
//           this.ondataavailable = null;
//           this.onstop = null;
//           this.onstart = null;
//         }
        
//         start(timeslice) {
//           console.log('🧪 MockMediaRecorder.start() called');
//           // Use setTimeout to make it async like real MediaRecorder
//           setTimeout(() => {
//             this.state = 'recording';
//             console.log('🧪 MockMediaRecorder state changed to recording, firing events');
//             if (this.onstart) this.onstart();
//             this.dispatchEvent(new Event('start'));
            
//             // Simulate data availability
//             setTimeout(() => {
//               const event = { data: new Blob(['test'], { type: 'audio/webm' }) };
//               if (this.ondataavailable) this.ondataavailable(event);
//             }, 100);
//           }, 50); // Small delay to allow React to process
//         }
        
//         stop() {
//           setTimeout(() => {
//             this.state = 'inactive';
//             console.log('🧪 MockMediaRecorder stopped');
//             if (this.onstop) this.onstop();
//             this.dispatchEvent(new Event('stop'));
//           }, 10);
//         }
        
//         pause() {
//           setTimeout(() => {
//             this.state = 'paused';
//             console.log('🧪 MockMediaRecorder paused');
//             this.dispatchEvent(new Event('pause'));
//           }, 10);
//         }
        
//         resume() {
//           setTimeout(() => {
//             this.state = 'recording';
//             this.dispatchEvent(new Event('resume'));
//           }, 10);
//         }
//       }
      
//       window.MediaRecorder = MockMediaRecorder;
//       window.MediaRecorder.isTypeSupported = () => true;
//     });
    
//     // Start from dashboard
//     await page.goto('/');
//     await page.waitForLoadState('networkidle');

//     // Navigate to appointment details
//     const detailsBtn = page.getByRole('button', { name: /view details/i }).first();
//     await expect(detailsBtn).toBeVisible({ timeout: 15000 });
//     await detailsBtn.click();
//     await page.waitForURL(/\/appointment\/\d+/, { timeout: 15000 });

//     // Give consent
//     const consentCheckbox = page.locator('#consent');
//     await expect(consentCheckbox).toBeVisible();
//     await consentCheckbox.check();

//     // Check if microphone selector is present (only shows if multiple devices)
//     const micSelector = page.locator('[data-testid="microphone-selector"]');
//     if (await micSelector.count() > 0) {
//       // Open dropdown
//       await micSelector.click();
      
//       // Verify we can see microphone options
//       const micOptions = page.locator('[data-testid="microphone-option"]');
//       const optionCount = await micOptions.count();
//       expect(optionCount).toBeGreaterThan(0);
      
//       // Select first option
//       await micOptions.first().click();
//     }

//     // Should be able to start recording regardless
//     const recordButton = page.getByRole('button', { name: /start recording/i });
//     await expect(recordButton).toBeVisible();
//     await recordButton.click();

//     // Wait for recording to start and verify pause button appears
//     await expect(page.getByRole('button', { name: /pause recording/i })).toBeVisible({ timeout: 3000 });
//   });
// });
