// tests/integration/transcription.int.spec.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import React from "react";
import AppointmentDetail from "@/pages/AppointmentDetail";

// spies
const mockUploadFileForTranscription = vi.fn();
const mockSendForTranscription = vi.fn();
const mockSaveTranscription = vi.fn();

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

// Wrapper so we can control editing state properly
function TranscriptionProviderMock({ children }: { children: React.ReactNode }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [text, setText] = React.useState("Patient reports mild headache.");

  (vi.mockedHooks as any).useTranscription = () => ({
    transcriptionText: text,
    isEditingTranscription: isEditing,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    recordingState: "idle",
    hasRecorded: true,
    handleEditTranscription: () => setIsEditing(true),
    handleCancelEdit: () => setIsEditing(false),
    handleSaveTranscription: (newText: string) => {
      mockSaveTranscription(newText);
      setText(newText);
      setIsEditing(false);
    },
    handleSendForTranscription: () => mockSendForTranscription(),
    handleUploadFileForTranscription: () => mockUploadFileForTranscription(),
    setTranscriptionText: setText,
  });

  return <>{children}</>;
}

const viMock = vi.mock;
const viMockCache: any = {};
viMock("@/hooks/useTranscription", () => ({
  useTranscription: () => viMockCache.useTranscription?.(),
}));
(vi as any).mockedHooks = viMockCache;

function TestApp() {
  return (
    <MemoryRouter initialEntries={["/appointments/1"]}>
      <Routes>
        <Route
          path="/appointments/:id"
          element={
            <TranscriptionProviderMock>
              <AppointmentDetail />
            </TranscriptionProviderMock>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("Transcription integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global.navigator.mediaDevices as any) = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: "mic1", kind: "audioinput", label: "Fake Microphone" },
      ]),
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    };
  });

  it("uploads audio and shows transcript", async () => {
    render(<TestApp />);
    screen.debug(); // 👈 dump DOM at start

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
    screen.debug(); // 👈 confirm transcript is rendered

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );
    screen.debug(); // 👈 confirm textarea shows up

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(mockSaveTranscription).toHaveBeenCalledWith("Edited transcript")
    );
  });

  it("cancels transcript edit", async () => {
    render(<TestApp />);

    const transcriptText = "Patient reports mild headache.";
    await screen.findByText(transcriptText);
    screen.debug(); // 👈 confirm transcript is rendered

    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );
    screen.debug(); // 👈 confirm textarea shows up

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Unsaved change" } });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.getByText(transcriptText)).toBeInTheDocument()
    );
  });
});
