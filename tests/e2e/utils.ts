import { Page, expect, BrowserContext } from '@playwright/test';
import { setupTestEnvironment } from './test-setup';

/** ISO date for "today" — keeps seeded items visible with your date filters */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Seed the dashboard list your hooks fetch: GET /appointments/user/**
 * Mocks both dummy and regular appointment endpoints used by the app
 * Accepts:
 *  - nothing → default single appointment (id "1")
 *  - id (string/number) → single appointment with that id
 *  - array of appointment items → use exactly those
 */
export async function seedDashboardAppointments(
  page: Page,
  idOrItems?: string | number | Array<{
    id: string | number;
    patientName: string;
    doctorName: string;
    room: string;
    date?: string;
    time?: string;
  }>
) {
  let appointments: Array<any>;

  if (Array.isArray(idOrItems)) {
    appointments = idOrItems.map(a => ({
      ...a,
      date: a.date ?? todayISO(),
      time: a.time ?? '09:00',
    }));
  } else {
    const id = idOrItems ?? '1';
    appointments = [
      {
        id,
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        room: 'Room 101',
        date: todayISO(),
        time: '09:00',
      },
    ];
  }

  // Mock both dummy and regular appointment endpoints
  await page.route('**/appointments/user/**', async route => {
    const url = route.request().url();
    const isDummy = url.includes('is_dummy=true');
    
    // Only return appointments if the URL contains user_id 123 (matching our authenticated user)
    if (url.includes('/user/123')) {
      // Return seeded appointments only for dummy requests, empty for imported
      const responseAppointments = isDummy ? appointments : [];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          appointments: responseAppointments 
        }),
      });
    } else {
      // Return empty array for other user IDs
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ appointments: [] }),
      });
    }
  });

  // Also mock appointment status endpoint for DynamicAppointmentCard
  await page.route('**/appointments/*/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'pending' }),
    });
  });
}

/** Seed details in the exact shape your useAppointmentDetails() expects */
export async function seedAppointmentDetails(
  page: Page,
  id = '1',
  overrides?: Partial<{
    patient_name: string;
    doctor_name: string;
    room: string;
    appointment_date: string;
    appointment_time: string;
    user_id: number;
  }>
) {
  await page.route(`**/appointments/${id}/details`, async route => {
    const url = route.request().url();
    // console.log('🧪 Mock intercepted appointment details request:', { url, id });

    const body = {
      appointment_id: Number(id),
      patient_name: overrides?.patient_name ?? 'John Doe',
      doctor_name: overrides?.doctor_name ?? 'Dr. Smith',
      room: overrides?.room ?? 'Room 101',
      appointment_date: overrides?.appointment_date ?? todayISO(),
      appointment_time: overrides?.appointment_time ?? '09:00:00',
      user_id: overrides?.user_id ?? 123,
    };

    // console.log('🧪 Returning appointment details response:', body);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // Mock transcription endpoints with SUCCESS responses instead of 404s
  await page.route(/.*\/transcribe\/text\/.*/, async route => {
    // console.log('🧪 Mock intercepted transcribe/text request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'Sample transcription text for testing' }),
    });
  });

  await page.route(/.*\/transcribe\/status\/.*/, async route => {
    // console.log('🧪 Mock intercepted transcribe/status request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'completed', transcript: 'Sample transcription text for testing' }),
    });
  });

  await page.route(/.*\/transcribe$/, async route => {
    // console.log('🧪 Mock intercepted transcribe upload request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ audio_id: 'mock-audio-123', status: 'queued' }),
    });
  });

  // Mock audio recording endpoints with SUCCESS responses
  await page.route(/.*\/audio\/.*/, async route => {
    // console.log('🧪 Mock intercepted audio request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, audio_id: 'mock-audio-123' }),
    });
  });

  // Mock microphone/device APIs with realistic device list
  await page.route(/.*\/devices\/.*/, async route => {
    // console.log('🧪 Mock intercepted device request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        devices: [
          { deviceId: 'default', label: 'Default Microphone', kind: 'audioinput' }
        ] 
      }),
    });
  });
}

