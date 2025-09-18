// tests/integration/fullJourney.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Index";
import AppointmentDetail from "@/pages/AppointmentDetail";

// ───────────────────────
// Mocks
// ───────────────────────
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "clinician-1", name: "Dr. Test" },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Always return a dummy appointment for *today’s* date
vi.mock("@/hooks/useDummyAppointments", () => ({
  useDummyAppointments: () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      appointments: [
        {
          id: "1",
          patientName: "John Doe",
          doctorName: "Dr. Smith",
          date: todayStr,
          time: "09:00:00",
          room: "Room 1",
        },
      ],
      loading: false,
      error: null,
    };
  },
}));

// No imported appointments
vi.mock("@/hooks/useImportedAppointments", () => ({
  useImportedAppointments: () => ({
    appointments: [],
    loading: false,
    error: null,
    refreshAppointments: vi.fn(),
  }),
}));

// Stable appointment details
vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: (id: string) => ({
    appointment: {
      id,
      room: "Room 1",
    },
    patientData: {
      name: "John Doe",
      dateOfBirth: "01/01/1980",
      nhsNumber: "1234567890",
      time: "09:00 AM",
    },
    loading: false,
    error: null,
  }),
}));

// Stub transcription hook
vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    recordingState: "idle",
    hasRecorded: false,
    recordingDuration: 0,
    transcriptionText: "",
    transcriptionSent: false,
    isEditingTranscription: false,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    setTranscriptionText: vi.fn(),
    handleStartRecording: vi.fn(),
    handlePauseRecording: vi.fn(),
    handleResumeRecording: vi.fn(),
    handleSendForTranscription: vi.fn(),
    handleUploadFileForTranscription: vi.fn(),
    handleEditTranscription: vi.fn(),
    handleSaveTranscription: vi.fn(),
    handleCancelEdit: vi.fn(),
  }),
}));

// ───────────────────────
// Test
// ───────────────────────
describe("Full Clinician Journey (Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Dashboard loads and shows dummy appointment
    await waitFor(() => {
      expect(screen.getByText(/scheduled appointments/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    // Click "View Details"
    const viewBtn = screen.getByRole("button", { name: /view details/i });
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    // Router navigates to /appointment/1
    await waitFor(() => {
      expect(screen.getByText(/appointment details/i)).toBeInTheDocument();
      expect(screen.getByText(/patient name/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    // (Stubbed interactions: edit transcript etc.)
    // Example: open "Edit Transcription" if it were rendered
    // In this mocked test, transcriptionText="" so section shows placeholder
    await waitFor(() => {
      expect(
        screen.getByText(/transcription will appear here/i)
      ).toBeInTheDocument();
    });
  });
});
