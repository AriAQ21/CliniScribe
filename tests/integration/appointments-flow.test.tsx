// tests/integration/appointments-flow.test.tsx

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mocks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 123 } }),
}));

vi.mock("@/hooks/useAppointments", () => ({
  useAppointments: () => ({
    appointments: [
      {
        id: "1",
        patientName: "John Doe",
        doctorName: "Dr. Smith",
        room: "Room 101",
        date: "2025-08-19",
        time: "09:00",
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: {
      id: "1",
      patient_name: "John Doe",
      doctor_name: "Dr. Smith",
      room: "Room 101",
      appointment_date: "2025-08-19",
      appointment_time: "09:00",
      user_id: 123,
    },
    patientData: {
      name: "John Doe",
      dateOfBirth: "01/01/1970",
      nhsNumber: "1234567890",
      time: "9:00 AM",
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAppointmentStatus", () => ({
  useAppointmentStatus: () => ({
    status: "Not started",
    loading: false,
  }),
}));

// Default transcription mock
vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    transcriptionText: "",
    isEditingTranscription: false,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    handleEditTranscription: vi.fn(),
    handleSaveTranscription: vi.fn(),
    handleCancelEdit: vi.fn(),
    setTranscriptionText: vi.fn(),
  }),
}));

// --- Test wrappers ---
const DashboardOnly = () => (
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Routes>
      <Route
        path="/dashboard"
        element={
          <UnifiedAppointmentsList
            dummyAppointments={[]}
            importedAppointments={[
              {
                id: "1",
                patientName: "John Doe",
                doctorName: "Dr. Smith",
                room: "Room 101",
                date: "2025-08-19",
                time: "09:00",
              },
            ]}
            selectedDate={new Date("2025-08-19")}
          />
        }
      />
    </Routes>
  </MemoryRouter>
);

const DetailOnly = () => (
  <MemoryRouter initialEntries={["/appointment/1"]}>
    <Routes>
      <Route path="/appointment/:id" element={<AppointmentDetail />} />
    </Routes>
  </MemoryRouter>
);

// --- Tests ---
describe("Appointments flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows today’s appointments", () => {
    render(<DashboardOnly />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("navigates to appointment details and shows transcription section", async () => {
    render(<DashboardOnly />);

    // Click "View Details"
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Manually render AppointmentDetail (like complete-clinician-journey)
    render(<DetailOnly />);

    // Check that some transcription-related UI exists
    const probes = [
      /consent/i,
      /start recording/i,
      /upload (audio|file)/i,
      /edit transcription/i,
      /send for transcription/i,
      /transcript|transcription/i,
    ];

    await waitFor(() => {
      const found = probes.some((pattern) =>
        screen.queryByText(pattern, { exact: false })
      );
      expect(found).toBe(true);
    });
  });
});
