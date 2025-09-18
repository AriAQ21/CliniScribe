import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "@/App";

// Mock useAuth with full shape expected by useDummyUser
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      user_id: 1,
      email: "clinician@test.com",
      first_name: "Test",
      last_name: "Clinician",
    },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock appointment status hook
vi.mock("@/hooks/useAppointmentStatus", () => ({
  useAppointmentStatus: () => ({
    status: "Not started",
    loading: false,
  }),
}));

// Mock recording service
vi.mock("@/services/recordingService", () => ({
  startRecording: vi.fn(),
  stopRecording: vi.fn(() => Promise.resolve("dummy-transcript")),
}));

// Mock transcript save service
vi.mock("@/services/transcriptService", () => ({
  saveTranscript: vi.fn(() => Promise.resolve(true)),
}));

describe("Full Clinician Journey (Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    // Render the full app (already has BrowserRouter inside)
    render(<App />);

    // Step 1: Dashboard should load
    await waitFor(() => {
      expect(
        screen.getByText(/scheduled appointments/i)
      ).toBeInTheDocument();
    });

    // Step 2: Navigate to appointment detail
    fireEvent.click(screen.getByText(/view details/i));

    await waitFor(() => {
      expect(
        screen.getByText(/appointment details/i)
      ).toBeInTheDocument();
    });

    // Step 3: Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /stop recording/i })
      ).toBeInTheDocument();
    });

    // Step 4: Stop recording → transcript generated
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));
    await waitFor(() => {
      expect(screen.getByText(/dummy-transcript/i)).toBeInTheDocument();
    });

    // Step 5: Edit transcript
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited transcript" } });
    expect(textarea).toHaveValue("Edited transcript");

    // Step 6: Save transcript
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/transcript saved/i)
      ).toBeInTheDocument();
    });

    // Step 7: Simulate reload back to dashboard
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(/scheduled appointments/i)
      ).toBeInTheDocument();
    });
  });
});
