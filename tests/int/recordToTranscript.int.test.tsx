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

    // Consent first
    fireEvent.click(screen.getByLabelText(/patient has given consent/i));

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(await screen.findByText(/recording in progress/i)).toBeInTheDocument();

    // Pause recording
    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));

    // Send for transcription
    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    // Transcript appears
    await waitFor(() =>
      expect(
        screen.getByText(/headache symptoms for the past week/i)
      ).toBeInTheDocument()
    );
  });
});
