// This tests:
// 1) Successful load transforms/stores appointments
// 2) API error sets error and empties list

import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { useAppointments } from "@/hooks/useAppointments";

// ✅ stable user reference to avoid re-renders changing dependency identity
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

describe("useAppointments hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads appointments successfully", async () => {
    const fakeResponse = {
      appointments: [
        {
          id: "1",
          patientName: "Linda Lou",
          doctorName: "Dr. Smith",
          date: "2025-08-19",
          time: "09:00",
        },
      ],
    };

    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fakeResponse,
      } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {}); // flush microtasks
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.appointments).toHaveLength(1);
  });

  it("handles API error gracefully", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "boom" }),
      } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {}); // flush microtasks
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load appointments");
    expect(result.current.appointments).toHaveLength(0);
  });
});
