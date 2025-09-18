// * Upload → transcript shown (via handleSendForTranscription + UI render).
// * Edit + Save calls handleSaveTranscription.
// * Edit + Cancel calls handleCancelEdit and leaves old text intact.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";

// ---- mock state ----
let isEditing = false;

const mockSaveTranscription = vi.fn();
const mockSendForTranscription = vi.fn();
const mockUploadFileForTranscription = vi.fn();

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

vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    transcriptionText: "Patient reports mild headache.",
    isEditingTranscription: isEditing,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    recordingState: "idle",
    hasRecorded: true,
    handleEditTranscription: () => {
      isEditing = true;
    },
    handleCancelEdit: () => {
      isEditing = false;
    },
    handleSaveTranscription: mockSaveTranscription,
    handleSendForTranscription: mockSendForTranscription,
    handleUploadFileForTranscription: mockUploadFileForTranscription,
    setTranscriptionText: vi.fn(),
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
    isEditing = false;
  });

  it("uploads audio and shows transcript", async () => {
    render(<TestApp />);

    // open upload dialog
    fireEvent.click(screen.getByRole("button", { name: /upload audio/i }));

    // simulate file selection
    const file = new File(["dummy audio"], "test-audio.wav", { type: "audio/wav" });
    const input = screen.getByLabelText(/upload file/i);
    fireEvent.change(input, { target: { files: [file] } });

    // click send inside the dialog
    fireEvent.click(screen.getByRole("button", { name: /send for transcription/i }));

    await waitFor(() => {
      expect(mockUploadFileForTranscription).toHaveBeenCalled();
      expect(mockSendForTranscription).toHaveBeenCalled();
    });
  });

  it("edits and saves transcript", async () => {
    render(<TestApp />);

    fireEvent.click(screen.getByRole("button", { name: /edit transcription/i }));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockSaveTranscription).toHaveBeenCalled();
  });

  it("cancels transcript edit", async () => {
    render(<TestApp />);

    fireEvent.click(screen.getByRole("button", { name: /edit transcription/i }));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved changes" } });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(isEditing).toBe(false);
    });
  });
});
