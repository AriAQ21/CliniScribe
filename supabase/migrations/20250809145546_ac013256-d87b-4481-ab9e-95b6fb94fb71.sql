-- Update transcriptions table to use varchar for audio_id to match frontend string filenames
ALTER TABLE transcriptions DROP CONSTRAINT transcriptions_audio_id_fkey;
ALTER TABLE transcriptions ALTER COLUMN audio_id TYPE VARCHAR(255);

-- Update audio_recordings table to use varchar for audio_id as well
ALTER TABLE audio_recordings DROP CONSTRAINT audio_recordings_pkey;
ALTER TABLE audio_recordings ALTER COLUMN audio_id TYPE VARCHAR(255);
ALTER TABLE audio_recordings ADD PRIMARY KEY (audio_id);

-- Recreate the foreign key relationship
ALTER TABLE transcriptions ADD CONSTRAINT transcriptions_audio_id_fkey 
FOREIGN KEY (audio_id) REFERENCES audio_recordings(audio_id) ON DELETE CASCADE;