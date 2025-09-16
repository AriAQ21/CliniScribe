import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  room: string;
  date: string;
  time: string;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/appointments/user/${user.user_id}`
        );

        if (!response.ok) {
          // don’t try to .json() if failed
          throw new Error("Failed to fetch appointments");
        }

        const data = await response.json();

        const formattedAppointments = data.appointments.map((apt: any) => ({
          ...apt,
          time: formatTime(apt.time),
        }));

        setAppointments(formattedAppointments);
        setError(null);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Failed to load appointments");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return { appointments, loading, error };
}
