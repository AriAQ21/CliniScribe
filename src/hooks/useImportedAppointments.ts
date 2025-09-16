import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ImportedAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  room: string;
  date: string;
  time: string;
}

export function useImportedAppointments() {
  const [appointments, setAppointments] = useState<ImportedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchImportedAppointments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/appointments/user/${user.user_id}?is_dummy=false`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch imported appointments');
      }
      
      const data = await response.json();
      
      // Transform the data to match expected format and add time formatting
      const formattedAppointments = data.appointments.map((apt: any) => ({
        ...apt,
        time: formatTime(apt.time)
      }));
      
      setAppointments(formattedAppointments);
      setError(null);
    } catch (err) {
      console.error('Error fetching imported appointments:', err);
      setError('Failed to load imported appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImportedAppointments();
  }, [fetchImportedAppointments]);

  const formatTime = (timeString: string) => {
    // Convert 24-hour time to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const importAppointments = async (appointmentsData: any[]): Promise<{ success: boolean; message: string; details?: any }> => {
    if (!user) {
      return { success: false, message: 'User not logged in' };
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/appointments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointments: appointmentsData,
          user_id: user.user_id
        })
      });

      // Parse response regardless of status code to get detailed info
      let result;
      try {
        result = await response.json();
      } catch {
        result = { message: await response.text() || 'Unknown error occurred' };
      }

      if (!response.ok) {
        const errorMessage = result.detail || result.message || `Import failed (${response.status})`;
        return { success: false, message: errorMessage, details: result };
      }

      // Refresh the appointments list after import (successful or partial)
      await fetchImportedAppointments();

      return { 
        success: true, 
        message: result.message || 'Import completed successfully',
        details: result
      };
    } catch (err) {
      console.error('Error importing appointments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      return { success: false, message: errorMessage };
    }
  };

  return { 
    appointments, 
    loading, 
    error, 
    importAppointments,
    refreshAppointments: fetchImportedAppointments
  };
}