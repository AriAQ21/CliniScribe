import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { useAppointmentStatus } from "@/hooks/useAppointmentStatus";
import type { Appointment, AppointmentStatus } from "./AppointmentCard";

interface DynamicAppointmentCardProps {
  appointment: Omit<Appointment, 'status'>;
  onViewDetails: (id: string) => void;
}

const getStatusColor = (status: AppointmentStatus) => {
  switch (status) {
    case "Not started":
      return "bg-status-not-started text-white";
    case "Transcribing":
      return "bg-status-recording text-white";
    case "Transcribed":
      return "bg-status-transcribed text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function DynamicAppointmentCard({ appointment, onViewDetails }: DynamicAppointmentCardProps) {
  const { status, loading } = useAppointmentStatus(appointment.id);

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" />
                {appointment.patientName}
              </div>
              {loading ? (
                <Badge variant="secondary" className="animate-pulse">
                  Loading...
                </Badge>
              ) : (
                <Badge className={getStatusColor(status)}>
                  {status}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{appointment.time}</span>
            </div>
          </div>
          
          <Button 
            onClick={() => onViewDetails(appointment.id)}
            className="ml-4"
            variant="outline"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}