/** Basic login flow + assert we're on the dashboard */
export async function login(page: Page) {
  // console.log('🧪 Starting login flow');
  
  // Setup test environment with comprehensive mocking
  await setupTestEnvironment(page);
  
  // console.log('🧪 Setting up authentication mock');
  
  // Mock the users table query for authentication with comprehensive logging
  await page.route('**/rest/v1/users*', async route => {
    const url = route.request().url();
    const decodedUrl = decodeURIComponent(url); // Decode URL to handle %40 -> @
    const method = route.request().method();
    // console.log('🧪 Mock intercepted request:', { method, url, decodedUrl });
    
    if (decodedUrl.includes('email=eq.alice@email.com') && decodedUrl.includes('password=eq.password')) {
      // console.log('🧪 Handling login request');
      // Return user object directly for .single() method (not wrapped in array)
      const response = {
        user_id: 123,
        first_name: 'Alice',
        last_name: 'Smith', 
        role: 'doctor',
        location: 'Room 101',
        email: 'alice@email.com'
      };
      // console.log('🧪 Returning login response:', response);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else if (url.includes('user_id=eq.123')) {
      // console.log('🧪 Handling session restore request');
      // Mock user lookup by ID for session restoration (useAuth checkAuth)
      const response = {
        user_id: 123,
        first_name: 'Alice',
        last_name: 'Smith',
        role: 'doctor', 
        location: 'Room 101',
        email: 'alice@email.com'
      };
      // console.log('🧪 Returning session restore response:', response);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      // console.log('🧪 Unhandled users request, returning empty array');
      // Return empty array for invalid credentials or other queries
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify([]) 
      });
    }
  });

  // console.log('🧪 Starting login flow');
  // Navigate to auth page and perform login
  await page.goto('/auth');
  
  // console.log('🧪 Waiting for form elements');
  // Wait for the form to be visible before interacting
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // console.log('🧪 Filling in credentials');
  await page.fill('input[type="email"]', 'alice@email.com');
  await page.fill('input[type="password"]', 'password');
  
  // console.log('🧪 Clicking sign in button');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  
  // Add a small delay to ensure state updates
  await page.waitForTimeout(200);
  // console.log('🧪 Login form submitted, waiting for navigation');
  
  // Wait for successful redirect to dashboard
  // console.log('🧪 Waiting for URL to change to dashboard...');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  // console.log('🧪 URL changed to dashboard, checking dashboard elements');
  await expectOnDashboard(page);
  // console.log('🧪 Login flow completed successfully');
}

/** Assert we landed on the dashboard (robust markers) */
export async function expectOnDashboard(page: Page) {
  // Confirm URL, let data load, then accept any of several signals
  try { await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 15000 }); } catch {}
  await page.waitForLoadState('networkidle').catch(() => {});

  const candidates: Array<
    ReturnType<Page['locator']> |
    ReturnType<Page['getByRole']> |
    ReturnType<Page['getByText']>
  > = [
    // Look for the actual patient names in our test data
    page.getByText('John Doe'),
    page.getByText(/john doe/i),
    
    // Look for View Details buttons
    page.getByRole('button', { name: /view details/i }),
    
    // Look for appointment card structures
    page.locator('[data-testid^="appointment-card"]').first(),
    page.locator('[data-testid*="appointment"]').first(),
    
    // Look for section headings that should appear with appointments
    page.getByRole('heading', { name: /scheduled appointments/i }),
    page.getByText(/scheduled appointments/i),
    
    // General appointment indicators
    page.getByRole('heading', { name: /appointments|scheduled|imported|today/i }).first(),
    page.getByText(/\bappointments\b/i).first(),

    // Empty-state / import affordances (fallback)
    page.getByRole('button', { name: /import|upload|add/i }).first(),
    page.getByText(/no appointments|import appointments/i).first(),
  ];

  for (const c of candidates) {
    if (await c.count()) {
      await expect(c.first()).toBeVisible({ timeout: 15000 });
      return;
    }
  }

  // Last resort: if we *are* on /dashboard and the <main> rendered, accept it.
  if (page.url().includes('/dashboard')) {
    const main = page.locator('main, [role="main"]');
    if (await main.count()) return;
  }

  throw new Error('No dashboard markers found');
}

