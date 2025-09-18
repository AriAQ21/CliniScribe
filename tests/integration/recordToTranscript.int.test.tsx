// This tests:
// * Render AppointmentDetail inside a router.
// * Mock MediaRecorder (same way you do in useAudioRecording unit test).
// * Mock fetch for /transcribe + /transcribe/status/:id.
// * Simulate the record → pause → send → transcript appears journey.

// tests/integration/recordToTranscript.integration.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mocks ---
class MockMediaRecorder {
  public state = "inactive";
  public ondataavailable: ((event: any) => void) | null = null;
  public onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
    setTimeout(() => {
      this.ondataavailable?.(
        { data: new Blob(["fake audio"], { type: "audio/webm" }) }
      );
    }, 0);
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
}

describe("Record → Upload → Transcript Flow (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock MediaRecorder + getUserMedia
    (global as any).MediaRecorder = MockMediaRecorder;
    (global.navigator.mediaDevices as any) = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    };

    // Mock auth
    vi.mock("@/hooks/useAuth", () => ({
      useAuth: () => ({ user: { user_id: 1 } }),
    }));

    // Mock appointment details (so it doesn’t stay stuck on loading)
    vi.mock("@/hooks/useAppointmentDetails", () => ({
      useAppointmentDetails: () => ({
        appointment: {
          id: "123",
          patient_name: "John Doe",
          doctor_name: "Dr. Smith",
          room: "Room 101",
          appointment_date: "2025-08-19",
          appointment_time: "09:00:00",
          user_id: 1,
        },
        patientData: {
          name: "John Doe",
          dateOfBirth: "01/01/1970",
          nhsNumber: "123",
          time: "9:00 AM",
        },
        error: null,
        loading: false,
      }),
    }));
  });

  it("records audio, uploads it, and displays transcript", async () => {
    const audioId = "rt-123";
    const mockedTranscript =
      "Patient reports headache symptoms for the past week.";

    // Mock fetch: upload → status → transcript
    global.fetch = vi
      .fn()
      // upload
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: audioId, status: "queued" }),
      } as any)
      // poll transcription
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_id: audioId,
          status: "completed",
          transcript: mockedTranscript,
        }),
      } as any)
      // fetch transcript by id
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_id: audioId,
          transcript: mockedTranscript,
        }),
      } as any);

    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // wait until appointment details load before interacting
    await screen.findByText(/appointment details/i);

    // Tick consent checkbox
    const consentBox = await screen.findByRole("checkbox", {
      name: /patient has given consent for recording/i,
    });
    fireEvent.click(consentBox);

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(await screen.findByText(/recording in progress/i)).toBeInTheDocument();

    // Pause recording
    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));

    // Send for transcription
    fireEvent.click(screen.getByRole("button", { name: /send for transcription/i }));

    // Transcript appears
    await waitFor(() =>
      expect(
        screen.getByText(/headache symptoms for the past week/i)
      ).toBeInTheDocument()
    );
  });
});
