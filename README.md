# CliniScribe System

A medical transcription system with React frontend, FastAPI backend, ML model service, and Supabase PostgreSQL database.

## Architecture

```
CliniScribe/
├── src/               # React + TypeScript + Tailwind CSS (frontend)
├── backend/           # FastAPI + Python
├── model/             # ML transcription service  
├── supabase/          # Supabase PostgreSQL 
└── docker-compose.yml 
```

## Application Set Up

1. **Setup storage directories and HF token** (first time only):

In the root .env file and the backend/.env file, update the storage directories to match your server workspace and add HF token:

   ```bash
   HF_TOKEN="example-not-a-token"
   AUDIO_FILES_DIR="/home/arifqawi/storage/audio_files"
   JSON_FILES_DIR="/home/arifqawi/storage/json_files"
   TRANSCRIPTION_FILES_DIR="/home/arifqawi/storage/transcription_files"
   ```

2. **Running the application (full stack with Docker):**

      ```bash
   docker-compose up
   ```

3. **Access the application**:
   - Frontend: http://localhost:8081 
   - Backend API: http://localhost:8000
   - Database: localhost:5432

## Services

- **Frontend** (Port 8081): React development server
- **Backend** (Port 8000): FastAPI application server  
- **Model** (Port 5005): ML transcription service
- **Queue Processor**: Background worker for transcription jobs
- **Database** (Port 5432): PostgreSQL database
