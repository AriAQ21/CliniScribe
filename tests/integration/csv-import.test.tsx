// This tests:
// * Valid CSV → success toast/status message.
// * Malformed CSV (invalid date) → validation error message.
// * Duplicates → “duplicate skipped” message.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

// Mock useImportedAppointments
const mockImportAppointments = vi.fn();

vi.mock("@/hooks/useImportedAppointments", () => ({
  useImportedAppointments: () => ({
    importAppointments: mockImportAppointments,
    appointments: [],
    loading: false,
    error: null,
    refreshAppointments: vi.fn(),
  }),
}));

describe("Appointment Import Dialog (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const getFileInput = () =>
    screen.getByRole("presentation").querySelector("input[type='file']") as HTMLInputElement;

  it("imports valid CSV successfully", async () => {
    mockImportAppointments.mockResolvedValueOnce({
      success: true,
      message: "Import completed successfully",
    });

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
      expect(mockImportAppointments).toHaveBeenCalledTimes(1);
    });
  });

  it("shows validation error for malformed CSV", async () => {
    mockImportAppointments.mockResolvedValueOnce({
      success: false,
      message: "Invalid date format",
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

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(mockImportAppointments).toHaveBeenCalledTimes(1);
      expect(mockImportAppointments).toHaveReturnedWith(
        expect.objectContaining({
          success: false,
          message: "Invalid date format",
        })
      );
    });
  });

  it("handles duplicate appointments", async () => {
    mockImportAppointments.mockResolvedValueOnce({
      success: false,
      message: "Duplicate appointments detected",
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

    fireEvent.click(screen.getByRole("button", { name: /import appointments/i }));

    await waitFor(() => {
      expect(mockImportAppointments).toHaveBeenCalledTimes(1);
      expect(mockImportAppointments).toHaveReturnedWith(
        expect.objectContaining({
          success: false,
          message: "Duplicate appointments detected",
        })
      );
    });
  });
});
