-- Clean up all existing audio and transcription data
-- Delete all transcription records
DELETE FROM transcriptions;

-- Delete all audio recording records
DELETE FROM audio_recordings;

-- Reset the ID sequences to start fresh
ALTER SEQUENCE transcriptions_transcription_id_seq RESTART WITH 1;
ALTER SEQUENCE audio_recordings_audio_id_seq RESTART WITH 1;