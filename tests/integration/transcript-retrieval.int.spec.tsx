import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi } from "vitest";

// --- mock hooks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 1" },
    patientData: {
      name: "Test Patient",
      dateOfBirth: "01/01/1970",
      nhsNumber: "1234567890",
    },
    loading: false,
    error: null,
  }),
}));

// spy so we can control hook output
const fetchTranscriptById = vi.fn();

vi.mock("@/hooks/useTranscription", () => {
  return {
    useTranscription: (id: string) => {
      // hold mutable transcript text so tests can control it
      let transcriptText = "";

      return {
        recordingState: "idle",
        hasRecorded: false,
        recordingDuration: 0,
        transcriptionText: transcriptText,
        transcriptionSent: false,
        isEditingTranscription: false,
        isProcessing: false,
        isLoadingExistingTranscription: false,
        permissionGranted: true,
        setTranscriptionText: (val: string) => {
          transcriptText = val;
        },
        handleStartRecording: vi.fn(),
        handlePauseRecording: vi.fn(),
        handleResumeRecording: vi.fn(),
        handleSendForTranscription: vi.fn(),
        handleUploadFileForTranscription: vi.fn(),
        handleEditTranscription: vi.fn(),
        handleSaveTranscription: vi.fn(),
        handleCancelEdit: vi.fn(),
        loadExistingTranscription: vi.fn(async () => {
          const t = await fetchTranscriptById("saved-123");
          if (t) {
            transcriptText = t;
            return t;
          }
          return null;
        }),
      };
    },
  };
});

describe("Transcript retrieval integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("shows previously saved transcript when localStorage has an audioId", async () => {
    const savedTranscript = "Patient reports mild headache for 3 days.";

    // put saved audioId in localStorage
    localStorage.setItem("mt:lastAudioId:1", "saved-123");

    // mock fetchTranscriptById to resolve with transcript text
    fetchTranscriptById.mockResolvedValueOnce(savedTranscript);

    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // transcript text should appear
    await waitFor(() => {
      expect(screen.getByText(/mild headache/)).toBeInTheDocument();
    });

    // placeholder should NOT appear
    expect(
      screen.queryByText(
        /Transcription will appear here after recording is sent for processing/i
      )
    ).not.toBeInTheDocument();
  });
});
