import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mock hooks ---
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
    },
    loading: false,
    error: null,
  }),
}));

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

// --- Test wrapper ---
const AppUnderTest = () => (
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
      <Route path="/appointment/:id" element={<AppointmentDetail />} />
    </Routes>
  </MemoryRouter>
);

describe("Appointments flow (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("user can see today's appointments", () => {
    render(<AppUnderTest />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("user can navigate to appointment details and see transcript placeholder", () => {
    render(<AppUnderTest />);

    fireEvent.click(screen.getByText("View Details"));

    expect(
      screen.getByRole("heading", { name: /Appointment Details/i })
    ).toBeInTheDocument();

    // Probe for any transcript-related UI
    const probes = [
      /consent/i,
      /start recording/i,
      /upload (audio|file)/i,
      /edit transcription/i,
      /send for transcription/i,
      /transcript|transcription/i,
    ];

    const found = probes.some((pattern) =>
      screen.queryByText(pattern, { exact: false })
    );
    expect(found).toBe(true);
  });
});
