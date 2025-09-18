// This tests:
// * Mock transcription endpoints (/transcribe, /transcribe/status/:id, /transcribe/text/:id)
// * Consent + recording flow:
// * Start recording → see "Recording in progress"
// * Pause recording
// * Send for transcription
// * See "Transcription in progress..."
// * Then see the transcript text appear

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

describe("Transcription Flow (integration)", () => {
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

  it("records, pauses, sends, and shows transcript", async () => {
    const audioId = "sr-integration-123";
    const transcriptText =
      "This is a mocked transcript for the integration test.";

    // Mock fetch chain: upload → status → transcript
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
        json: async () => ({
          audio_id: audioId,
          status: "completed",
          transcript: transcriptText,
        }),
      } as any)
      // fetch transcript by id
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: audioId, transcript: transcriptText }),
      } as any);

    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Consent
    fireEvent.click(screen.getByLabelText(/patient has given consent/i));

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(await screen.findByText(/recording in progress/i)).toBeInTheDocument();

    // Pause recording
    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));

    // Send for transcription
    fireEvent.click(
      screen.getByRole("button", { name: /^send for transcription$/i })
    );

    // Wait for "transcription in progress" message
    expect(
      await screen.findByText(/transcription in progress/i)
    ).toBeInTheDocument();

    // Then transcript appears
    await waitFor(() =>
      expect(screen.getByText(transcriptText)).toBeInTheDocument()
    );
  });
});
