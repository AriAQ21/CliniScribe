import { useState } from "react";
import { Calendar as CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AppointmentImportDialog } from "./AppointmentImportDialog";
import { cn } from "@/lib/utils";

interface DateFilterHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onImportComplete: () => Promise<void>;
}

export function DateFilterHeader({ selectedDate, onDateChange, onImportComplete }: DateFilterHeaderProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-foreground">Filter by Date:</h2>
        
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Import Button */}
      <Button 
        onClick={() => setIsImportDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Import Appointments
      </Button>

      {/* Import Dialog */}
      <AppointmentImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={onImportComplete}
      />
    </div>
  );
}