/** Assert that we're on some "details" page of the appointment system. */
export async function expectOnDetails(page: Page) {
  // console.log('🧪 expectOnDetails: Starting to check for detail page elements');
  
  // Enhanced console error capture
  const consoleLogs: string[] = [];
  const jsErrors: Error[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(msg.text());
      // console.log('🧪 Console Error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    jsErrors.push(error);
    // console.log('🧪 JavaScript Error:', error.message, error.stack);
  });

  // Check for captured test errors
  const testErrors = await page.evaluate(() => {
    return typeof window !== 'undefined' && window.testErrors ? window.testErrors : [];
  });
  
  const testWarnings = await page.evaluate(() => {
    return typeof window !== 'undefined' && window.testWarnings ? window.testWarnings : [];
  });

  if (testErrors.length > 0) {
    // console.log('🧪 expectOnDetails: Captured test errors:', testErrors);
  }
  if (testWarnings.length > 0) {
    // console.log('🧪 expectOnDetails: Captured test warnings:', testWarnings);
  }
  
  // Wait for network and content
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Log console errors if any
  if (consoleLogs.length > 0) {
    // console.log('🧪 expectOnDetails: Console errors found:', consoleLogs);
  }
  if (jsErrors.length > 0) {
    // console.log('🧪 expectOnDetails: JavaScript errors found:', jsErrors.map(e => e.message));
  }
  
  // Log what's actually on the page
  const bodyText = await page.textContent('body');
  // console.log('🧪 expectOnDetails: Full page text:', bodyText?.substring(0, 500) + '...');
  
  // Log page HTML for debugging
  const html = await page.content();
  // console.log('🧪 expectOnDetails: Page HTML:', html.substring(0, 1000) + '...');

  // Try finding several candidates that match what AppointmentDetail.tsx actually renders
  const candidates = [
    // Exact page title from AppointmentDetail.tsx line 177
    page.getByRole('heading', { name: /appointment details/i }),
    
    // Patient information section elements - these should always be present
    page.getByText(/patient name/i),
    page.getByText(/john doe/i),
    page.getByText(/date of birth/i),
    page.getByText(/nhs number/i),
    
    // Card titles from AppointmentDetail.tsx
    page.getByText(/audio upload/i).first(),
    page.getByText(/recording controls/i).first(),
    
    // Consent checkbox and label (lines 284-291)
    page.getByText(/patient has given consent for recording/i),
    page.getByRole('checkbox', { name: /consent/i }),
    
    // Upload audio button (lines 224-227)
    page.getByRole('button', { name: /upload audio/i }),
    
    // Start recording button (lines 318-326) 
    page.getByRole('button', { name: /start recording/i }),
    
    // Back button that's always present (line 166)
    page.getByRole('button', { name: /back to dashboard/i }),
  ];

  // console.log('🧪 expectOnDetails: Checking', candidates.length, 'candidates');

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const count = await candidate.count();
      const isVisible = count > 0 ? await candidate.first().isVisible() : false;
      // console.log(`🧪 expectOnDetails: Candidate ${i}: count=${count}, visible=${isVisible}`);
      
      if (count > 0 && isVisible) {
        // console.log('🧪 expectOnDetails: Found valid element, test passes');
        return; // Found at least one, we're good
      }
    } catch (error) {
      // console.log(`🧪 expectOnDetails: Error checking candidate ${i}:`, error);
    }
  }

  // If we get here, no elements were found - log more debug info
  // console.log('🧪 expectOnDetails: No elements found, checking URL and page state');
  // console.log('🧪 expectOnDetails: Current URL:', page.url());
  
  // Check if we're showing an error state
  const errorHeading = await page.getByRole('heading', { name: /appointment not found/i }).count();
  const loadingText = await page.getByText(/loading appointment details/i).count();
  
  // console.log('🧪 expectOnDetails: Error heading count:', errorHeading);
  // console.log('🧪 expectOnDetails: Loading text count:', loadingText);

  throw new Error('No detail page markers found');
}

/** Click any appointment "View Details" control (link or button) */
export async function openAnyAppointment(page: Page) {
  const options = [
    page.getByRole('link', { name: /view details|details|open/i }).first(),
    page.locator('a[href^="/appointment/"]').first(),
    page.getByRole('button', { name: /view details|details|open/i }).first(),
    page.locator('[data-testid^="appointment-card"] a[href^="/appointment/"]').first(),
    page
      .locator(
        '[data-testid^="appointment-card"] button:has-text("View Details"), [data-testid^="appointment-card"] button:has-text("Details")'
      )
      .first(),
  ];

  for (const loc of options) {
    if ((await loc.count()) && (await loc.isVisible().catch(() => false))) {
      await Promise.all([
        loc.click(),
        page.waitForURL(/\/appointment\/\d+/, { timeout: 15000 }).catch(() => {}),
        page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
      ]);
      return;
    }
  }

  throw new Error('No appointment details control/link found on the dashboard.');
}

