from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import uuid
import subprocess

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        file_id = str(uuid.uuid4())
        input_path = f"/tmp/{file_id}_{file.filename}"
        output_path = f"/tmp/{file_id}_output.txt"

        # Save uploaded audio
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Run your updated pipeline script
        command = ["python", "diarize_then_transcribe.py", input_path, output_path]
        result = subprocess.run(command, capture_output=True, text=True)

        # Debug: Print stderr if something goes wrong
        if result.returncode != 0:
            return {"error": result.stderr}

        # Read transcription
        if os.path.exists(output_path):
            with open(output_path, "r",_
