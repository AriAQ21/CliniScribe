import os
from supabase import create_client, Client
from typing import Dict, Any, List, Optional


def get_supabase_client() -> Client:
    """Create Supabase client using env vars."""
    url = os.getenv("SUPABASE_URL")
    # Prefer service role; if you insist on anon while RLS is off, set SUPABASE_ANON_KEY in env and fallback to it.
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY")
    return create_client(url, key)
    
def get_appointment_by_id(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get appointment details by ID"""
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('appointments').select(
            'appointment_id, patient_name, room, appointment_date, appointment_time, user_id, users(first_name, last_name)'
        ).eq('appointment_id', appointment_id).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            first_name = row['users']['first_name'] if row['users'] else ''
            last_name = row['users']['last_name'] if row['users'] else ''
            return {
                'appointment_id': row['appointment_id'],
                'patient_name': row['patient_name'],
                'room': row['room'],
                'appointment_date': row['appointment_date'],
                'appointment_time': row['appointment_time'],
                'user_id': row['user_id'],
                'doctor_name': f"Dr. {first_name} {last_name}",  # Derived from users table
                'doctor_first_name': first_name,
                'doctor_last_name': last_name
            }
    except Exception as e:
        print(f"Supabase error: {e}")
    return None

def get_appointments_by_user(user_id: int, is_dummy: bool = None) -> List[Dict[str, Any]]:
    """Get appointments for a specific user, optionally filtered by is_dummy"""
    try:
        supabase = get_supabase_client()
        
        # First get user details to derive doctor name
        user_response = supabase.table('users').select('first_name, last_name').eq('user_id', user_id).single().execute()
        if not user_response.data:
            return []  # User not found
        
        user_data = user_response.data
        doctor_name = f"Dr. {user_data['first_name']} {user_data['last_name']}"
        
        query = supabase.table('appointments').select(
            'appointment_id, patient_name, room, appointment_date, appointment_time, is_dummy'
        ).eq('user_id', user_id)
        
        if is_dummy is not None:
            query = query.eq('is_dummy', is_dummy)
            
        response = query.order('appointment_date', desc=False).order('appointment_time', desc=False).execute()
        
        return [{
            'id': str(row['appointment_id']),
            'patientName': row['patient_name'],
            'doctorName': doctor_name,  # Derived from users table
            'room': row['room'],
            'date': row['appointment_date'],
            'time': row['appointment_time']
        } for row in response.data]
    except Exception as e:
        print(f"Supabase error: {e}")
    return []

def get_audio_recording_by_appointment(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get audio recording for an appointment"""
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('audio_recordings').select(
            'audio_id, status, filename'
        ).eq('appointment_id', appointment_id).order('upload_time', desc=True).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {
                'audio_id': row['audio_id'],
                'status': row['status'],
                'filename': row['filename']
            }
    except Exception as e:
        print(f"Supabase error: {e}")
    return None

def get_transcription_by_appointment(appointment_id: int) -> Optional[Dict[str, Any]]:
    """Get transcription for an appointment"""
    try:
        supabase = get_supabase_client()
        
        # First get the audio recording for this appointment
        audio_response = supabase.table('audio_recordings').select('audio_id').eq('appointment_id', appointment_id).execute()
        
        if not audio_response.data:
            return None
            
        audio_id = audio_response.data[0]['audio_id']
        
        # Then get the transcription for that audio
        response = supabase.table('transcriptions').select(
            'transcription_id, transcript_filename, metadata_filename'
        ).eq('audio_id', audio_id).order('transcribed_at', desc=True).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {
                'transcription_id': row['transcription_id'],
                'transcript_filename': row['transcript_filename'],
                'metadata_filename': row['metadata_filename']
            }
    except Exception as e:
        print(f"Supabase error: {e}")
    return None
