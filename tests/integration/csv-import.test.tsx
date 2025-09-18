This tests:
* Valid CSV → success toast/status message.
* Malformed CSV (invalid date) → validation error message.
* Duplicates → “duplicate skipped” message.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

// Mock hooks
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

// FileReader mock
global.FileReader = class {
  onload: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  readAsArrayBuffer = vi.fn(() => {
    this.onload?.({ target: { result: new ArrayBuffer(0) } } as any);
  });
} as any;

describe("CSV/Excel Import (integration)", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("imports valid CSV successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "3 appointments imported successfully",
        imported: 3,
        total_processed: 3,
        duplicates_skipped: 0,
      }),
    } as any);

    render(<AppointmentImportDialog {...defaultProps} />);

    // Upload CSV file
    const fileInput = screen.getByRole("presentation").querySelector("input[type='file']")!;
    const file = new File(["csv data"], "appointments.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("appointments.csv")).toBeInTheDocument());

    // Trigger import
    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() =>
      expect(defaultProps.onImportComplete).toHaveBeenCalled()
    );
    // You can also assert on toast/status message if surfaced in UI
  });

  it("shows validation error for malformed CSV", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Invalid date format in CSV" }),
    } as any);

    render(<AppointmentImportDialog {...defaultProps} />);

    const fileInput = screen.getByRole("presentation").querySelector("input[type='file']")!;
    const file = new File(["bad data"], "invalid.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("invalid.csv")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid date/i)).toBeInTheDocument()
    );
  });

  it("handles duplicate appointments", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "1 new appointment imported, 1 duplicate skipped",
        imported: 1,
        duplicates_skipped: 1,
        total_processed: 2,
      }),
    } as any);

    render(<AppointmentImportDialog {...defaultProps} />);

    const fileInput = screen.getByRole("presentation").querySelector("input[type='file']")!;
    const file = new File(["csv"], "dupes.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("dupes.csv")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() =>
      expect(screen.getByText(/duplicate/i)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/skipped/i)).toBeInTheDocument()
    );
  });
});
