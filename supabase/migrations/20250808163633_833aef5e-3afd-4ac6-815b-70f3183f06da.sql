-- Add file path columns to existing tables for simple file tracking
ALTER TABLE audio_recordings 
ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS converted_path VARCHAR(500);

-- Update status column to have default value
ALTER TABLE audio_recordings 
ALTER COLUMN status SET DEFAULT 'queued';