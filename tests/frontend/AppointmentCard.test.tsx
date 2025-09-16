// This tests: Clicking “View Details” on an AppointmentCard navigates correctly.

import { render, screen, fireEvent } from "@testing-library/react";
import { AppointmentCard } from "@/components/AppointmentCard";

test("clicking View Details calls onViewDetails with id", () => {
  const mockFn = vi.fn();
  const fakeAppointment = {
    id: "1",
    patientName: "Sarah Johnson",
    time: "9:00 AM",
    status: "Not started" as const,
    doctorName: "Dr. Smith",
    room: "Room A"
  };

  render(<AppointmentCard appointment={fakeAppointment} onViewDetails={mockFn} />);

  fireEvent.click(screen.getByText(/View Details/i));

  expect(mockFn).toHaveBeenCalledWith("1");
});
