import psycopg2
import os
from typing import Dict, Any, List, Optional

# Database connection parameters
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "postgres")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")

def get_db_connection():
    """Get a database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def get_appointment_by_id(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get appointment details by ID"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT a.appointment_id, a.patient_name, a.room, 
                           a.appointment_date, a.appointment_time, a.user_id,
                           u.first_name, u.last_name
                    FROM appointments a
                    JOIN users u ON a.user_id = u.user_id
                    WHERE a.appointment_id = %s
                """, (appointment_id,))
                
                row = cur.fetchone()
                if row:
                    return {
                        'appointment_id': row[0],
                        'patient_name': row[1],
                        'room': row[2],
                        'appointment_date': row[3].strftime('%Y-%m-%d'),
                        'appointment_time': str(row[4]),
                        'user_id': row[5],
                        'doctor_name': f"Dr. {row[6]} {row[7]}",  # Derived from users table
                        'doctor_first_name': row[6],
                        'doctor_last_name': row[7]
                    }
    except Exception as e:
        print(f"Database error: {e}")
    return None

def get_appointments_by_user(user_id: int) -> List[Dict[str, Any]]:
    """Get all appointments for a specific user"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT a.appointment_id, a.patient_name, a.room, 
                           a.appointment_date, a.appointment_time,
                           u.first_name, u.last_name
                    FROM appointments a
                    JOIN users u ON a.user_id = u.user_id
                    WHERE a.user_id = %s
                    ORDER BY a.appointment_date, a.appointment_time
                """, (user_id,))
                
                rows = cur.fetchall()
                return [{
                    'id': str(row[0]),
                    'patientName': row[1],
                    'room': row[2],
                    'date': row[3].strftime('%Y-%m-%d'),
                    'time': str(row[4]),
                    'doctorName': f"Dr. {row[5]} {row[6]}"  # Derived from users table
                } for row in rows]
    except Exception as e:
        print(f"Database error: {e}")
    return []

def get_audio_recording_by_appointment(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get audio recording for an appointment"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT audio_id, status, filename
                    FROM audio_recordings
                    WHERE appointment_id = %s
                    ORDER BY upload_time DESC
                    LIMIT 1
                """, (appointment_id,))
                
                row = cur.fetchone()
                if row:
                    return {
                        'audio_id': row[0],
                        'status': row[1],
                        'filename': row[2]
                    }
    except Exception as e:
        print(f"Database error: {e}")
    return None

def get_transcription_by_appointment(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get transcription for an appointment"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT t.transcription_id, t.transcript_filename, t.metadata_filename
                    FROM transcriptions t
                    JOIN audio_recordings ar ON t.audio_id = ar.audio_id
                    WHERE ar.appointment_id = %s
                    ORDER BY t.transcribed_at DESC
                    LIMIT 1
                """, (appointment_id,))
                
                row = cur.fetchone()
                if row:
                    return {
                        'transcription_id': row[0],
                        'transcript_filename': row[1],
                        'metadata_filename': row[2]
                    }
    except Exception as e:
        print(f"Database error: {e}")
    return None