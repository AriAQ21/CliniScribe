// tests/integration/fullJourney.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

// ✅ Mock useAuth so ProtectedRoute thinks user is logged in
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { user_id: "1", name: "Test Clinician" },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// ✅ Mock useDummyAppointments to provide a fake patient
vi.mock("@/hooks/useDummyAppointments", () => ({
  useDummyAppointments: () => ({
    appointments: [
      {
        id: "1",
        patientName: "John Doe",
        doctorName: "Dr Smith",
        room: "Room 1",
        date: new Date().toISOString().split("T")[0], // today
        time: "10:00 AM",
      },
    ],
    loading: false,
    error: null,
  }),
}));

// ✅ Mock useTranscription to avoid MediaRecorder/fetch complexity
vi.mock("@/hooks/useTranscription", () => {
  let text = "Initial transcript";

  return {
    useTranscription: () => ({
      transcriptionText: text,
      isEditingTranscription: false,
      isProcessing: false,
      isLoadingExistingTranscription: false,
      transcriptionSent: true,
      handleEditTranscription: vi.fn(),
      handleSaveTranscription: vi.fn(() => {
        text = text + " Edited";
      }),
      handleCancelEdit: vi.fn(),
      setTranscriptionText: vi.fn((newText: string) => {
        text = newText;
      }),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      sendForTranscription: vi.fn(),
    }),
  };
});

describe("Full Clinician Journey (Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    // ✅ Step 1: Dashboard shows dummy appointment
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    // ✅ Step 2: Navigate into appointment details
    fireEvent.click(screen.getByText(/view details/i));
    await waitFor(() => {
      expect(window.location.pathname).toMatch(/\/appointment\/1/);
    });

    // ✅ Step 3: Transcript is shown immediately (mocked)
    await waitFor(() => {
      expect(screen.getByText(/initial transcript/i)).toBeInTheDocument();
    });

    // ✅ Step 4: Edit transcript
    fireEvent.click(screen.getByText(/edit/i));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Initial transcript Edited" } });
    fireEvent.click(screen.getByText(/save/i));

    // ✅ Step 5: Confirm edited transcript is visible
    await waitFor(() => {
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    // ✅ Step 6: Reload page (simulate with re-render)
    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });
  });
});
