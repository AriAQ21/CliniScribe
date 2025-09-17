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

// --- helper: minutes since midnight from common time formats
function toMinutesSinceMidnight(raw: string): number {
  if (!raw) return Number.POSITIVE_INFINITY;
  const s = raw.trim().toUpperCase();

  // 12h formats: "H:MM AM", "H:MM:SS PM", "7PM", "7:15PM"
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2] ?? "0", 10);
    // const sec = parseInt(m12[3] ?? "0", 10); // not used
    const ampm = m12[4].toUpperCase();
    if (ampm === "AM") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return h * 60 + min;
  }

  // 24h formats: "HH:MM", "HH:MM:SS"
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    return h * 60 + min;
  }

  // Very loose fallback: just try Date parse (last resort)
  const d = new Date(`1970-01-01T${raw}`);
  if (!isNaN(d.getTime())) {
    return d.getHours() * 60 + d.getMinutes();
  }

  // Unknown format → push to end
  return Number.POSITIVE_INFINITY;
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

  // Dummy only when viewing *today*
  const filteredDummy = dummyAppointments.filter((apt) => {
    if (!apt?.date) return false;
    return selectedDateOnly.getTime() === todayOnly.getTime();
  });

  // Imported only for the selected date
  const filteredImported = importedAppointments.filter((apt) => {
    if (!apt?.date) return false;
    const d = new Date(apt.date);
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dOnly.getTime() === selectedDateOnly.getTime();
  });

  // Merge then sort by parsed time
  const sortedAppointments = [...filteredDummy, ...filteredImported].sort((a, b) => {
    const ma = toMinutesSinceMidnight(a.time);
    const mb = toMinutesSinceMidnight(b.time);
    return ma - mb || String(a.id).localeCompare(String(b.id)); // stable tie-breaker
  });

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
