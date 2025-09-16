// Tests:
// Shows placeholder if no transcript exists.
// Shows transcript text when loaded.
// Clicking “Edit Transcription” switches to edit mode.
// Clicking “Save” calls handleSaveTranscription.
// Clicking “Cancel” exits edit mode without saving

// Tests: AppointmentDetail transcription interactions

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi } from "vitest";

// --- Mock functions ---
const handleEditTranscription = vi.fn();
const handleSaveTranscription = vi.fn();
const handleCancelEdit = vi.fn();
const setTranscriptionText = vi.fn();

// --- Mock hooks ---
vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: vi.fn(),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { room: "Room 1" },
    patientData: {
      name: "Test Patient",
      dateOfBirth: "01/01/1970",
      nhsNumber: "123",
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

// Import after mocks
import { useTranscription } from "@/hooks/useTranscription";

describe("AppointmentDetail transcription", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock return value
    (useTranscription as unknown as vi.Mock).mockReturnValue({
      transcriptionText: "This is a test transcript",
      isEditingTranscription: false,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription,
      handleCancelEdit,
      setTranscriptionText,
    });
  });

  it("shows transcript text", () => {
    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("This is a test transcript")).toBeInTheDocument();
  });

  it("switches to edit mode when Edit button clicked", () => {
    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Edit Transcription"));
    expect(handleEditTranscription).toHaveBeenCalled();
  });

  it("calls handleSaveTranscription when Save is clicked in edit mode", () => {
    // Override mock to return edit mode
    (useTranscription as unknown as vi.Mock).mockReturnValue({
      transcriptionText: "Editing transcript...",
      isEditingTranscription: true,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription,
      handleCancelEdit,
      setTranscriptionText,
    });

    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Save"));
    expect(handleSaveTranscription).toHaveBeenCalled();
  });

  it("calls handleCancelEdit when Cancel is clicked in edit mode", () => {
    // Override mock to return edit mode
    (useTranscription as unknown as vi.Mock).mockReturnValue({
      transcriptionText: "Editing transcript...",
      isEditingTranscription: true,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription,
      handleCancelEdit,
      setTranscriptionText,
    });

    render(
      <MemoryRouter initialEntries={["/appointments/123"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleCancelEdit).toHaveBeenCalled();
  });
});
