// tests/frontend/useAppointmentDetails.test.tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";

beforeAll(() => {
  (import.meta as any).env = {
    ...(import.meta as any).env,
    VITE_API_URL: "http://localhost:8000",
  };
});

describe("useAppointmentDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches appointment details successfully", async () => {
    const fakeResponse = {
      appointment_id: 1,
      patient_name: "Sarah Johnson",
      doctor_name: "Dr. Smith",
      room: "Room A",
      appointment_date: "2025-08-19",
      appointment_time: "09:00:00",
      user_id: 123,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
      text: async () => JSON.stringify(fakeResponse),
    } as any);

    const { result } = renderHook(() => useAppointmentDetails("1"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => { /* microtask */ });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.appointment?.patient_name).toBe("Sarah Johnson");
  });

  it("handles not found response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not found" }),
      text: async () => "Not found",
    } as any);

    const { result } = renderHook(() => useAppointmentDetails("999"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => { /* microtask */ });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Appointment not found");
    expect(result.current.appointment).toBeNull();
  });
});
