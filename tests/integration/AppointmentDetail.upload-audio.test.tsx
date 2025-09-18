// * Upload dialog opens.
// * Selecting an audio file updates UI.
// * Clicking "Send for transcription" calls the backend.
// * UI shows "in progress" placeholder.
// * Confirms backend (fetch) was invoked.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { vi } from "vitest";

// --- mocks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 } }),
}));

vi.mock("@/hooks/useAppointmentDetails", () => ({
  useAppointmentDetails: () => ({
    appointment: { id: "1", room: "Room 101" },
    patientData: { name: "John Doe", dateOfBirth: "01/01/1980", nhsNumber: "123" },
    loading: false,
    error: null,
  }),
}));

describe("AppointmentDetail - Upload Audio flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("lets the user upload audio and shows transcription in-progress", async () => {
    // Mock fetch for upload + status poll
    global.fetch = vi
      .fn()
      // upload call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: "upload123", status: "queued" }),
      } as Response)
      // status poll
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "processing" }),
      } as Response);

    render(
      <MemoryRouter initialEntries={["/appointments/1"]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // open dialog
    fireEvent.click(screen.getByRole("button", { name: /upload audio/i }));

    // find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // simulate file selection
    const fakeFile = new File(["dummy-audio"], "test_audio.wav", { type: "audio/wav" });
    fireEvent.change(fileInput!, { target: { files: [fakeFile] } });

    // confirm file is shown
    await waitFor(() => expect(screen.getByText(/file selected/i)).toBeInTheDocument());

    // click send for transcription
    fireEvent.click(screen.getByRole("button", { name: /send for transcription/i }));

    // after mock responses, we should see "in progress" text
    await waitFor(() =>
      expect(
        screen.getByText(/transcription in progress|will appear here/i)
      ).toBeInTheDocument()
    );

    // sanity check: our mock fetch got called
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
