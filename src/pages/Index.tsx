import { DashboardHeader } from "@/components/DashboardHeader";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { useDummyAppointments } from "@/hooks/useDummyAppointments";
import { useImportedAppointments } from "@/hooks/useImportedAppointments";
import { useState } from "react";

const Index = () => {
  const { appointments: dummyAppointments, loading: dummyLoading, error: dummyError } = useDummyAppointments();
  const { appointments: importedAppointments, loading: importedLoading, error: importedError, refreshAppointments: refreshImportedAppointments } = useImportedAppointments();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleImportComplete = async () => {
    // Refresh the imported appointments list
    await refreshImportedAppointments();
  };

  if (dummyLoading || importedLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <DashboardHeader />
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (dummyError && importedError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <DashboardHeader />
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Error loading appointments</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <DashboardHeader />
        
        <div className="mt-6">
          <DateFilterHeader 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onImportComplete={handleImportComplete}
          />
          
          <div className="mt-6">
            <UnifiedAppointmentsList 
              dummyAppointments={dummyAppointments}
              importedAppointments={importedAppointments}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
