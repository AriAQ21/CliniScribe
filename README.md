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

In the .env file, update the storage directories to match your server workspace.
   ```bash
   mkdir -p storage/audio storage/converted
   ```


JSON_FILES_DIR="/home/arifqawi/storage/json_files"
TRANSCRIPTION_FILES_DIR="/home/arifqawi/storage/transcription_files"
