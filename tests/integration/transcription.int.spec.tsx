// tests/integration/transcription.int.spec.tsx
// Integration test for transcription flow using real useTranscription
// We mock fetch to simulate backend responses.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mock MediaRecorder ---
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

describe("Transcription integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

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

    // Mock appointment details
    vi.mock("@/hooks/useAppointmentDetails", () => ({
      useAppointmentDetails: () => ({
        appointment: { id: "1", room: "Room 1" },
        patientData: {
          name: "John Doe",
          dateOfBirth: "01/01/1970",
          nhsNumber: "1234567890",
          time: "09:00 AM",
        },
        loading: false,
        error: null,
      }),
    }));
  });

  it("uploads audio and shows transcript", async () => {
    const transcriptText = "Patient reports mild headache.";
    const audioId = "int-test-123";

    // Mock fetch chain: upload → status (completed immediately) → transcript
    global.fetch = vi
      .fn()
      // upload
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: audioId, status: "queued" }),
      } as any)
      // status check
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "completed", transcript: transcriptText }),
      } as any)
      // transcript fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transcript: transcriptText }),
      } as any);

    render(
      <MemoryRouter initialEntries={["/appointments/1"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait until appointment details load
    await screen.findByText(/appointment details/i);

    // Tick consent
    fireEvent.click(
      screen.getByRole("checkbox", { name: /patient has given consent/i })
    );

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(
      await screen.findByText(/recording in progress/i)
    ).toBeInTheDocument();

    // Pause recording
    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));

    // Send for transcription
    fireEvent.click(screen.getByRole("button", { name: /^send for transcription$/i }));

    // Transcript should appear
    await waitFor(() =>
      expect(screen.getByText(transcriptText)).toBeInTheDocument()
    );
  });
});
