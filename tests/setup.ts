import { vi } from "vitest";
import "@testing-library/jest-dom"; // extra matchers like toBeInTheDocument

// --- Ensure import.meta.env exists (used by hooks reading VITE_API_URL) ---
;(import.meta as any).env = {
  ...(import.meta as any).env,
  VITE_API_URL:
    (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000",
};

// --- Mock navigator.mediaDevices for microphone tests ---
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// --- Conditionally mock fetch (disable with MOCK_FETCH=0) ---
const shouldMockFetch = process.env.MOCK_FETCH !== "0";

// Keep a reference to restore or for debugging if needed
const realFetch = global.fetch;

if (shouldMockFetch) {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    // Minimal router to satisfy hooks’ expectations in unit tests
    // Feel free to extend if you add more endpoints.
    if (url.match(/\/appointments\/user\/.+\?is_dummy=false$/)) {
      // useImportedAppointments expects { appointments: [...] }
      return {
        ok: true,
        status: 200,
        json: async () => ({ appointments: [] }),
        text: async () => JSON.stringify({ appointments: [] }),
      } as any;
    }

    // GET /appointments/:id/details
    const detailsMatch = url.match(/\/appointments\/(\d+)\/details$/);
    if (detailsMatch && (!init || init.method === undefined || init.method === "GET")) {
      const id = Number(detailsMatch[1]);
      if (id === 404 || id === 999) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ detail: "Not found" }),
          text: async () => "Not found",
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          appointment_id: id,
          patient_name: "Test Patient",
          doctor_name: "Dr. Who",
          room: "Room A",
          appointment_date: "2025-01-01",
          appointment_time: "09:00:00",
          user_id: 1,
        }),
        text: async () => "",
      } as any;
    }

    // POST /appointments/bulk
    if (url.endsWith("/appointments/bulk") && init?.method === "POST") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ imported: 1, total_processed: 1, message: "OK" }),
        text: async () => JSON.stringify({ imported: 1, total_processed: 1 }),
      } as any;
    }

    // Default OK fallback
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    } as any;
  }) as any;
}

// --- Mock global timers (avoid infinite recursion) ---
global.setInterval = vi.fn().mockImplementation(() => 1 as any);
global.clearInterval = vi.fn();

// --- Mock useNavigate so hooks using it won’t crash if no Router is wrapped ---
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Optional: expose the real fetch for tests that want to temporarily use it
Object.assign(global, { __REAL_FETCH__: realFetch });
