// Tests: File Upload → handleUploadFileForTranscription

import { renderHook, act, waitFor } from "@testing-library/react";
import { useTranscription } from "@/hooks/useTranscription";
import { vi } from "vitest";

// mock toast so it doesn’t explode
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// mock auth so user exists
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

describe("useTranscription - file upload", () => {
  const appointmentId = "appt-1";
  const room = "Room A";
  const appointmentDateTime = new Date("2025-08-19T10:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("uploads file and polls transcription successfully", async () => {
    const file = new File(["dummy"], "audio.wav", { type: "audio/wav" });

    // mock fetch sequence: upload → poll
    global.fetch = vi
      .fn()
      // upload response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: "abc123" }),
      } as Response)
      // polling response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "completed", transcript: "Hello world" }),
      } as Response);

    const { result } = renderHook(() =>
      useTranscription(appointmentId, appointmentDateTime)
    );

    await act(async () => {
      await result.current.handleUploadFileForTranscription(
        file,
        appointmentId,
        room,
        appointmentDateTime
      );
    });

    await waitFor(() =>
      expect(result.current.transcriptionText).toBe("Hello world")
    );

    expect(global.fetch).toHaveBeenCalledTimes(2); // upload + poll
  });

  it("handles upload failure gracefully", async () => {
    const file = new File(["dummy"], "audio.wav", { type: "audio/wav" });

    // mock fetch sequence: upload → missing audio_id
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // no audio_id
      } as Response);

    const { result } = renderHook(() =>
      useTranscription(appointmentId, appointmentDateTime)
    );

    await act(async () => {
      await result.current.handleUploadFileForTranscription(
        file,
        appointmentId,
        room,
        appointmentDateTime
      );
    });

    await waitFor(() =>
      expect(result.current.transcriptionText).toContain(
        "Error: Server did not return audio_id"
      )
    );

    expect(global.fetch).toHaveBeenCalledTimes(1); // only upload attempted
  });
});
