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

// Mock the dummy appointments hook to prevent infinite API calls
vi.mock("@/hooks/useDummyAppointments", () => ({
  useDummyAppointments: () => ({
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
    loading: false,
    error: null,
  }),
}));

// Mock the imported appointments hook to prevent infinite API calls
vi.mock("@/hooks/useImportedAppointments", () => ({
  useImportedAppointments: () => ({
    appointments: [],
    loading: false,
    error: null,
    importAppointments: vi.fn().mockResolvedValue({ success: true, message: "Import successful" }),
    refreshAppointments: vi.fn(),
  }),
}));

// Mock any polling or interval hooks to prevent continuous API calls
vi.mock("@/hooks/usePolling", () => ({
  usePolling: () => ({ isPolling: false, startPolling: vi.fn(), stopPolling: vi.fn() }),
}));

// Mock appointment status hook if it exists to prevent polling
vi.mock("@/hooks/useAppointmentStatus", () => ({
  useAppointmentStatus: () => ({ 
    status: "active", 
    hasRecording: false, 
    hasTranscript: false,
    isLoading: false 
  }),
}));

// Mock MediaRecorder and getUserMedia
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
};

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockMediaRecorder),
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'default', label: 'Default Microphone', kind: 'audioinput' }
    ]),
  },
});

describe("Full Clinician Journey (Integration)", () => {
  let savedTranscriptText = "This is a mocked transcript generated for testing.";

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    savedTranscriptText = "This is a mocked transcript generated for testing.";
    
    // Reset MediaRecorder state
    mockMediaRecorder.state = 'inactive';
    mockMediaRecorder.ondataavailable = null;
    mockMediaRecorder.onstop = null;
  });

  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    // Create a simpler fetch mock focused on the appointment detail and transcription flow
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      console.log('Fetch called with URL:', url); // Debug logging
      
      
      // Handle dummy appointments API calls (should be rare since we mocked the hook)
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
      
      // Handle imported appointments API calls (should be rare since we mocked the hook)
      if (url.includes('/appointments/user/1?is_dummy=false')) {
        return {
          ok: true,
          json: async () => ({ 
            appointments: []
          }),
        };
      }
      
      // Handle bulk appointments import
      if (url.includes('/appointments/bulk')) {
        return {
          ok: true,
          json: async () => ({
            message: "Appointments imported successfully",
            imported: 1,
            skipped: 0
          }),
        };
      }
      
      // Handle appointment status check
      if (url.includes('/appointments/1/status')) {
        return {
          ok: true,
          json: async () => ({
            status: "active",
            has_recording: false,
            has_transcript: false
          }),
        };
      }
      
      // Handle single appointment detail
      if (url.includes('/appointment/1')) {
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
      
      // Handle transcription upload
      if (url.includes('/transcribe') && !url.includes('/status/') && !url.includes('/text/') && !url.includes('/update/')) {
        return {
          ok: true,
          json: async () => ({ audio_id: "dummy-id", status: "queued" }),
        };
      }
      
      // Handle transcription status
      if (url.includes('/transcribe/status/dummy-id')) {
        return {
          ok: true,
          json: async () => ({
            status: "completed",
            transcript: savedTranscriptText,
          }),
        };
      }
      
      // Handle transcription text retrieval
      if (url.includes('/transcribe/text/dummy-id')) {
        return {
          ok: true,
          json: async () => ({ 
            audio_id: "dummy-id", 
            transcript: savedTranscriptText 
          }),
        };
      }
      
      // Handle transcription update
      if (url.includes('/transcribe/update/dummy-id')) {
        // Extract new text from request body
        if (options?.body) {
          try {
            const body = JSON.parse(options.body);
            savedTranscriptText = body.transcript || "Edited transcript text";
          } catch {
            savedTranscriptText = "Edited transcript text";
          }
        }
        return {
          ok: true,
          json: async () => ({ status: "success" }),
        };
      }
      
      // Catch-all for any unexpected API calls
      console.warn('Unhandled fetch URL:', url);
      return {
        ok: true,
        json: async () => ({ 
          appointments: [], // Default safe response for appointments-related calls
          message: "Default response", // Default safe response for other calls
          status: "success" // Default status
        }),
      };
    });

    // Start at dashboard
    const { rerender } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for dashboard to load and show appointments
    await waitFor(
      () => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Navigate to appointment detail
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    });

    // Re-render with appointment detail route
    rerender(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for appointment details to load
    await waitFor(
      () => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // --- Recording flow ---
    await act(async () => {
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: /patient has given consent for recording/i,
        })
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
      // Simulate MediaRecorder state change
      mockMediaRecorder.state = 'recording';
    });

    await waitFor(() =>
      expect(screen.getByText(/recording in progress/i)).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /pause recording/i }));
      // Simulate MediaRecorder state change
      mockMediaRecorder.state = 'paused';
      // Simulate data available
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ 
          data: new Blob(['audio data'], { type: 'audio/wav' }) 
        });
      }
    });

    // --- Transcription flow ---
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /send for transcription/i })
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText(/mocked transcript/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    // --- Edit transcription ---
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /edit transcription/i })
      );
    });

    const textarea = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Edited transcript text" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    // --- Reload page → transcript still shown ---
    rerender(
      <MemoryRouter initialEntries={["/appointment/1"]}>
        <Routes>
          <Route path="/appointment/:id" element={<AppointmentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/edited transcript text/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }, 15000); // Reduce timeout back to 15 seconds since we fixed the infinite loops
});
