// * Edit + Save flow
// * Transcript renders.
// * Clicking Edit calls handleEditTranscription.
// * Switching to edit mode + clicking Save calls handleSaveTranscription.
// * Edit + Cancel flow
// * Starts in edit mode with unsaved text.
// * Clicking Cancel calls handleCancelEdit.

// tests/integration/transcription-edit.int.test.tsx
// This tests:
// * Transcript renders
// * Edit → Save calls backend update
// * Edit → Cancel restores original

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi, describe, it, beforeEach, expect } from "vitest";

// --- Mock toast so we can intercept messages
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock auth (always logged in)
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

// Mock appointment details (so page loads fast)
vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 1" },
    patientData: {
      name: "Test Patient",
      dateOfBirth: "01/01/1970",
      nhsNumber: "123",
      time: "9:00 AM",
    },
    loading: false,
    error: null,
  }),
}));

describe("AppointmentDetail transcript editing (integration)", () => {
  const renderDetail = () =>
    render(
      <MemoryRouter initialEntries={["/appointments/1"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    // Pretend transcription already exists
    localStorage.setItem("mt:lastAudioId:1", "fake-audio-id");

    // Default fetch mocks
    global.fetch = vi.fn()
      // load transcript by id
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transcript: "Initial transcript text" }),
      } as Response)
      // update transcript (when saving)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success" }),
      } as Response);
  });

  it("user can edit and save transcript", async () => {
    renderDetail();

    // Wait for transcript to appear
    expect(
      await screen.findByText("Initial transcript text")
    ).toBeInTheDocument();

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit transcription/i }));

    // Change the text
    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated transcript text" } });

    // Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Assert backend was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/transcribe\/update\/fake-audio-id$/),
        expect.objectContaining({ method: "POST" })
      );
    });

    // Toast should confirm save
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Transcription Saved" })
    );
  });

  it("user can cancel transcript edit", async () => {
    renderDetail();

    // Wait for transcript
    await screen.findByText("Initial transcript text");

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit transcription/i }));

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved changes" } });

    // Cancel edit
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Should return to original text
    await waitFor(() => {
      expect(screen.getByText("Initial transcript text")).toBeInTheDocument();
    });
  });
});
