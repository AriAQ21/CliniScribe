// tests/integration/appointments-flow.int.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mock auth ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 123 } }),
}));

// --- Mock appointments list ---
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

// --- Mock appointment details ---
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

// --- Mock appointment status ---
vi.mock("@/hooks/useAppointmentStatus", () => ({
  useAppointmentStatus: () => ({
    status: "Not started",
    loading: false,
  }),
}));

// ✅ NOTE: we do NOT mock useTranscription → use the real hook

// --- Integration test ---
describe("Appointments flow (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    // Minimal fetch mocks so useTranscription doesn’t break
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/transcribe/status/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "queued" }),
        } as Response);
      }
      if (url.includes("/transcribe/text/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ transcript: "" }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });
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
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Click "View Details" to navigate
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Wait until AppointmentDetail loads
    expect(
      await screen.findByText(/Appointment Details/i)
    ).toBeInTheDocument();

    // Check that transcription section rendered
    await waitFor(() => {
      expect(
        screen.getByText(/transcription will appear here/i)
      ).toBeInTheDocument();
    });
  });
});
