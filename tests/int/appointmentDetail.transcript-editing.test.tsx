// * Edit + Save flow
// * Transcript renders.
// * Clicking Edit calls handleEditTranscription.
// * Switching to edit mode + clicking Save calls handleSaveTranscription.
// * Edit + Cancel flow
// * Starts in edit mode with unsaved text.
// * Clicking Cancel calls handleCancelEdit.


import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi, describe, it, beforeEach, expect } from "vitest";

// --- Mocks ---
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// mock auth (always return user)
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

// mock appointment details (so page loads without errors)
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

// we’ll override return values in each test
vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: vi.fn(),
}));
import { useTranscription } from "@/hooks/useTranscription";

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
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("user can edit and save transcript", async () => {
    const handleEditTranscription = vi.fn();
    const handleSaveTranscription = vi.fn();

    (useTranscription as vi.Mock).mockReturnValue({
      transcriptionText: "This is a test transcript",
      isEditingTranscription: false,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription,
      handleCancelEdit: vi.fn(),
      setTranscriptionText: vi.fn(),
    });

    renderDetail();

    // transcript appears
    expect(screen.getByText("This is a test transcript")).toBeInTheDocument();

    // enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit transcription/i }));
    expect(handleEditTranscription).toHaveBeenCalled();

    // simulate editing mode
    (useTranscription as vi.Mock).mockReturnValue({
      transcriptionText: "Updated transcript text",
      isEditingTranscription: true,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription,
      handleCancelEdit: vi.fn(),
      setTranscriptionText: vi.fn(),
    });

    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(handleSaveTranscription).toHaveBeenCalled();
    });
  });

  it("user can cancel transcript edit", async () => {
    const handleEditTranscription = vi.fn();
    const handleCancelEdit = vi.fn();

    // Start in edit mode
    (useTranscription as vi.Mock).mockReturnValue({
      transcriptionText: "Unsaved changes",
      isEditingTranscription: true,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      handleEditTranscription,
      handleSaveTranscription: vi.fn(),
      handleCancelEdit,
      setTranscriptionText: vi.fn(),
    });

    renderDetail();

    // cancel edit
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(handleCancelEdit).toHaveBeenCalled();
    });
  });
});
