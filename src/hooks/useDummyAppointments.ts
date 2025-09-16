import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  room: string;
  date: string;
  time: string;
}

export function useDummyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDummyAppointments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/appointments/user/${user.user_id}?is_dummy=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch dummy appointments');
        }
        
        const data = await response.json();

        // Define "today" before mapping
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

        const formattedAppointments = data.appointments.map((apt: any) => ({
          ...apt,
          date: todayStr, // override DB date to always be today
          time: formatTime(apt.time),
        }));
      
        
        setAppointments(formattedAppointments);
        setError(null);
      } catch (err) {
        console.error('Error fetching dummy appointments:', err);
        setError('Failed to load appointments');
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDummyAppointments();
  }, [user]);

  const formatTime = (timeString: string) => {
    // Convert 24-hour time to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return { appointments, loading, error };
}
