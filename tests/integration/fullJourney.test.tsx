// tests/integration/fullJourney.test.tsx
// This tests:
// * Login → Dashboard → appointments visible
// * Open an appointment detail
// * Give consent → start recording → pause recording
// * Send for transcription → mocked transcript appears
// * Edit transcript → save
// * Reload page → saved transcript still displayed

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import Dashboard from "@/pages/Index";
import AppointmentDetail from "@/pages/AppointmentDetail";

// Mock MediaRecorder for audio recording
class MockMediaRecorder {
  public state = "inactive";
  public ondataavailable: ((event: any) => void) | null = null;
  public onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(["audio data"], { type: "audio/wav" }) });
    }, 0);
  }

  stop() {
    this.state = "inactive";
    setTimeout(() => this.onstop?.(), 0);
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }
}

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
  let fetchCallCount = 0;
  let savedTranscriptText = "This is a mocked transcript generated for testing.";

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    fetchCallCount = 0;
    savedTranscriptText = "This is a mocked transcript generated for testing.";

    // Mock MediaRecorder
    (global as any).MediaRecorder = MockMediaRecorder;
    
    // Mock getUserMedia
    (global.navigator.mediaDevices as any) = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    };
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    // Create a more sophisticated fetch mock that handles the sequence properly
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCallCount++;
      
      // Handle different API calls based on URL pattern
      if (url.includes('/appointments/user/1?is_dummy=false')) {
        return {
          ok: true,
          json: async () => ({ appointments: [] }),
        };
      }
      
      if (url.includes('/appointments/user/1?is_dummy=true')) {
        return {
          ok: true,
          json: async () => ({
            appointments: [
              {
                id: "1",
                patientName: "John Doe",
                doctorName: "Dr. Smith",
                date: "2025-08-19",
                time: "09:00:00",
                room: "Room 1",
              },
            ],
          }),
        };
      }
      
      if (url.includes('/appointments/user/1') && !url.includes('is_dummy')) {
        return {
          ok: true,
          json: async () => ({
            appointments: [
              {
                id: "1",
                patientName: "John Doe",
                doctorName: "Dr. Smith",
                date: "2025-08-19",
                time: "09:00:00",
                room: "Room 1",
              },
            ],
          }),
        };
      }
      
      if (url.includes('/appointments/1')) {
        return {
          ok: true,
          json: async () => ({
            appointment_id: 1,
            patient_name: "John Doe",
            doctor_name: "Dr. Smith",
            room: "Room 1",
            appointment_date: "2025-08-19",
            appointment_time: "09:00:00",
            user_id: 1,
          }),
        };
      }
      
      if (url.includes('/transcribe/text/dummy-id')) {
        return {
          ok: true,
          json: async () => ({ transcript: savedTranscriptText }),
        };
      }
      
      if (url.includes('/transcribe/status/dummy-id')) {
        return {
          ok: true,
          json: async () => ({
            status: "completed",
            transcript: savedTranscriptText,
          }),
        };
      }
      
      if (url.includes('/transcribe/update/dummy-id')) {
        // Extract new text from FormData (simplified for test)
        savedTranscriptText = "Edited transcript text";
        return {
          ok: true,
          json: async () => ({ status: "success" }),
        };
      }
      
      if (url.includes('/transcribe') && !url.includes('status') && !url.includes('text')) {
        return {
          ok: true,
          json: async () => ({ audio_id: "dummy-id", status: "queued" }),
        };
      }
      
      // Default fallback
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      };
    });

    // Render the full app with routing
    const { rerender } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for dashboard to load and show appointments
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to appointment detail by clicking view details button
    const viewDetailsButton = await screen.findByRole("button", { name: /view details/i });
    fireEvent.click(viewDetailsButton);

    // Re-render with appointment detail route
    rerender(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for appointment details to load
    await waitFor(() => {
      expect(screen.getByText(/appointment details/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Give consent for recording
    const consentCheckbox = await screen.findByRole("checkbox", {
      name: /patient has given consent for recording/i,
    });
    
    await act(async () => {
      fireEvent.click(consentCheckbox);
    });

    // Start recording
    const startButton = await screen.findByRole("button", { name: /start recording/i });
    
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait for recording to start
    await waitFor(() => {
      expect(screen.getByText(/recording in progress/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Pause recording
    const pauseButton = await screen.findByRole("button", { name: /pause recording/i });
    
    await act(async () => {
      fireEvent.click(pauseButton);
    });

    // Send for transcription
    const sendButton = await screen.findByRole("button", { name: /send for transcription/i });
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for transcript to appear
    await waitFor(() => {
      expect(screen.getByText(/mocked transcript/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    // Edit transcription
    const editButton = await screen.findByRole("button", { name: /edit transcription/i });
    
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Change transcript text
    const textarea = await screen.findByRole("textbox");
    
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Edited transcript text" } });
    });

    // Save changes
    const saveButton = await screen.findByRole("button", { name: /save/i });
    
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Simulate page reload by re-rendering with fresh component
    rerender(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify edited transcript persists after reload
    await waitFor(() => {
      expect(screen.getByText(/edited transcript text/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
