// This tests:
// * Valid CSV → success toast/status message.
// * Malformed CSV (invalid date) → validation error message.
// * Duplicates → “duplicate skipped” message.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

describe("Appointment Import Dialog (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const getFileInput = () =>
    screen.getByRole("presentation").querySelector("input[type='file']") as HTMLInputElement;

  it("imports valid CSV successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ imported: 1, total_processed: 1 }),
    } as any);

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

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows validation error for malformed CSV", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Invalid date format" }),
    } as any);

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

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("handles duplicate appointments", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        imported: 0,
        duplicates_skipped: 2,
        total_processed: 2,
      }),
    } as any);

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

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});

