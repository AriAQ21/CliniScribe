// tests/integration/transcription.int.spec.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";

// spies
const mockUploadFileForTranscription = vi.fn();
const mockSendForTranscription = vi.fn();
const mockSaveTranscription = vi.fn();

let isEditing = false;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 1" },
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
    transcriptionText: "Patient reports mild headache.",
    isEditingTranscription: isEditing,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    recordingState: "idle",
    hasRecorded: true,
    handleEditTranscription: () => {
      isEditing = true;
    },
    handleCancelEdit: () => {
      isEditing = false;
    },
    handleSaveTranscription: mockSaveTranscription,
    handleSendForTranscription: () => {
      mockSendForTranscription();
    },
    handleUploadFileForTranscription: () => {
      mockUploadFileForTranscription();
    },
    setTranscriptionText: vi.fn(),
  }),
}));

function TestApp() {
  return (
    <MemoryRouter initialEntries={["/appointments/1"]}>
      <Routes>
        <Route path="/appointments/:id" element={<AppointmentDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Transcription integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isEditing = false;

    // stub media devices for useMicrophoneSelection
    (global.navigator.mediaDevices as any) = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: "mic1", kind: "audioinput", label: "Fake Microphone" },
      ]),
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    };
  });

  it("uploads audio and shows transcript", async () => {
    render(<TestApp />);

    fireEvent.click(screen.getByRole("button", { name: /upload audio/i }));

    const file = new File(["dummy audio"], "test.wav", { type: "audio/wav" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );

    await waitFor(() => {
      expect(mockUploadFileForTranscription).toHaveBeenCalled();
      expect(mockSendForTranscription).toHaveBeenCalled();
    });
  });

  it("edits and saves transcript", async () => {
    render(<TestApp />);
    const transcriptText = "Patient reports mild headache.";

    await screen.findByText(transcriptText);

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockSaveTranscription).toHaveBeenCalled());
  });

  it("cancels transcript edit", async () => {
    render(<TestApp />);
    const transcriptText = "Patient reports mild headache.";

    await screen.findByText(transcriptText);

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved change" } });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.getByText(transcriptText)).toBeInTheDocument()
    );
  });
});
