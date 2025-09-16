// This tests:
// 1) Successful fetch formats times
// 2) API error sets error & empties list
// 3) importAppointments posts then refreshes (3 total fetch calls)

import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { useImportedAppointments } from "@/hooks/useImportedAppointments";

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

describe("useImportedAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches imported appointments successfully", async () => {
    const fakeResponse = {
      appointments: [
        {
          id: "1",
          patientName: "John Doe",
          doctorName: "Dr. Smith",
          room: "Room A",
          date: "2024-01-15",
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

    const { result } = renderHook(() => useImportedAppointments());

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
      json: async () => ({ detail: "oops" }),
    } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useImportedAppointments());

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load imported appointments");
    expect(result.current.appointments).toHaveLength(0);
  });

  it("imports appointments successfully", async () => {
    const mockAppointmentsData = [
      {
        patient_name: "New Patient",
        doctor_name: "Dr. New",
        room: "Room Z",
        appointment_date: "2024-02-01",
        appointment_time: "10:00",
      },
    ];

    // Order: 1) initial GET on mount 2) POST import 3) GET refresh
    const fetchStub = vi
      .fn()
      // initial GET
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ appointments: [] }),
      } as any)
      // POST bulk import
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Import completed successfully" }),
      } as any)
      // refresh GET
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ appointments: [] }),
      } as any);

    // @ts-expect-error test override
    global.fetch = fetchStub;

    const { result } = renderHook(() => useImportedAppointments());

    // wait for initial load
    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));

    // perform import
    await act(async () => {
      await result.current.importAppointments(mockAppointmentsData);
    });

    // After import, refresh should happen
    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(3));
    await act(async () => {});
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
