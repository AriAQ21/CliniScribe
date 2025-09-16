import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { useAppointmentStatus } from "@/hooks/useAppointmentStatus";

// Ensure env exists for URL building
beforeAll(() => {
  (import.meta as any).env = {
    ...(import.meta as any).env,
    VITE_API_URL: "http://localhost:8000",
  };
});

describe("useAppointmentStatus", () => {
  // Preserve global implementations from setup; just clear call counts
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches appointment status on mount", async () => {
    const body = { status: "In progress" };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as any);

    const { result } = renderHook(() => useAppointmentStatus("123"));

    // Ensure the effect actually ran
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // (Optional) sanity-check the URL if helpful
    // expect(global.fetch).toHaveBeenCalledWith(
    //   "http://localhost:8000/appointments/123/status",
    //   expect.anything()
    // );

    // Give React a microtask to flush setState after the async effect
    await act(async () => {});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe("In progress");
  });

  it("handles API error gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Server error" }),
      text: async () => "Server error",
    } as any);

    const { result } = renderHook(() => useAppointmentStatus("123"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status).toBe("Not started");
  });

  it("handles network error gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAppointmentStatus("123"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status).toBe("Not started");
  });
});
