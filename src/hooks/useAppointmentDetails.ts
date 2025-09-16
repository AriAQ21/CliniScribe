import { useState, useEffect } from 'react';

interface AppointmentDetails {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  room: string;
  appointment_date: string;
  appointment_time: string;
  user_id: number;
}

export function useAppointmentDetails(appointmentId: string) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!appointmentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/appointments/${appointmentId}/details`);
        
        if (response.status === 404) {
          setError('Appointment not found');
          setAppointment(null);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch appointment details');
        }
        
        const data = await response.json();
        setAppointment(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching appointment details:', err);
        setError('Failed to load appointment details');
        setAppointment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId]);

  // Generate mock patient data based on patient name for compatibility
  const getMockPatientData = () => {
    if (!appointment) return null;
    
    // Mock data mapping based on patient names
    const mockData: Record<string, any> = {
      'John Doe': { dateOfBirth: '10/01/1985', nhsNumber: '123 456 7890' },
      'Sarah Johnson': { dateOfBirth: '15/03/1985', nhsNumber: '485 777 3456' },
      'Michael Chen': { dateOfBirth: '22/11/1978', nhsNumber: '612 445 8901' },
      'Emma Williams': { dateOfBirth: '08/07/1992', nhsNumber: '357 889 1234' },
      'James Rodriguez': { dateOfBirth: '12/09/1975', nhsNumber: '734 562 9012' },
      'Lisa Thompson': { dateOfBirth: '29/05/1988', nhsNumber: '891 345 6789' },
      'David Kumar': { dateOfBirth: '18/12/1983', nhsNumber: '567 234 8901' },
    };

    const formatTime = (timeString: string) => {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return {
      name: appointment.patient_name,
      time: formatTime(appointment.appointment_time),
      ...(mockData[appointment.patient_name] || { 
        dateOfBirth: '01/01/1980', 
        nhsNumber: '000 000 0000' 
      })
    };
  };

  return { 
    appointment, 
    patientData: getMockPatientData(),
    loading, 
    error 
  };
}