import { DynamicAppointmentCard } from "./DynamicAppointmentCard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Updated interface without status since it's fetched dynamically
interface AppointmentForList {
  id: string;
  patientName: string;
  time: string;
  doctorName: string;
  room: string;
}

interface AppointmentsListProps {
  appointments: AppointmentForList[];
}

export function AppointmentsList({ appointments }: AppointmentsListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleViewDetails = (appointmentId: string) => {
    // Navigate to appointment detail page using React Router
    navigate(`/appointment/${appointmentId}`);
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No appointments scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Today's Appointments</h2>
      {appointments.map((appointment) => (
        <DynamicAppointmentCard
          key={appointment.id}
          appointment={appointment}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
}