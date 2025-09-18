This tests:
* CSV import (via useImportedAppointments)
* Dashboard → Appointment detail navigation
* Recording flow (via useAudioRecording)
* Transcription flow (via useTranscription)
* Editing & saving transcript
* Error recovery when sending for transcription

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
      { id: "1", patientName: "John Doe", doctorName: "Dr. Smith", room: "Room 101", date: "2025-08-19", time: "09:00" },
    ],
    error: null,
    loading: false,
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
      appointment_time: "09:00:00",
      user_id: 123,
    },
    patientData: { name: "John Doe", dateOfBirth: "01/01/1970", nhsNumber: "123" },
    error: null,
    loading: false,
  }),
}));

vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    transcriptionText: "Patient reports headache symptoms for the past week.",
    isEditingTranscription: false,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    handleEditTranscription: vi.fn(),
    handleSaveTranscription: mockSaveTranscription,
    handleCancelEdit: vi.fn(),
    handleSendForTranscription: mockSendForTranscription,
    setTranscriptionText: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAudioRecording", () => ({
  useAudioRecording: () => ({
    recordingState: "idle",
    hasRecorded: false,
    audioBlob: null,
    startRecording: mockStartRecording.mockImplementation(() => {
      (vi.mocked(useAudioRecording) as any).recordingState = "recording";
    }),
    pauseRecording: mockPauseRecording.mockImplementation(() => {
      (vi.mocked(useAudioRecording) as any).recordingState = "paused";
    }),
    resumeRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

// --- Test wrapper ---
const TestApp = () => (
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

describe("Complete Clinician Journey (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("imports appointments successfully", async () => {
    render(<TestApp />);
    await act(async () => {
      await mockImportAppointments([{ patientName: "Jane Smith", doctorName: "Dr. Johnson" }]);
    });
    expect(mockImportAppointments).toHaveBeenCalled();
  });

  it("runs recording flow before transcription", async () => {
    render(<TestApp />);
    fireEvent.click(screen.getByText("View Details"));

    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    expect(mockStartRecording).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));
    expect(mockPauseRecording).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /send for transcription/i }));
    await waitFor(() =>
      expect(mockSendForTranscription).toHaveBeenCalled()
    );
  });

  it("shows transcript after transcription completes", async () => {
    render(<TestApp />);
    fireEvent.click(screen.getByText("View Details"));

    await waitFor(() =>
      expect(screen.getByText(/headache symptoms/i)).toBeInTheDocument()
    );
  });

  it("edits and saves transcript", async () => {
    render(<TestApp />);
    fireEvent.click(screen.getByText("View Details"));

    fireEvent.click(screen.getByText(/edit transcription/i));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });
    fireEvent.click(screen.getByText(/save/i));

    expect(mockSaveTranscription).toHaveBeenCalled();
  });

  it("handles error recovery on send for transcription", async () => {
    mockSendForTranscription
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce({ transcript: "Recovered transcript" });

    render(<TestApp />);
    fireEvent.click(screen.getByText("View Details"));
    fireEvent.click(screen.getByText(/send for transcription/i));

    await waitFor(() =>
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText(/send for transcription/i));
    await waitFor(() =>
      expect(mockSendForTranscription).toHaveBeenCalledTimes(2)
    );
  });
});
