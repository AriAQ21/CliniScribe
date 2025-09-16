import { useState, useEffect } from 'react';
import type { AppointmentStatus } from '@/components/AppointmentCard';

export function useAppointmentStatus(appointmentId: string) {
  const [status, setStatus] = useState<AppointmentStatus>('Not started');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/appointments/${appointmentId}/status`);
        
        if (response.ok) {
          const result = await response.json();
          setStatus(result.status as AppointmentStatus);
        }
      } catch (error) {
        console.log('Failed to fetch appointment status:', error);
        // Keep default status on error
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    
    return () => clearInterval(interval);
  }, [appointmentId]);

  return { status, loading };
}
