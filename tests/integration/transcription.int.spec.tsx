// * Upload → transcript shown (via handleSendForTranscription + UI render).
// * Edit + Save calls handleSaveTranscription.
// * Edit + Cancel calls handleCancelEdit and leaves old text intact.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi } from "vitest";

// --- mock hooks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 123 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 101" },
    patientData: {
      name: "John Doe",
      dateOfBirth: "01/01/1970",
      nhsNumber: "123",
    },
    loading: false,
    error: null,
  }),
}));

// spy-able functions for useTranscription
const handleSendForTranscription = vi.fn();
const handleSaveTranscription = vi.fn();
const handleCancelEdit = vi.fn();
const setTranscriptionText = vi.fn();

let transcriptionText = "";

vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    recordingState: "idle",
    hasRecorded: false,
    recordingDuration: 0,
    transcriptionText,
    transcriptionSent: false,
    isEditingTranscription: false,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    setTranscriptionText,
    handleStartRecording: vi.fn(),
    handlePauseRecording: vi.fn(),
    handleResumeRecording: vi.fn(),
    handleSendForTranscription,
    handleUploadFileForTranscription: vi.fn(),
    handleEditTranscription: vi.fn(() => {
      // flip into edit mode
      (vi.mocked(useTranscription) as any).mockReturnValueOnce({
        ...defaultHook,
        transcriptionText,
        isEditingTranscription: true,
      });
    }),
    handleSaveTranscription,
    handleCancelEdit,
    loadExistingTranscription: vi.fn(),
  }),
}));

// import AFTER mocks
import { useTranscription } from "@/hooks/useTranscription";

describe("Transcription integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    transcriptionText = "";
  });

  it("uploads audio and shows transcript", async () => {
    transcriptionText = "Patient discusses symptoms in detail.";

    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Simulate clicking send for transcription
    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    expect(handleSendForTranscription).toHaveBeenCalled();

    // Transcript text should appear
    await waitFor(() => {
      expect(
        screen.getByText(/Patient discusses symptoms in detail./i)
      ).toBeInTheDocument();
    });
  });

  it("edits and saves transcript", async () => {
    transcriptionText = "Original transcript";

    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Start edit mode
    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(handleSaveTranscription).toHaveBeenCalled();
  });

  it("cancels transcript edit", async () => {
    transcriptionText = "Original transcript";

    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved changes" } });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(handleCancelEdit).toHaveBeenCalled();

    // Old transcript should still be visible
    expect(screen.getByText("Original transcript")).toBeInTheDocument();
    expect(
      screen.queryByText("Unsaved changes")
    ).not.toBeInTheDocument();
  });
});
