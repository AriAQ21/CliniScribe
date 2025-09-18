// This tests:
// * Appointment Not Found → /appointment/99999 returns 404 → UI shows “Appointment Not Found” or 404 page.
// * Invalid File Upload → POST /transcribe returns 400 → UI surfaces “Invalid file format”.
// * Backend Connection Failure → /appointments/user/** request aborted → UI shows “failed to load appointments”.

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";
import Dashboard from "@/pages/Dashboard";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

// Mock auth so user exists
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 1 }, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }),
}));

// Mock toast to avoid UI explosions
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Error Handling Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('shows "Appointment Not Found" page for 404', async () => {
    // Mock fetch for details → 404
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Appointment not found" }),
    } as any);

    render(
      <MemoryRouter initialEntries={["/appointment/99999"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/appointment not found|404|page not found/i)
      ).toBeInTheDocument()
    );
  });

  it("shows error message for invalid file upload", async () => {
    global.fetch = vi.fn()
      // upload request fails
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Invalid file format" }),
      } as any);

    render(<AppointmentImportDialog open={true} onOpenChange={vi.fn()} onImportComplete={vi.fn()} />);

    const fileInput = screen.getByRole("presentation").querySelector("input[type='file']")!;
    const file = new File(["bad-data"], "bad.wav", { type: "audio/wav" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const importBtn = screen.getByRole("button", { name: /import appointments/i });
    fireEvent.click(importBtn);

    await waitFor(() =>
      expect(screen.getByText(/invalid file format/i)).toBeInTheDocument()
    );
  });

  it("shows error if appointments list fails to load", async () => {
    // Simulate connection failure
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load appointments|error loading appointments/i)
      ).toBeInTheDocument()
    );
  });
});
