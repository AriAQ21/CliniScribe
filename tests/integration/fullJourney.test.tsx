import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "@/App";

// --- Polyfill matchMedia BEFORE app renders ---
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// --- Reset path before each test ---
beforeEach(() => {
  window.history.pushState({}, "Test page", "/");
  vi.resetAllMocks();
  localStorage.clear();
});

// --- Mock auth ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { user_id: 1, email: "test@email.com" },
  }),
}));

// --- Mock fetch for appointments + transcription ---
beforeEach(() => {
  global.fetch = vi.fn((url: RequestInfo) => {
    if (typeof url === "string" && url.includes("/appointments")) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 1,
            patient_name: "John Doe",
            appointment_date: "2025-09-18",
            appointment_time: "09:00",
            doctor_name: "Dr. Smith",
            room: "Room 1",
          },
        ],
      } as any);
    }

    if (typeof url === "string" && url.includes("/transcribe")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          audio_id: "a1",
          status: "completed",
          transcript: "Transcript of John Doe visit",
        }),
      } as any);
    }

    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  }) as any;
});

// --- Mock MediaRecorder ---
class MockMediaRecorder {
  public state = "inactive";
  public ondataavailable: ((event: any) => void) | null = null;
  public onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
    setTimeout(() => {
      this.ondataavailable?.(
        { data: new Blob(["fake audio"], { type: "audio/webm" }) }
      );
    }, 0);
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}
beforeEach(() => {
  (global as any).MediaRecorder = MockMediaRecorder;
  (global.navigator.mediaDevices as any) = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  };
});

// --- The actual test ---
describe("Full Clinician Journey (Integration)", () => {
  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    render(<App />);

    // ✅ Dashboard should load with mocked appointment
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    // Step 2: Click "View Details"
    const viewDetailsButton = screen.getByRole("button", {
      name: /view details/i,
    });
    await userEvent.click(viewDetailsButton);

    // ✅ Navigate to appointment detail
    await waitFor(() => {
      expect(window.location.pathname).toMatch(/\/appointment\/\d+/);
    });

    // Step 3: Consent + record
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: /patient has given consent/i,
      })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /start recording/i })
    );
    expect(
      await screen.findByText(/recording in progress/i)
    ).toBeInTheDocument();

    // Step 4: Stop recording
    await userEvent.click(
      screen.getByRole("button", { name: /stop recording/i })
    );

    // Step 5: Transcript appears
    await waitFor(() => {
      expect(
        screen.getByText(/transcript of john doe visit/i)
      ).toBeInTheDocument();
    });

    // Step 6: Edit transcript
    const transcriptBox = screen.getByRole("textbox");
    await userEvent.type(transcriptBox, " Edited");

    // Step 7: Save
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/progress saved/i)).toBeInTheDocument();
    });

    // Step 8: Reload App → transcript should persist (mock localStorage behavior)
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });
  });
});
