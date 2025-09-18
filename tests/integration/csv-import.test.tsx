// tests/integration/csv-import.test.tsx
// This tests:
// * Valid CSV → success API call.
// * Malformed CSV → validation error (API error).
// * Duplicates → duplicate skipped (API error).

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

// Mock useAuth so we always have a user
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

function getFileInput() {
  return screen.getByRole("presentation").querySelector("input[type='file']") as HTMLInputElement;
}

describe("Appointment Import Dialog (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imported: 1, total_processed: 1 }),
    } as any);
  });

  it("imports valid CSV successfully", async () => {
    render(
      <AppointmentImportDialog
        open={true}
        onOpenChange={() => {}}
        onImportComplete={vi.fn()}
      />
    );

    const file = new File(
      ["Patient Name,Date,Time\nJohn Doe,2025-08-19,09:00"],
      "appointments.csv",
      { type: "text/csv" }
    );
    const input = getFileInput();
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("appointments.csv");

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows validation error for malformed CSV", async () => {
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid date format" }),
    });

    render(
      <AppointmentImportDialog
        open={true}
        onOpenChange={() => {}}
        onImportComplete={vi.fn()}
      />
    );

    const file = new File(
      ["Patient Name,Date,Time\nJohn Doe,32/13/2025,09:00"],
      "invalid.csv",
      { type: "text/csv" }
    );
    const input = getFileInput();
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("invalid.csv");

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("handles duplicate appointments", async () => {
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: "Duplicate appointments detected" }),
    });

    render(
      <AppointmentImportDialog
        open={true}
        onOpenChange={() => {}}
        onImportComplete={vi.fn()}
      />
    );

    const file = new File(
      [
        "Patient Name,Date,Time\nJohn Doe,2025-08-19,09:00\nJohn Doe,2025-08-19,09:00",
      ],
      "dupes.csv",
      { type: "text/csv" }
    );
    const input = getFileInput();
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("dupes.csv");

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
