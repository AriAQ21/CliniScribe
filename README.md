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

## To Run Tests

1. **Run Frontend Unit Tests:**

      ```bash
   docker compose run --rm frontend-tests
   ```
2. **Run Backend Unit Tests:**

   ```bash
   docker compose run --rm backend-tests
   ```

2. **Run Integration Tests:**

      ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.yml run --rm integration-tests
   ```

2. **Run E2E Tests:**

      ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.yml run --rm e2e-tests-real
   ```

  
