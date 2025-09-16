# Model Service

## Setup Instructions

1. **Copy your model repository contents into this directory**
   - Copy all your model files (Python scripts, requirements.txt, etc.)
   - Update the Dockerfile to match your model's requirements
   - Update the startup command in the Dockerfile

2. **Expected API Endpoint**
   Your model service should expose a POST endpoint at `/transcribe` that:
   - Accepts JSON payload: `{"audio_path": "/path/to/audio/file.wav"}`
   - Returns JSON response: `{"transcript": "transcribed text here"}`
   - Runs on port 5005

3. **Storage Integration**
   - Audio files will be available via Docker volume at `/app/storage/converted/`
   - The backend converts uploaded files to 16kHz mono WAV format
   - Your model should read from the provided file path

## Docker Integration

The model service will be started automatically with `docker-compose up` and will:
- Have access to shared audio storage via Docker volumes
- Be accessible to the backend at `http://model:5005`
- Run in its own isolated container environment

## Next Steps

1. Copy your model code into this directory
2. Update `Dockerfile` with your specific requirements
3. Test the integration with the full stack