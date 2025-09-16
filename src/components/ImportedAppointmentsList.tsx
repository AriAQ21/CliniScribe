import { DynamicAppointmentCard } from "./DynamicAppointmentCard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Same interface as original AppointmentsList but for imported data
interface ImportedAppointmentForList {
  id: string;
  patientName: string;
  time: string;
  doctorName: string;
  room: string;
  date?: string; // Optional date field for imported appointments
}

interface ImportedAppointmentsListProps {
  appointments: ImportedAppointmentForList[];
}

export function ImportedAppointmentsList({ appointments }: ImportedAppointmentsListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleViewDetails = (appointmentId: string) => {
    // Navigate to appointment detail page using React Router
    navigate(`/appointment/${appointmentId}`);
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No imported appointments found for this date</p>
        <p className="text-muted-foreground text-sm mt-2">Import appointments using the button above to get started</p>
      </div>
    );
  }

  // Sort appointments by time (TODO: Add proper time sorting logic)
  const sortedAppointments = [...appointments].sort((a, b) => {
    // Add time comparison logic here
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Imported Appointments ({appointments.length})
      </h2>
      {sortedAppointments.map((appointment) => (
        <DynamicAppointmentCard
          key={appointment.id}
          appointment={appointment}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
}