// tests/integration/transcription.int.spec.tsx
// * Upload → transcript shown (via real hook + mocked fetch).
// * Edit + Save calls handleSaveTranscription.
// * Edit + Cancel leaves old text intact.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 1" },
    patientData: {
      name: "John Doe",
      dateOfBirth: "01/01/1970",
      nhsNumber: "1234567890",
    },
    loading: false,
    error: null,
  }),
}));

// ---- test wrapper ----
const TestApp = () => (
  <MemoryRouter initialEntries={["/appointment/1"]}>
    <Routes>
      <Route path="/appointment/:id" element={<AppointmentDetail />} />
    </Routes>
  </MemoryRouter>
);

describe("Transcription integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uploads audio and shows transcript", async () => {
    const audioId = "ti-1";
    const transcriptText = "Mocked transcript appears!";

    global.fetch = vi
      .fn()
      // upload audio
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
      // fetch transcript text
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: audioId, transcript: transcriptText }),
      } as any);

    render(<TestApp />);

    // open upload dialog
    fireEvent.click(screen.getByRole("button", { name: /upload audio/i }));

    // simulate file selection
    const file = new File(["dummy audio"], "test-audio.wav", {
      type: "audio/wav",
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });

    // click send
    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    // ✅ transcript text eventually appears
    await waitFor(() =>
      expect(screen.getByText(transcriptText)).toBeInTheDocument()
    );
  });

  it("edits and saves transcript", async () => {
    render(<TestApp />);

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Check that edited text appears
    await waitFor(() =>
      expect(screen.getByText(/edited transcript/i)).toBeInTheDocument()
    );
  });

  it("cancels transcript edit", async () => {
    render(<TestApp />);

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved changes" } });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Ensure old text is still there, not the unsaved one
    await waitFor(() =>
      expect(
        screen.getByText(/patient reports mild headache/i)
      ).toBeInTheDocument()
    );
  });
});
