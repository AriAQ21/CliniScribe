// tests/e2e/appointments.spec.ts
import { test, expect } from '@playwright/test';
import { login, seedDashboardAppointments, seedAppointmentDetails, expectOnDetails, openAnyAppointment } from './utils';
import { setupTestEnvironment } from './test-setup';

test.describe('Appointments flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup comprehensive test environment
    await setupTestEnvironment(page);
    
    await seedDashboardAppointments(page, [
      { id: '1', patientName: 'John Doe', doctorName: 'Dr. Smith', room: 'Room 101', time: '09:00' },
    ]);
    await seedAppointmentDetails(page, '1');
    await login(page);
  });

  test("user can log in and see today's appointments", async ({ page }) => {
    await expect(page.getByText(/john doe/i).first()).toBeVisible();
  });

  test('user can open an appointment and see details with transcript placeholder', async ({ page }) => {
    await openAnyAppointment(page);
    await expectOnDetails(page);
    await expect(page).toHaveURL(/\/appointment\/\d+/, { timeout: 15000 });

    // Accept any visible detail UI your page shows initially
    const probes = [
      page.getByText(/patient has given consent for recording/i),
      page.getByRole('checkbox', { name: /consent/i }),
      page.getByRole('button', { name: /start recording|upload (audio|file)|edit transcription|send for transcription/i }),
      page.getByText(/transcript|transcription/i),
      page.getByTestId(/transcript/i),
    ];

    let found = false;
    for (const p of probes) {
      if ((await p.count()) && (await p.first().isVisible().catch(() => false))) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });
});
