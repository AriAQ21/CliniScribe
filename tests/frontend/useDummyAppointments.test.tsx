// This tests:
// 1) Successful load + 24h→12h time formatting
// 2) API error -> error set, list empty
// 3) Network error -> error set, list empty
// 4) Explicit time formatting cases

import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { useDummyAppointments } from "@/hooks/useDummyAppointments";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ✅ stable user reference
const stableUser = { user_id: 123 };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: stableUser }),
}));

beforeAll(() => {
  (import.meta as any).env = {
    ...(import.meta as any).env,
    VITE_API_URL: "http://localhost:8000",
  };
});

describe("useDummyAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches dummy appointments successfully", async () => {
    const fakeResponse = {
      appointments: [
        {
          id: "1",
          patientName: "Linda Lou",
          doctorName: "Dr. Smith",
          room: "Room A",
          date: "2025-08-19",
          time: "09:00",
        },
      ],
    };

    const fetchStub = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useDummyAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.appointments[0].time).toBe("9:00 AM");
  });

  it("handles API error gracefully", async () => {
    const fetchStub = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "err" }),
    } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useDummyAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load appointments");
    expect(result.current.appointments).toHaveLength(0);
  });

  it("handles network error gracefully", async () => {
    const fetchStub = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useDummyAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load appointments");
    expect(result.current.appointments).toHaveLength(0);
  });

  it("formats time correctly from 24h to 12h format", async () => {
    const fakeResponse = {
      appointments: [
        { id: "1", patientName: "Test", doctorName: "Dr. Test", room: "1", date: "2025-08-19", time: "00:00" },
        { id: "2", patientName: "Test", doctorName: "Dr. Test", room: "1", date: "2025-08-19", time: "12:00" },
        { id: "3", patientName: "Test", doctorName: "Dr. Test", room: "1", date: "2025-08-19", time: "15:30" },
      ],
    };

    const fetchStub = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useDummyAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appointments[0].time).toBe("12:00 AM");
    expect(result.current.appointments[1].time).toBe("12:00 PM");
    expect(result.current.appointments[2].time).toBe("3:30 PM");
  });
});
