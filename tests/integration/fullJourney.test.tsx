// src/hooks/useDummyAppointments.ts
import { useState, useEffect } from "react";

export function useDummyAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDummyAppointments() {
      try {
        setLoading(true);

        const res = await fetch("/api/dummy-appointments");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        // Defensive check to avoid undefined.map crash
        if (!Array.isArray(data)) {
          console.warn("⚠Expected array, got:", data);
          setAppointments([]);
          return;
        }

        setAppointments(
          data.map((a: any) => ({
            id: a.id ?? String(Math.random()),
            patientName: a.patientName ?? "Unknown",
            doctorName: a.doctorName ?? "Unknown",
            room: a.room ?? "N/A",
            date: a.date ?? "",
            time: a.time ?? "",
          }))
        );
      } catch (err: any) {
        console.error("Error fetching dummy appointments:", err);
        setError(err);
        setAppointments([]); 
      } finally {
        setLoading(false);
      }
    }

    fetchDummyAppointments();
  }, []);

  return { appointments, loading, error };
}
