import time
import os
import glob
from datetime import datetime

from model_runner import run_model
from utils import load_metadata_json, update_metadata_json, save_transcript
from config import JSON_FILES_DIR, AUDIO_FILES_DIR, TRANSCRIPTION_FILES_DIR
from supabase_client import get_supabase_client


def process_queue():
    """File-based background processor for transcription queue"""
    print(f"[{datetime.now()}] Starting queue processor...")
    print(f"[{datetime.now()}] Monitoring directories:")
    print(f"  - JSON files: {JSON_FILES_DIR}")
    print(f"  - Audio files: {AUDIO_FILES_DIR}")
    print(f"  - Transcription files: {TRANSCRIPTION_FILES_DIR}")

    # Check if directories exist
    for directory, name in [
        (JSON_FILES_DIR, "JSON"),
        (AUDIO_FILES_DIR, "Audio"),
        (TRANSCRIPTION_FILES_DIR, "Transcription"),
    ]:
        if os.path.exists(directory):
            print(f"  ✓ {name} directory exists: {directory}")
        else:
            print(f"  ✗ {name} directory missing: {directory}")

    while True:
        try:
            # Find queued items by scanning JSON files
            json_files = glob.glob(os.path.join(JSON_FILES_DIR, "*.json"))
            print(f"[{datetime.now()}] Found {len(json_files)} JSON files to check")

            queued_items = []

            for json_file in json_files:
                audio_id = os.path.basename(json_file).replace(".json", "")
                print(f"[{datetime.now()}] Checking file: {json_file} -> audio_id: {audio_id}")

                try:
                    metadata = load_metadata_json(audio_id)
                    if not metadata:
                        print(f"[{datetime.now()}] Failed to load metadata for {audio_id}")
                        continue

                    status = metadata.get("status", "unknown")
                    print(f"[{datetime.now()}] Audio ID {audio_id} has status: {status}")

                    if status == "queued":
                        queued_items.append((audio_id, metadata))
                        print(f"[{datetime.now()}] Added {audio_id} to processing queue")
                except Exception as e:
                    print(f"[{datetime.now()}] Error loading metadata for {audio_id}: {str(e)}")
                    continue

            print(f"[{datetime.now()}] Found {len(queued_items)} items queued for processing")

            for audio_id, metadata in queued_items:
                print(f"[{datetime.now()}] ========== Processing audio_id: {audio_id} ==========")

                # Update status to processing in file and DB
                update_metadata_json(
                    audio_id,
                    {"status": "processing", "processing_started_at": datetime.now().isoformat()},
                )

                try:
                    supabase = get_supabase_client()
                    supabase.table("audio_recordings") \
                        .update({"status": "processing"}) \
                        .eq("audio_id", audio_id) \
                        .execute()
                    print(f"[{datetime.now()}] Updated database status to processing for {audio_id}")
                except Exception as db_error:
                    print(f"[{datetime.now()}] Failed to update database status: {db_error}")

                try:
                    # Build audio path
                    audio_path = os.path.join(AUDIO_FILES_DIR, f"{audio_id}.wav")
                    print(f"[{datetime.now()}] Looking for audio file: {audio_path}")

                    if not os.path.exists(audio_path):
                        raise Exception(f"Audio file not found: {audio_path}")

                    file_size = os.path.getsize(audio_path)
                    print(f"[{datetime.now()}] Audio file exists, size: {file_size} bytes")

                    # Run transcription
                    print(f"[{datetime.now()}] Starting transcription model...")
                    result = run_model(audio_path)
                    print(f"[{datetime.now()}] Transcription completed, result type: {type(result)}")

                    if not result or "transcript" not in result:
                        raise Exception("Model returned invalid result")

                    transcript_text = result["transcript"] or ""
                    print(f"[{datetime.now()}] Transcript length: {len(transcript_text)}")

                    # Correct audio_id based on appointment date/time from DB
                    # try:
                    #     appointment_id = metadata.get("appointment_id")
                    #     if appointment_id:
                    #         appt_data = supabase.table("appointments") \
                    #             .select("appointment_date, appointment_time") \
                    #             .eq("appointment_id", int(appointment_id)) \
                    #             .single() \
                    #             .execute()
                    #         if appt_data.data:
                    #             appt_date = appt_data.data["appointment_date"]  # e.g. "2025-08-09"
                    #             appt_time = appt_data.data["appointment_time"]  # e.g. "09:00:00"
                    #             dt = datetime.strptime(f"{appt_date} {appt_time}", "%Y-%m-%d %H:%M:%S")
                    #             ms = "000"
                    #             corrected_audio_id = f"{appointment_id}_{dt.strftime('%Y-%m-%dT%H-%M-%S-')}{ms}Z"
                    #             if corrected_audio_id != audio_id:
                    #                 print(f"[{datetime.now()}] Correcting audio_id from {audio_id} to {corrected_audio_id}")
                    #                 audio_id = corrected_audio_id
                    # except Exception as e:
                    #     print(f"[{datetime.now()}] Could not correct audio_id: {e}")

                    # Save transcript to file 
                    transcript_path = save_transcript(audio_id, transcript_text)
                    print(f"[{datetime.now()}] Saved transcript to: {transcript_path}")

                    # Update file metadata with completion
                    completion_data = {
                        # "transcript": transcript_text,
                        "status": "completed",  # IMPORTANT: UI expects "completed"
                        "completed_at": datetime.now().isoformat(),
                        "transcript_path": transcript_path,
                    }
                    update_metadata_json(audio_id, completion_data)

                    # ====== Update DB: audio_recordings + transcriptions (with metadata fields) ======
                    try:
                        supabase = get_supabase_client()

                        # 1) Mark audio as transcribed
                        supabase.table("audio_recordings") \
                            .update({"status": "transcribed"}) \
                            .eq("audio_id", audio_id) \
                            .execute()

                        # 2) Prepare metadata for transcriptions insert
                        meeting_type_raw = metadata.get("meeting_type") or "GP"
                        meeting_type = str(meeting_type_raw).upper()

                        # appointment_time in table is TIME -> need "HH:MM:SS"
                        appt_iso = metadata.get("appointment_time")  # e.g. "2025-08-09T09:00:00Z"
                        appt_time_only = None
                        if appt_iso:
                            try:
                                appt_time_only = appt_iso.split("T", 1)[1].split("Z", 1)[0][:8]
                            except Exception:
                                appt_time_only = None

                        transcription_record = {
                            "audio_id": audio_id,
                            "transcript_filename": f"{audio_id}.txt",
                            "metadata_filename": f"{audio_id}.json",
                            "transcript_storage_path": transcript_path,
                            "transcribed_at": datetime.now().isoformat(),

                            # New fields
                            "appointment_time": appt_time_only,                         # "HH:MM:SS" or None
                            "location": metadata.get("location"),                       # from appointments.room
                            "role": metadata.get("role"),                               # from users.role
                            "no_of_speakers": int(metadata.get("no_of_speakers", 2)),   # default 2
                            "meeting_type": meeting_type,                                # must match enum casing
                        }

                        supabase.table("transcriptions").insert(transcription_record).execute()
                        print(f"[{datetime.now()}] Inserted transcription row for {audio_id}")

                        # Delete audio file after successful transcription
                        try:
                            if os.path.exists(audio_path):
                                os.remove(audio_path)
                                print(f"[{datetime.now()}] Deleted audio file: {audio_path}")
                                
                                # Update deleted_at in audio_recordings
                                supabase.table("audio_recordings") \
                                    .update({"deleted_at": datetime.now().isoformat()}) \
                                    .eq("audio_id", audio_id) \
                                    .execute()
                                print(f"[{datetime.now()}] Marked audio as deleted in DB for {audio_id}")
                            else:
                                print(f"[{datetime.now()}] Audio file already missing: {audio_path}")
                        except Exception as delete_err:
                            print(f"[{datetime.now()}] Error deleting audio or updating DB: {delete_err}")

                    except Exception as db_error:
                        print(f"[{datetime.now()}] Failed to update database with completion: {db_error}")

                    print(f"[{datetime.now()}] ✓ Completed transcription for {audio_id}")

                except Exception as e:
                    error_msg = str(e)
                    print(f"[{datetime.now()}] ✗ Error processing {audio_id}: {error_msg}")

                    # Update file metadata with error
                    update_metadata_json(
                        audio_id,
                        {"status": "error", "error": error_msg, "error_at": datetime.now().isoformat()},
                    )

                    # Update DB with error
                    try:
                        supabase = get_supabase_client()
                        supabase.table("audio_recordings") \
                            .update({"status": "error"}) \
                            .eq("audio_id", audio_id) \
                            .execute()
                        print(f"[{datetime.now()}] Updated database status to error for {audio_id}")
                    except Exception as db_error:
                        print(f"[{datetime.now()}] Failed to update database error status: {db_error}")

            # Sleep before checking again
            if len(queued_items) == 0:
                print(f"[{datetime.now()}] No items in queue, sleeping for 5 seconds...")
            time.sleep(5)

        except Exception as e:
            print(f"[{datetime.now()}] ✗ Queue processor error: {str(e)}")
            print(f"[{datetime.now()}] Sleeping for 10 seconds before retry...")
            time.sleep(10)


if __name__ == "__main__":
    process_queue()
