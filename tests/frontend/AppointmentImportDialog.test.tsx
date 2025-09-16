import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { AppointmentImportDialog } from "@/components/AppointmentImportDialog";

// --- Hoisted mocks ---
const { mockPapaParse, mockXlsxRead, mockSheetToJson } = vi.hoisted(() => ({
  mockPapaParse: vi.fn(),
  mockXlsxRead: vi.fn(() => ({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } })),
  mockSheetToJson: vi.fn(() => [
    { "Patient Name": "John Doe", "Date": "2025-01-15", "Time": "09:00" },
  ]),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "test-user" } }),
}));

vi.mock("papaparse", () => ({
  default: { parse: mockPapaParse },
}));

vi.mock("xlsx", () => ({
  read: mockXlsxRead,
  utils: { sheet_to_json: mockSheetToJson },
}));

// FileReader mock
global.FileReader = class {
  onload: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  readAsArrayBuffer = vi.fn(() => {
    this.onload?.({ target: { result: new ArrayBuffer(0) } } as any);
  });
} as any;

describe("AppointmentImportDialog", () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default CSV parse return (header: true -> array of objects)
    mockPapaParse.mockImplementation((_file, options: any) => {
      options.complete?.({
        data: [{ "Patient Name": "John Doe", "Date": "2025-01-15", "Time": "09:00" }],
        errors: [],
        meta: { fields: ["Patient Name", "Date", "Time"] },
      });
    });
  });

  it("renders import dialog with correct content", () => {
    render(<AppointmentImportDialog {...mockProps} />);
    expect(screen.getByRole("heading", { name: /import appointments/i })).toBeInTheDocument();
    expect(
      screen.getByText(/drag & drop your csv or excel file here, or click to browse/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/supports \.csv, \.xls, \.xlsx files/i)).toBeInTheDocument();
  });

  it("processes CSV file correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ imported: 1, total_processed: 1 }),
    } as any);

    render(<AppointmentImportDialog {...mockProps} />);

    const fileInput = screen
      .getByRole("presentation")
      .querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["csv"], "test.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("test.csv")).toBeInTheDocument());

    const importBtn = screen.getByRole("button", { name: /import appointments/i });
    fireEvent.click(importBtn);

    await waitFor(() => expect(mockProps.onImportComplete).toHaveBeenCalled());
  });
});