/**
 * Toggle consent in a UI-agnostic way.
 * Works with shadcn/ui <Checkbox role="checkbox" aria-checked="..."> + label,
 * and gracefully falls back to several selectors.
 */
export async function giveConsent(page: Page) {
  // console.log('🧪 giveConsent: Starting consent detection');
  
  // Wait for page to be loaded and stable
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // console.log('🧪 giveConsent: Looking for consent elements...');
  
  // 1) Try the accessible checkbox first - most reliable
  // console.log('🧪 giveConsent: Trying role checkbox with consent name');
  const cb = page.getByRole('checkbox', { name: /consent|patient has given consent/i });
  if (await cb.count()) {
    try {
      await cb.waitFor({ state: 'visible', timeout: 10000 });
      const state = await cb.getAttribute('aria-checked');
      // console.log('🧪 giveConsent: Found consent checkbox, current state:', state);
      if (state !== 'true') {
        await cb.click({ force: true });
        // console.log('🧪 giveConsent: Successfully clicked consent checkbox');
      }
      return;
    } catch (error) {
      // console.log('🧪 giveConsent: Role checkbox failed:', error);
    }
  }

  // 2) Try by direct ID #consent
  // console.log('🧪 giveConsent: Trying by ID #consent');
  const byId = page.locator('#consent').first();
  await byId.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if ((await byId.count()) > 0) {
    const isVisible = await byId.isVisible();
    // console.log('🧪 giveConsent: #consent element found, visible:', isVisible);
    if (isVisible) {
      await byId.click({ force: true });
      // console.log('🧪 giveConsent: Successfully clicked #consent');
      return;
    }
  }

  // 3) Try the label linked via htmlFor="consent"
  // console.log('🧪 giveConsent: Trying label[for="consent"]');
  const labelFor = page.locator('label[for="consent"]').first();
  if ((await labelFor.count()) && (await labelFor.isVisible().catch(() => false))) {
    await labelFor.click({ force: true });
    // console.log('🧪 giveConsent: Successfully clicked label[for="consent"]');
    return;
  }

  // 4) Try by label text
  // console.log('🧪 giveConsent: Trying by label text');
  const labelText = page.getByText(/patient has given consent for recording/i).first();
  if ((await labelText.count()) && (await labelText.isVisible().catch(() => false))) {
    await labelText.click({ force: true });
    // console.log('🧪 giveConsent: Successfully clicked label text');
    return;
  }
  
  // 5) Try any checkbox as fallback
  // console.log('🧪 giveConsent: Trying any input[type="checkbox"]');
  const anyCheckbox = page.locator('input[type="checkbox"]').first();
  if ((await anyCheckbox.count()) && (await anyCheckbox.isVisible().catch(() => false))) {
    await anyCheckbox.click({ force: true });
    // console.log('🧪 giveConsent: Successfully clicked any checkbox');
    return;
  }

  // Final debug: show what's available
  const pageContent = await page.textContent('body');
  // console.log('🧪 giveConsent: Available text content snippet:', pageContent?.substring(0, 500));
  throw new Error('Consent control not found - no checkbox elements were visible');
}

/** Handy wait for any inline message containing some text */
export async function waitForAnyText(page: Page, re: RegExp, timeout = 15000) {
  await expect(page.getByText(re)).toBeVisible({ timeout });
}

/** Toast helper: look for ARIA status or fall back to raw text */
export async function expectToast(page: Page, re: RegExp, timeout = 15000) {
  const roleStatus = page.getByRole('status').getByText(re).first();
  if (await roleStatus.count()) {
    await expect(roleStatus).toBeVisible({ timeout });
    return;
  }
  await expect(page.getByText(re).first()).toBeVisible({ timeout });
}

/** Mic permission helper */
export async function grantMicrophone(context: BrowserContext) {
  await context.grantPermissions(['microphone']);
}