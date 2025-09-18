// This tests:
// * Login → Dashboard → appointments visible
// * Open an appointment detail
// * Give consent → start recording → pause recording
// * Send for transcription → mocked transcript appears
// * Edit transcript → save
// * Reload page → saved transcript still displayed

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import Dashboard from "@/pages/Index";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mocks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { user_id: 1 },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Full Clinician Journey (Integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    // Mock API responses for the full journey
    global.fetch = vi.fn()
      // Dashboard appointments
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          appointments: [
            {
              id: "1",
              patientName: "John Doe",
              doctorName: "Dr. Smith",
              date: "2025-08-19",
              time: "09:00",
              room: "Room 1",
            },
          ],
        }),
      } as any)
      // Appointment details
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          appointment: {
            id: "1",
            patientName: "John Doe",
            doctorName: "Dr. Smith",
            room: "Room 1",
          },
        }),
      } as any)
      // Upload transcription
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_id: "dummy-id", status: "queued" }),
      } as any)
      // Poll transcription result
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "completed",
          transcript: "This is a mocked transcript generated for testing.",
        }),
      } as any)
      // Save edited transcription
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "success" }),
      } as any)
      // Reload GET transcript
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transcript: "Edited transcript text" }),
      } as any);

    // Start at dashboard
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // --- Dashboard shows appointment ---
    expect(await screen.findByText(/john doe/i)).toBeInTheDocument();

    // Click into appointment detail
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Ensure AppointmentDetail is loaded
    expect(
      await screen.findByText(/appointment details/i)
    ).toBeInTheDocument();

    // --- Recording flow ---
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /patient has given consent for recording/i,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByText(/recording in progress/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));

    // --- Transcription flow ---
    fireEvent.click(
      screen.getByRole("button", { name: /send for transcription/i })
    );
    expect(
      await screen.findByText(/mocked transcript/i)
    ).toBeInTheDocument();

    // --- Edit transcription ---
    fireEvent.click(
      screen.getByRole("button", { name: /edit transcription/i })
    );
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript text" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // --- Reload page → transcript still shown ---
    render(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/edited transcript text/i)
    ).toBeInTheDocument();
  });
});
