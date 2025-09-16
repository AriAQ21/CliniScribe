// This tests: AppointmentDetail page shows correct UI for found vs not found.

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi } from "vitest";

// Mock hooks with alias
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 123 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: null,
    patientData: null,
    loading: false,
    error: "Appointment not found",
  }),
}));

vi.mock("@/hooks/useTranscription", () => ({
  useTranscription: () => ({
    recordingState: "idle",
    hasRecorded: false,
    transcriptionText: "",
    transcriptionSent: false,
    isEditingTranscription: false,
    isProcessing: false,
    isLoadingExistingTranscription: false,
    permissionGranted: true,
    setTranscriptionText: vi.fn(),
    handleStartRecording: vi.fn(),
    handlePauseRecording: vi.fn(),
    handleResumeRecording: vi.fn(),
    handleSendForTranscription: vi.fn(),
    handleUploadFileForTranscription: vi.fn(),
    handleEditTranscription: vi.fn(),
    handleSaveTranscription: vi.fn(),
    handleCancelEdit: vi.fn(),
  }),
}));

test("renders not found message when appointment missing", () => {
  render(
    <MemoryRouter initialEntries={["/appointment/999"]}>
      <Routes>
        <Route path="/appointment/:id" element={<AppointmentDetail />} />
      </Routes>
    </MemoryRouter>
  );

  // Assert specifically against the heading
  expect(
    screen.getByRole("heading", { name: /Appointment Not Found/i })
  ).toBeInTheDocument();
});
