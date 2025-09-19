from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from utils import (
    convert_to_wav_16k,
    save_metadata_json,
    load_metadata_json,
    update_metadata_json,
    load_transcript,
    save_transcript,
)
from config import AUDIO_FILES_DIR, JSON_FILES_DIR, TRANSCRIPTION_FILES_DIR
from supabase_client import (
    get_appointment_by_id,
    get_appointments_by_user,
    get_audio_recording_by_appointment,
    get_transcription_by_appointment,
    get_supabase_client,
)
import os
from datetime import datetime
import glob
import json

app = FastAPI()

# Allow requests from frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: lock this down in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    appointment_id: str = Form(...),
    user_id: str = Form(...),
    room: str = Form(...),
    appointment_time: str = Form(None), 
    manual_tags: str = Form(None)
):
    try:
        # Get appointment info from Supabase
        supabase = get_supabase_client()
        appt_res = supabase.table("appointments") \
            .select("appointment_date, appointment_time, room, meeting_type") \
            .eq("appointment_id", int(appointment_id)) \
            .single() \
            .execute()

        if not appt_res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")

        appt_date = appt_res.data["appointment_date"]
        appt_time = appt_res.data["appointment_time"]
        location = appt_res.data.get("room") or room
        meeting_type = (appt_res.data.get("meeting_type") or "gp").lower()

        role_res = supabase.table("users") \
            .select("role") \
            .eq("user_id", int(user_id)) \
            .single() \
            .execute()
        role = (role_res.data or {}).get("role")

        # Generate audio_ID and convert to 16kHz WAV
        dt = datetime.strptime(f"{appt_date} {appt_time}", "%Y-%m-%d %H:%M:%S")
        timestamp = dt.strftime('%Y-%m-%dT%H-%M-%S-') + "000Z"
        audio_id = f"{user_id}_{meeting_type.upper()}_{timestamp}"
        original_filename = file.filename or "audio.wav"
        converted_path = convert_to_wav_16k(file, audio_id)
       
        # Build metadata and save JSON
        metadata = {
            "audio_id": audio_id,
            "status": "queued",
            "appointment_id": int(appointment_id),
            "user_id": int(user_id),
            "location": location,
            "role": role,
            "appointment_time": f"{appt_date}T{appt_time}Z",
            "no_of_speakers": 2,
            "meeting_type": meeting_type,
            "created_at": datetime.now().isoformat(),
        }
        if manual_tags:
            try:
                metadata["manual_tags"] = json.loads(manual_tags)
            except Exception as e:
                print(f"Failed to parse manual_tags: {e}")

        save_metadata_json(audio_id, metadata)

        # Insert into DB
        try:
            supabase.table("audio_recordings").insert({
                "audio_id": audio_id,
                "user_id": int(user_id),
                "appointment_id": int(appointment_id),
                "filename": original_filename,
                "file_path": converted_path,
                "status": "queued",
                "meeting_type": meeting_type,
                "upload_time": datetime.now().isoformat()
            }).execute()
        except Exception as db_error:
            print(f"Failed to insert into database: {db_error}")

        return {
            "audio_id": audio_id,
            "status": "queued",
            "message": "Audio uploaded successfully, transcription queued"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        # return serializable error, not the `str` function
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/transcribe/status/{audio_id}")
async def get_transcription_status(audio_id: str):
    """Return status & transcript (if ready) for a given audio_id."""
    metadata = load_metadata_json(audio_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Audio recording not found")

    transcript = load_transcript(audio_id)

    return {
        "audio_id": audio_id,
        "status": metadata.get("status", "unknown"),
        "transcript": transcript  # always load from file
    }

@app.get("/transcribe/text/{audio_id}")
async def get_transcript_text(audio_id: str):
    """Get the transcript text for a given audio_id, if it exists"""
    transcript = load_transcript(audio_id)

    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return {
        "audio_id": audio_id,
        "transcript": transcript
    }


@app.post("/transcribe/update/{audio_id}")
async def update_transcript_text(audio_id: str, request: Request):
    """Update the saved transcript file on disk"""
    try:
        form = await request.form()
        new_text = form.get("new_text")
        if not new_text:
            raise HTTPException(status_code=400, detail="Missing new_text")

        # Save to .txt file
        save_transcript(audio_id, new_text)

        # Optional: update updated_at in JSON metadata
        update_metadata_json(audio_id, {"transcript_updated_at": datetime.now().isoformat()})

        return {"success": True, "message": f"Transcript for {audio_id} updated."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/appointments/{appointment_id}/status")
async def get_appointment_status(appointment_id: str):
    """
    High-level status for an appointment using DB:
      - "Transcribed" if a transcription row exists
      - "Transcribing" if latest audio is queued/processing
      - "Not started" otherwise
    """
    try:
        appointment_id_int = int(appointment_id)

        appointment = get_appointment_by_id(appointment_id_int)
        if not appointment:
            return {"appointment_id": appointment_id, "status": "Not started"}

        audio_recording = get_audio_recording_by_appointment(appointment_id_int)
        if not audio_recording:
            return {"appointment_id": appointment_id, "status": "Not started"}

        audio_status = audio_recording.get("status", "queued")

        transcription = get_transcription_by_appointment(appointment_id_int)
        if transcription:
            return {"appointment_id": appointment_id, "status": "Transcribed"}
        elif audio_status in ["processing", "queued"]:
            return {"appointment_id": appointment_id, "status": "Transcribing"}
        else:
            return {"appointment_id": appointment_id, "status": "Not started"}

    except ValueError:
        return {"appointment_id": appointment_id, "status": "Not started"}
    except Exception as e:
        print(f"Error getting appointment status: {e}")
        return {"appointment_id": appointment_id, "status": "Not started"}

@app.get("/appointments/{appointment_id}/latest-audio")
async def get_latest_audio_for_appointment(appointment_id: int):
    """
    Return the most recent audio recording for an appointment,
    including its audio_id, filename, and status.
    """
    audio_recording = get_audio_recording_by_appointment(appointment_id)
    if not audio_recording:
        raise HTTPException(status_code=404, detail="No audio recording found")
    return audio_recording


@app.get("/appointments/user/{user_id}")
async def get_user_appointments(user_id: int, is_dummy: bool = None):
    """List appointments for a given user (from DB), optionally filtered by is_dummy."""
    try:
        appointments = get_appointments_by_user(user_id, is_dummy)
        return {"appointments": appointments}
    except Exception as e:
        print(f"Error getting user appointments: {e}")
        raise HTTPException(status_code=500, detail="Error fetching appointments")

@app.post("/appointments/bulk")
async def create_appointments_bulk(request: Request):
    """Bulk insert appointments from imported data, skipping duplicates."""
    try:
        data = await request.json()
        appointments = data.get("appointments", [])
        user_id = data.get("user_id")

        if not appointments:
            raise HTTPException(status_code=400, detail="No appointments provided")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        if len(appointments) == 0:
            raise HTTPException(status_code=400, detail="Appointment list cannot be empty")

        # Get user details for location
        supabase = get_supabase_client()
        user_result = supabase.table("users").select("first_name, last_name, location").eq("user_id", user_id).single().execute()

        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_result.data
        room = user_data['location'] or 'Room 1'

        # Get existing appointments for this user
        existing_result = supabase.table("appointments").select("patient_name, room, appointment_date, appointment_time, meeting_type, is_dummy").eq("user_id", user_id).execute()
        existing_appointments = existing_result.data or []

        # Create a set of existing appointment tuples for fast lookup (matching database constraint)
        existing_set = set()
        for existing in existing_appointments:
            existing_tuple = (
                existing["patient_name"],
                existing["room"],
                str(existing["appointment_date"]),
                str(existing["appointment_time"]),
                existing["meeting_type"]
            )
            existing_set.add(existing_tuple)

        # Prepare appointments and filter out duplicates
        new_appointments = []
        duplicates_count = 0
        validation_errors = []
        
        for i, apt in enumerate(appointments):
            try:
                # Validate required fields
                if not apt.get("patientName"):
                    validation_errors.append(f"Row {i+1}: Missing patient name")
                    continue
                if not apt.get("date"):
                    validation_errors.append(f"Row {i+1}: Missing appointment date")
                    continue
                if not apt.get("time"):
                    validation_errors.append(f"Row {i+1}: Missing appointment time")
                    continue

                formatted_apt = {
                    "user_id": user_id,
                    "patient_name": apt["patientName"],
                    "room": room,
                    "appointment_date": apt["date"],
                    "appointment_time": apt["time"],
                    "is_dummy": False,
                    "meeting_type": apt.get("meetingType", "GP")
                }
                
                # Check if this appointment already exists (matching database constraint)
                apt_tuple = (
                    formatted_apt["patient_name"],
                    formatted_apt["room"],
                    formatted_apt["appointment_date"],
                    formatted_apt["appointment_time"],
                    formatted_apt["meeting_type"]
                )
                
                if apt_tuple in existing_set:
                    duplicates_count += 1
                else:
                    new_appointments.append(formatted_apt)
                    
            except Exception as e:
                validation_errors.append(f"Row {i+1}: {str(e)}")
                continue

        # If we have validation errors and no valid appointments, return error
        if validation_errors and not new_appointments:
            error_message = f"Validation failed for all appointments: {'; '.join(validation_errors[:5])}"
            if len(validation_errors) > 5:
                error_message += f" (and {len(validation_errors) - 5} more errors)"
            raise HTTPException(status_code=400, detail=error_message)

        # Insert appointments one by one to handle constraint violations properly
        inserted_count = 0
        constraint_duplicates = 0
        insert_errors = []
        
        for i, apt in enumerate(new_appointments):
            try:
                result = supabase.table("appointments").insert(apt).execute()
                if result.data:
                    inserted_count += 1
            except Exception as db_error:
                error_str = str(db_error)
                # Check if it's a unique constraint violation (duplicate)
                if "23505" in error_str or "duplicate key" in error_str.lower():
                    constraint_duplicates += 1
                else:
                    insert_errors.append(f"Row {i+1}: {error_str}")
                    print(f"Database insertion error for appointment {i+1}: {db_error}")
        
        # Add constraint violations to duplicates count
        duplicates_count += constraint_duplicates

        # Build detailed response message
        all_errors = validation_errors + insert_errors
        parts = []
        if inserted_count > 0:
            parts.append(f"imported {inserted_count} appointment{'s' if inserted_count != 1 else ''}")
        if duplicates_count > 0:
            parts.append(f"skipped {duplicates_count} duplicate{'s' if duplicates_count != 1 else ''}")
        if all_errors:
            parts.append(f"{len(all_errors)} error{'s' if len(all_errors) != 1 else ''}")

        message = f"Successfully {', '.join(parts)}" if parts else "No changes made"

        return {
            "success": True,
            "total_processed": len(appointments),
            "imported": inserted_count,
            "duplicates_skipped": duplicates_count,
            "validation_errors": len(validation_errors),
            "insert_errors": len(insert_errors),
            "errors": all_errors[:10] if all_errors else [],  # Return first 10 errors
            "message": message
        }

    except HTTPException as he:
        # Re-raise HTTP exceptions to preserve status codes
        raise he
    except Exception as e:
        print(f"Error bulk inserting appointments: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get("/appointments/{appointment_id}/details")
async def get_appointment_details(appointment_id: str):
    """Return appointment details (from DB)."""
    try:
        appointment_id_int = int(appointment_id)
        appointment = get_appointment_by_id(appointment_id_int)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appointment
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    except HTTPException as e:   # <-- don’t swallow 404s
        raise e
    except Exception as e:
        print(f"Error getting appointment details: {e}")
        raise HTTPException(status_code=500, detail="Error fetching appointment details")


@app.get("/health")
async def health_check():
    """Basic health status including storage dirs and DB connectivity."""
    try:
        # Check storage
        storage_checks = {
            "audio_files_dir": os.path.exists(AUDIO_FILES_DIR),
            "json_files_dir": os.path.exists(JSON_FILES_DIR),
            "transcription_files_dir": os.path.exists(TRANSCRIPTION_FILES_DIR),
        }

        # Check DB connection
        try:
            supabase = get_supabase_client()
            supabase.table("users").select("user_id").limit(1).execute()
            db_connected = True
        except Exception as e:
            print(f"Database connection failed: {e}")
            db_connected = False

        # Count queued/processing from JSON files
        json_files = glob.glob(os.path.join(JSON_FILES_DIR, "*.json"))
        queued_count = 0
        processing_count = 0
        for json_file in json_files:
            try:
                with open(json_file, "r") as f:
                    metadata = json.load(f)
                    status = metadata.get("status", "unknown")
                    if status == "queued":
                        queued_count += 1
                    elif status == "processing":
                        processing_count += 1
            except:
                continue

        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "storage_checks": storage_checks,
            "database_connected": db_connected,
            "queue_status": {
                "queued_jobs": queued_count,
                "processing_jobs": processing_count,
            },
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


@app.get("/queue/status")
async def queue_status():
    """Debug view of all JSON jobs and their stored status."""
    try:
        json_files = glob.glob(os.path.join(JSON_FILES_DIR, "*.json"))
        jobs = []
        for json_file in json_files:
            try:
                audio_id = os.path.basename(json_file).replace(".json", "")
                with open(json_file, "r") as f:
                    metadata = json.load(f)
                    jobs.append(
                        {
                            "audio_id": audio_id,
                            "status": metadata.get("status", "unknown"),
                            "created_at": metadata.get("created_at"),
                            "appointment_id": metadata.get("appointment_id"),
                            "user_id": metadata.get("user_id"),
                        }
                    )
            except Exception as e:
                jobs.append(
                    {
                        "audio_id": audio_id,
                        "status": "error",
                        "error": f"Failed to read metadata: {str(e)}",
                    }
                )

        return {"total_jobs": len(jobs), "jobs": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading queue: {str(e)}")
