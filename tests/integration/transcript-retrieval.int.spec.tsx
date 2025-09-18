// tests/integration/transcript-retrieval.int.spec.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";

describe("Transcript retrieval integration", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("shows previously saved transcript when localStorage has an audioId", async () => {
    const savedTranscript = "Patient reports mild headache for 3 days.";

    // Put saved audioId in localStorage
    localStorage.setItem("mt:lastAudioId:1", "saved-123");

    // Mock auth
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({ user: { user_id: 1 } }),
    }));

    // Mock appointment details
    vi.doMock("@/hooks/useAppointmentDetails", () => ({
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

    // Mock transcription
    vi.doMock("@/hooks/useTranscription", () => ({
      useTranscription: () => ({
        transcriptionText: savedTranscript,
        isEditingTranscription: false,
        isProcessing: false,
        isLoadingExistingTranscription: false,
        transcriptionSent: true,
        handleEditTranscription: vi.fn(),
        handleSaveTranscription: vi.fn(),
        handleCancelEdit: vi.fn(),
        setTranscriptionText: vi.fn(),
        loadExistingTranscription: vi.fn().mockResolvedValue(savedTranscript),
      }),
    }));

    const { default: AppointmentDetailComponent } = await import(
      "@/pages/AppointmentDetail"
    );

    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetailComponent />} />
        </Routes>
      </MemoryRouter>
    );

    // transcript text should appear
    await waitFor(() => {
      expect(
        screen.getByText(/mild headache/i)
      ).toBeInTheDocument();
    });

    // placeholder should NOT appear
    expect(
      screen.queryByText(
        /Transcription will appear here after recording is sent for processing/i
      )
    ).not.toBeInTheDocument();
  });
});
