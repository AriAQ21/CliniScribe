# utils.py
from pydub import AudioSegment
from fastapi import UploadFile
import json, os, io
from datetime import datetime
from config import AUDIO_FILES_DIR, JSON_FILES_DIR, TRANSCRIPTION_FILES_DIR

def _basename(audio_id_or_name: str) -> str:
    # remove known suffixes, return the base
    base = audio_id_or_name
    for ext in ('.wav', '.json', '.txt'):
        if base.endswith(ext):
            base = base[:-len(ext)]
    return base

def _wav_path(audio_id_or_name: str) -> str:
    base = _basename(audio_id_or_name)
    return os.path.join(AUDIO_FILES_DIR, f"{base}.wav")

def _json_path(audio_id_or_name: str) -> str:
    base = _basename(audio_id_or_name)
    return os.path.join(JSON_FILES_DIR, f"{base}.json")

def _txt_path(audio_id_or_name: str) -> str:
    base = _basename(audio_id_or_name)
    return os.path.join(TRANSCRIPTION_FILES_DIR, f"{base}.txt")

def convert_to_wav_16k(file: UploadFile, audio_id_or_name: str) -> str:
    """
    Convert uploaded audio to 16kHz mono WAV.

    This function:
    - Reads arbitrary input format (e.g., webm/opus from browser).
    - Downmixes polyphonic/multi-channel audio to a single mono channel.
    - Resamples to 16kHz for model compatibility.
    - Saves the result as <audio_id>.wav in AUDIO_FILES_DIR.
    """
    content = file.file.read()
    audio = AudioSegment.from_file(io.BytesIO(content))
    audio = audio.set_frame_rate(16000).set_channels(1)
    output_path = _wav_path(audio_id_or_name)
    audio.export(output_path, format="wav")
    return output_path

def save_metadata_json(audio_id_or_name: str, metadata: dict) -> str:
    """Save job metadata to <audio_id>.json"""
    json_path = _json_path(audio_id_or_name)
    with open(json_path, 'w') as f:
        json.dump(metadata, f, indent=2, default=str)
    return json_path

def load_metadata_json(audio_id_or_name: str) -> dict:
    """Load job metadata from <audio_id>.json"""
    json_path = _json_path(audio_id_or_name)
    if not os.path.exists(json_path):
        return {}
    with open(json_path, 'r') as f:
        return json.load(f)

def update_metadata_json(audio_id_or_name: str, updates: dict) -> str:
    """Update existing metadata JSON"""
    metadata = load_metadata_json(audio_id_or_name)
    metadata.update(updates)
    metadata['updated_at'] = datetime.now().isoformat()
    return save_metadata_json(audio_id_or_name, metadata)

def save_transcript(audio_id_or_name: str, transcript: str) -> str:
    """Save transcript to <audio_id>.txt"""
    txt_path = _txt_path(audio_id_or_name)
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(transcript)
    return txt_path

def load_transcript(audio_id_or_name: str) -> str:
    """Load transcript from <audio_id>.txt"""
    txt_path = _txt_path(audio_id_or_name)
    if not os.path.exists(txt_path):
        return ""
    with open(txt_path, 'r', encoding='utf-8') as f:
        return f.read()

def transcript_exists(audio_id_or_name: str) -> bool:
    """Check if transcript file exists"""
    return os.path.exists(_txt_path(audio_id_or_name))
