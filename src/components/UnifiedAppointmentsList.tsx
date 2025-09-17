import { DynamicAppointmentCard } from "./DynamicAppointmentCard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AppointmentForList {
  id: string;
  patientName: string;
  time: string;
  doctorName: string;
  room: string;
  date?: string;
}

interface UnifiedAppointmentsListProps {
  dummyAppointments: AppointmentForList[];
  importedAppointments: AppointmentForList[];
  selectedDate: Date;
}

export function UnifiedAppointmentsList({ 
  dummyAppointments, 
  importedAppointments, 
  selectedDate 
}: UnifiedAppointmentsListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleViewDetails = (appointmentId: string) => {
    navigate(`/appointment/${appointmentId}`);
  };

  // --- Only allow dummy appointments if selected date is "today"
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedDateOnly = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );

  const filteredDummyAppointments = dummyAppointments.filter(apt => {
    if (!apt.date) return false;
    return selectedDateOnly.getTime() === todayOnly.getTime();
  });

  // --- Imported appointments: filter by selected date
  const filteredImportedAppointments = importedAppointments.filter(apt => {
    if (!apt.date) return false;
    const appointmentDate = new Date(apt.date);
    const appointmentDateOnly = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate()
    );
    return appointmentDateOnly.getTime() === selectedDateOnly.getTime();
  });

  // Merge both
  const allAppointments = [...filteredDummyAppointments, ...filteredImportedAppointments];

  // Sort by time
  const sortedAppointments = [...allAppointments].sort(
    (a, b) => a.time.localeCompare(b.time)
  );

  if (sortedAppointments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No appointments found for this date
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Import appointments using the button above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">
        Scheduled Appointments ({sortedAppointments.length})
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


  // // Filter dummy appointments - show only when selected date is today
  // const filteredDummyAppointments = dummyAppointments.filter(apt => {
  //   if (!apt.date) return false;
  //   const today = new Date();
  //   const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  //   const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  //   return selectedDateOnly.getTime() === todayOnly.getTime();
  // });

  // // Filter imported appointments by selected date
  // const filteredImportedAppointments = importedAppointments.filter(apt => {
  //   if (!apt.date) return false;
  //   const appointmentDate = new Date(apt.date);
  //   const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  //   const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
  //   return appointmentDateOnly.getTime() === selectedDateOnly.getTime();
  // });

  // // Sort appointments by time
  // const sortByTime = (appointments: AppointmentForList[]) => {
  //   return [...appointments].sort((a, b) => a.time.localeCompare(b.time));
  // };

  // const sortedDummyAppointments = sortByTime(filteredDummyAppointments);
  // const sortedImportedAppointments = sortByTime(filteredImportedAppointments);

  // const hasAnyAppointments = sortedDummyAppointments.length > 0 || sortedImportedAppointments.length > 0;

  // if (!hasAnyAppointments) {
  //   return (
  //     <div className="text-center py-12">
  //       <p className="text-muted-foreground text-lg">No appointments found for this date</p>
  //       <p className="text-muted-foreground text-sm mt-2">Import appointments using the button above to get started</p>
  //     </div>
  //   );
  // }

  // return (
  //   <div className="space-y-8">
  //     {/* Scheduled Appointments Section */}
  //     {sortedDummyAppointments.length > 0 && (
  //       <div className="space-y-4">
  //         <h2 className="text-2xl font-semibold text-foreground">
  //           Scheduled Appointments ({sortedDummyAppointments.length})
  //         </h2>
  //         {sortedDummyAppointments.map((appointment) => (
  //           <DynamicAppointmentCard
  //             key={appointment.id}
  //             appointment={appointment}
  //             onViewDetails={handleViewDetails}
  //           />
  //         ))}
  //       </div>
  //     )}

//       {/* Imported Appointments Section */}
//       {sortedImportedAppointments.length > 0 && (
//         <div className="space-y-4">
//           <h2 className="text-2xl font-semibold text-foreground">
//             Imported Appointments ({sortedImportedAppointments.length})
//           </h2>
//           {sortedImportedAppointments.map((appointment) => (
//             <DynamicAppointmentCard
//               key={appointment.id}
//               appointment={appointment}
//               onViewDetails={handleViewDetails}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
