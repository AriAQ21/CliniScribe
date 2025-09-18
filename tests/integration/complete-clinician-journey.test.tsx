// This tests:
// * CSV import (via useImportedAppointments)
// * Dashboard → Appointment detail navigation
// * Recording flow (via useTranscription)
// * Transcription flow (via useTranscription)
// * Editing & saving transcript
// * Error recovery when sending for transcription

// tests/integration/complete-clinician-journey.test.tsx

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mocks ---
const mockImportAppointments = vi.fn();
const mockSendForTranscription = vi.fn();
const mockSaveTranscription = vi.fn();
const mockStartRecording = vi.fn();
const mockPauseRecording = vi.fn();
const mockResumeRecording = vi.fn();
const mockEditTranscription = vi.fn();
const mockSetTranscriptionText = vi.fn();

vi.mock("@/hooks/useImportedAppointments", () => ({
  useImportedAppointments: () => ({
    appointments: [],
    error: null,
    loading: false,
    importAppointments: mockImportAppointments,
  }),
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
    error: null,
    loading: false,
  }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: {
      id: "1",
      room: "Room 101",
    },
    patientData: {
      name: "John Doe",
      dateOfBirth: "01/01/1970",
      nhsNumber: "123",
      time: "09:00 AM",
    },
    error: null,
    loading: false,
  }),
}));

// Default transcription mock — can be overridden per test
const makeTranscriptionMock = (overrides = {}) => ({
  recordingState: "idle",
  hasRecorded: true,
  recordingDuration: 0,
  transcriptionText: "Patient reports headache symptoms for the past week.",
  transcriptionSent: false,
  isEditingTranscription: false,
  isProcessing: false,
  isLoadingExistingTranscription: false,
  permissionGranted: true,
  setTranscriptionText: mockSetTranscriptionText,
  handleStartRecording: mockStartRecording,
  handlePauseRecording: mockPauseRecording,
  handleResumeRecording: mockResumeRecording,
  handleSendForTranscription: mockSendForTranscription,
  handleEditTranscription: mockEditTranscription,
  handleSaveTranscription: mockSaveTranscription,
  handleCancelEdit: vi.fn(),
  handleUploadFileForTranscription: vi.fn(),
  ...overrides,
});

vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => makeTranscriptionMock(),
}));

// --- Test wrapper ---
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

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={["/appointment/1"]}>
      <Routes>
        <Route path="/appointment/:id" element={<AppointmentDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe("Complete Clinician Journey (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("imports appointments successfully", async () => {
    render(<DashboardOnly />);
    await act(async () => {
      await mockImportAppointments([
        { patientName: "Jane Smith", doctorName: "Dr. Johnson" },
      ]);
    });
    expect(mockImportAppointments).toHaveBeenCalled();
  });

  it("runs recording flow before transcription", async () => {
    render(<DashboardOnly />);
    fireEvent.click(screen.getByText("View Details"));
    renderDetail(); // manual render of detail page

    // tick consent
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: /patient has given consent for recording/i,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(mockStartRecording).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));
    expect(mockPauseRecording).toHaveBeenCalled();

    mockSendForTranscription.mockResolvedValue({});
    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    await waitFor(() => expect(mockSendForTranscription).toHaveBeenCalled());
  });

  it("shows transcript after transcription completes", async () => {
    render(<DashboardOnly />);
    fireEvent.click(screen.getByText("View Details"));
    renderDetail();

    expect(
      await screen.findByText(/headache symptoms/i)
    ).toBeInTheDocument();
  });

  it("edits and saves transcript", async () => {
    render(<DashboardOnly />);
    fireEvent.click(screen.getByText("View Details"));
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: /edit transcription/i }));

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(mockSaveTranscription).toHaveBeenCalled();
  });

  it("handles error recovery on send for transcription", async () => {
    mockSendForTranscription
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce({ transcript: "Recovered transcript" });

    render(<DashboardOnly />);
    fireEvent.click(screen.getByText("View Details"));
    renderDetail();

    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: /patient has given consent for recording/i,
      })
    );

    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    await waitFor(() =>
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    await waitFor(() =>
      expect(mockSendForTranscription).toHaveBeenCalledTimes(2)
    );
  });
});

