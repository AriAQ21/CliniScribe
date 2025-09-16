from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tempfile import NamedTemporaryFile
from .diarize_then_transcribe import diarize_then_transcribe
import os
import shutil

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://backend:8000"],  # frontend and backend services
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscribeRequest(BaseModel):
    audio_path: str

@app.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        # Check if the audio file exists
        if not os.path.exists(request.audio_path):
            return {"error": f"Audio file not found: {request.audio_path}"}

        # Create temp output path for transcript
        with NamedTemporaryFile(suffix=".txt", delete=False) as temp_output:
            output_path = temp_output.name

        # Run your model pipeline on the existing audio file
        diarize_then_transcribe(request.audio_path, output_path)

        # Return the transcript
        with open(output_path, "r") as f:
            transcript = f.read()

        # Clean up temp output file
        os.unlink(output_path)

        return {"transcript": transcript}

    except Exception as e:
        return {"error": str(e)}

@app.post("/transcribe-upload")
async def transcribe_uploaded_audio(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Save uploaded file to temporary location
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio_path = temp_audio.name
            shutil.copyfileobj(file.file, temp_audio)

        # Create temp output path for transcript
        with NamedTemporaryFile(suffix=".txt", delete=False) as temp_output:
            output_path = temp_output.name

        try:
            # Run your model pipeline on the uploaded audio file
            diarize_then_transcribe(temp_audio_path, output_path)

            # Return the transcript
            with open(output_path, "r") as f:
                transcript = f.read()

            return {"transcript": transcript}

        finally:
            # Clean up temp files
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
            if os.path.exists(output_path):
                os.unlink(output_path)

    except Exception as e:
        return {"error": str(e)}
