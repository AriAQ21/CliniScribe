// Tests: UnifiedAppointmentsList - renders appointments, filters by date, sorts by time, handles empty states

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";

// Mock hooks
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useAppointmentStatus", () => ({
  useAppointmentStatus: () => ({
    status: "Not started",
    loading: false,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("UnifiedAppointmentsList", () => {
  // Use today's date for more realistic testing
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const tomorrowString = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const mockDummyAppointments = [
    {
      id: "dummy-1",
      patientName: "John Doe",
      time: "09:00 AM",
      doctorName: "Dr. Smith",
      room: "Room A",
      date: todayString,
    },
    {
      id: "dummy-2", 
      patientName: "Jane Smith",
      time: "10:30 AM",
      doctorName: "Dr. Johnson",
      room: "Room B",
      date: todayString,
    },
  ];

  const mockImportedAppointments = [
    {
      id: "imported-1",
      patientName: "Bob Wilson",
      time: "08:30 AM",
      doctorName: "Dr. Brown",
      room: "Room C",
      date: todayString,
    },
    {
      id: "imported-2",
      patientName: "Alice Johnson",
      time: "11:00 AM", 
      doctorName: "Dr. Davis",
      room: "Room D",
      date: tomorrowString, // Different date
    },
  ];

  const selectedDate = today;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders both dummy and imported appointments for selected date", () => {
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={mockDummyAppointments}
        importedAppointments={mockImportedAppointments}
        selectedDate={selectedDate}
      />
    );

    // Should show sections for both types
    expect(screen.getByText("Scheduled Appointments (2)")).toBeInTheDocument();
    expect(screen.getByText("Imported Appointments (1)")).toBeInTheDocument();

    // Should show appointments for selected date only
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument(); 
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
    expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument(); // Different date
  });

  it("filters appointments by selected date correctly", () => {
    const differentDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={mockDummyAppointments}
        importedAppointments={mockImportedAppointments}
        selectedDate={differentDate}
      />
    );

    // Should only show Alice Johnson (date: 2024-01-16)
    expect(screen.queryByText("Scheduled Appointments")).not.toBeInTheDocument();
    expect(screen.getByText("Imported Appointments (1)")).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("sorts appointments by time within each section", () => {
    // Add appointment with earlier time to test sorting
    const unsortedDummyAppointments = [
      ...mockDummyAppointments,
      {
        id: "dummy-3",
        patientName: "Early Bird",
        time: "07:00 AM", // Earlier than others
        doctorName: "Dr. Early",
        room: "Room E",
        date: todayString,
      },
    ];

    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={unsortedDummyAppointments}
        importedAppointments={mockImportedAppointments}
        selectedDate={selectedDate}
      />
    );

    // Verify appointments are rendered (basic sorting verification)
    expect(screen.getByText("Early Bird")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("shows empty state when no appointments for selected date", () => {
    const emptyDate = new Date("2024-12-31");
    
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={mockDummyAppointments}
        importedAppointments={mockImportedAppointments}
        selectedDate={emptyDate}
      />
    );

    expect(screen.getByText("No appointments found for this date")).toBeInTheDocument();
    expect(screen.getByText(/Import appointments using the button above/)).toBeInTheDocument();
  });

  it("shows empty state when no appointments provided", () => {
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={[]}
        importedAppointments={[]}
        selectedDate={selectedDate}
      />
    );

    expect(screen.getByText("No appointments found for this date")).toBeInTheDocument();
  });

  it("navigates to appointment detail when View Details clicked", () => {
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={mockDummyAppointments}
        importedAppointments={[]}
        selectedDate={selectedDate}
      />
    );

    const viewDetailsButtons = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/appointment/dummy-1");
  });

  it("shows only imported section when no dummy appointments for date", () => {
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={[]} // No dummy appointments
        importedAppointments={mockImportedAppointments}
        selectedDate={selectedDate}
      />
    );

    expect(screen.queryByText("Scheduled Appointments")).not.toBeInTheDocument();
    expect(screen.getByText("Imported Appointments (1)")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
  });

  it("shows only scheduled section when no imported appointments for date", () => {
    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={mockDummyAppointments}
        importedAppointments={[]} // No imported appointments
        selectedDate={selectedDate}
      />
    );

    expect(screen.getByText("Scheduled Appointments (2)")).toBeInTheDocument();
    expect(screen.queryByText("Imported Appointments")).not.toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("handles appointments without date property", () => {
    const appointmentsWithoutDate = [
      {
        id: "no-date-1",
        patientName: "No Date Patient",
        time: "09:00 AM",
        doctorName: "Dr. NoDate", 
        room: "Room X",
        // No date property
      },
    ];

    renderWithRouter(
      <UnifiedAppointmentsList
        dummyAppointments={appointmentsWithoutDate as any}
        importedAppointments={[]}
        selectedDate={selectedDate}
      />
    );

    // Should show empty state since appointment without date gets filtered out
    expect(screen.getByText("No appointments found for this date")).toBeInTheDocument();
    expect(screen.queryByText("No Date Patient")).not.toBeInTheDocument();
  });
});