import { useState } from "react";
import { Upload, File, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AppointmentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => Promise<void>;
}

export function AppointmentImportDialog({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: AppointmentImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
  });

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: reject
      });
    });
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseDate = (dateStr: string): Date | null => {
    const trimmedDate = dateStr.toString().trim();
    
    // Try DD/MM/YYYY format first (e.g., 25/12/2024, 01/03/2024)
    const ddmmyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
    const ddmmyyyyMatch = trimmedDate.match(ddmmyyyyPattern);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      // Validate the parsed date components match what was input
      if (parsedDate.getDate() === parseInt(day) && 
          parsedDate.getMonth() === parseInt(month) - 1 && 
          parsedDate.getFullYear() === parseInt(year)) {
        return parsedDate;
      }
    }
    
    // Try MM/DD/YYYY format (e.g., 12/25/2024)
    const mmddyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
    const mmddyyyyMatch = trimmedDate.match(mmddyyyyPattern);
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (parsedDate.getDate() === parseInt(day) && 
          parsedDate.getMonth() === parseInt(month) - 1 && 
          parsedDate.getFullYear() === parseInt(year)) {
        return parsedDate;
      }
    }
    
    // Try YYYY-MM-DD format (ISO format)
    const isoPattern = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/;
    const isoMatch = trimmedDate.match(isoPattern);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (parsedDate.getDate() === parseInt(day) && 
          parsedDate.getMonth() === parseInt(month) - 1 && 
          parsedDate.getFullYear() === parseInt(year)) {
        return parsedDate;
      }
    }
    
    // Fallback to JavaScript's default parsing
    const fallbackDate = new Date(dateStr);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  };

  const validateAppointmentData = (data: any[]): any[] => {
    const validAppointments = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Normalize column names (handle variations)
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().trim();
        if (lowerKey.includes('patient') && lowerKey.includes('name')) {
          normalizedRow.patientName = row[key];
        } else if (lowerKey.includes('date')) {
          normalizedRow.date = row[key];
        } else if (lowerKey.includes('time')) {
          normalizedRow.time = row[key];
        } else if (lowerKey.includes('meeting') && lowerKey.includes('type')) {
          normalizedRow.meetingType = row[key];
        }
      });

      // Validate required fields
      if (!normalizedRow.patientName || !normalizedRow.date || !normalizedRow.time) {
        errors.push(`Row ${rowNum}: Missing required fields (Patient Name, Date, Time)`);
        continue;
      }

      // Format date and time
      try {
        const appointmentDate = parseDate(normalizedRow.date);
        if (!appointmentDate) {
          errors.push(`Row ${rowNum}: Invalid date format. Supported formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD`);
          continue;
        }
        // Format date without timezone conversion to avoid day shift
        const year = appointmentDate.getFullYear();
        const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(appointmentDate.getDate()).padStart(2, '0');
        normalizedRow.date = `${year}-${month}-${day}`;

        // Validate time format (accept various formats)
        const timeStr = normalizedRow.time.toString().trim();
        if (!/^\d{1,2}:\d{2}/.test(timeStr)) {
          errors.push(`Row ${rowNum}: Invalid time format (use HH:MM or HH:MM AM/PM)`);
          continue;
        }
        
        // Convert to 24-hour format if needed
        let time24 = timeStr;
        if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
          const [time, period] = timeStr.split(/\s+/);
          const [hours, minutes] = time.split(':');
          let hour24 = parseInt(hours);
          
          if (period.toLowerCase() === 'pm' && hour24 !== 12) {
            hour24 += 12;
          } else if (period.toLowerCase() === 'am' && hour24 === 12) {
            hour24 = 0;
          }
          
          time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;
        }
        normalizedRow.time = time24;

        validAppointments.push(normalizedRow);
      } catch (error) {
        errors.push(`Row ${rowNum}: Error processing date/time`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    return validAppointments;
  };

  const handleImport = async () => {
    if (!selectedFile || !user) return;

    setIsProcessing(true);
    
    try {
      let parsedData: any[];

      // Parse file based on type
      if (selectedFile.name.endsWith('.csv')) {
        parsedData = await parseCSV(selectedFile);
      } else {
        parsedData = await parseExcel(selectedFile);
      }

      // Validate and format data
      const validAppointments = validateAppointmentData(parsedData);

      // Send to backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/appointments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointments: validAppointments,
          user_id: user.user_id
        })
      });

      // Parse response regardless of status code to get detailed error info
      let result;
      try {
        result = await response.json();
      } catch {
        // Fallback if response isn't JSON
        result = { message: await response.text() || 'Unknown error occurred' };
      }

      if (!response.ok) {
        // Handle structured error responses
        const errorMessage = result.detail || result.message || `Import failed (${response.status})`;
        
        // If it's a validation error, show first few specific errors
        if (result.errors && result.errors.length > 0) {
          const errorDetails = result.errors.slice(0, 3).join(', ');
          const additionalErrors = result.errors.length > 3 ? ` (and ${result.errors.length - 3} more)` : '';
          throw new Error(`${errorMessage}: ${errorDetails}${additionalErrors}`);
        }
        
        throw new Error(errorMessage);
      }

      // Handle successful import with detailed feedback
      const { imported = 0, duplicates_skipped = 0, validation_errors = 0, total_processed = validAppointments.length } = result;
      
      let successMessage = '';
      if (imported > 0) {
        successMessage = `Successfully imported ${imported} appointment${imported !== 1 ? 's' : ''}`;
      }
      
      const additionalInfo = [];
      if (duplicates_skipped > 0) {
        additionalInfo.push(`skipped ${duplicates_skipped} duplicate${duplicates_skipped !== 1 ? 's' : ''}`);
      }
      if (validation_errors > 0) {
        additionalInfo.push(`${validation_errors} validation error${validation_errors !== 1 ? 's' : ''}`);
      }
      
      if (additionalInfo.length > 0) {
        successMessage += `. ${additionalInfo.join(', ')}`;
      }
      
      // Show specific validation errors if any
      if (result.errors && result.errors.length > 0 && imported > 0) {
        successMessage += `\nFirst few errors: ${result.errors.slice(0, 2).join(', ')}`;
      }

      await onImportComplete();
      
      toast({
        title: imported > 0 ? "Import Completed" : "Import Issues",
        description: successMessage || "No appointments were imported",
        variant: imported > 0 ? "default" : "destructive",
      });
      
      onOpenChange(false);
      setSelectedFile(null);
      
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Appointments</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file containing your appointment data. 
            Required columns: Patient Name, Date (DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD), Time. Optional: Meeting Type (defaults to GP).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {isDragActive 
                  ? "Drop your file here..." 
                  : "Drag & drop your CSV or Excel file here, or click to browse"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports .csv, .xls, .xlsx files
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? "Processing..." : "Import Appointments"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}