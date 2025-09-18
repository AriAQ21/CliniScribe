// tests/integration/appointments-flow.integration.test.tsx

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
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
      appointment_id: 1,
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

describe("Appointments flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows today’s appointments", () => {
    render(
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

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("navigates to appointment details and shows transcription section", async () => {
    render(
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
          {/* define detail route here */}
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Click "View Details"
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Wait until AppointmentDetail heading renders
    expect(
      await screen.findByRole("heading", { name: /appointment details/i })
    ).toBeInTheDocument();

    // Confirm transcription placeholder
    expect(
      await screen.findByText(/transcription will appear here/i, {
        exact: false,
      })
    ).toBeInTheDocument();
  });
});
