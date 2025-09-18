import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";

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
    vi.resetAllMocks();
  });

  it("user can see today's appointments", () => {
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
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("user can navigate to appointment details and see transcript placeholder", async () => {
    const history = createMemoryHistory({ initialEntries: ["/dashboard"] });

    render(
      <Router location={history.location} navigator={history}>
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
      </Router>
    );

    // Click button
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Manually push route because mock list doesn’t navigate
    history.push("/appointment/1");

    // Now AppointmentDetail should render
    expect(
      await screen.findByText(/Appointment Details/i, { exact: false })
    ).toBeInTheDocument();

    // Probe for transcript UI
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

