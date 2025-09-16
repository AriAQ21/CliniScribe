-- Drop existing tables and recreate with new schema
DROP TABLE IF EXISTS transcriptions CASCADE;
DROP TABLE IF EXISTS audio_recordings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Schema: users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    location VARCHAR(100)
);

-- Schema: audio_recordings table
CREATE TABLE audio_recordings (
    audio_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(10) CHECK (meeting_type IN ('gp', 'mdt', 'ward')),
    upload_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'processing', 'transcribed', 'error')),
    deleted_at TIMESTAMP
);

-- Schema: transcriptions table
CREATE TABLE transcriptions (
    transcription_id SERIAL PRIMARY KEY,
    audio_id INTEGER NOT NULL UNIQUE REFERENCES audio_recordings(audio_id) ON DELETE CASCADE,
    transcribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transcript_filename VARCHAR(255) NOT NULL,
    metadata_filename VARCHAR(255) NOT NULL,
    appointment_time TIME,
    location VARCHAR(100),
    role VARCHAR(100),
    no_of_speakers INTEGER,
    meeting_type VARCHAR(10) CHECK (meeting_type IN ('gp', 'mdt', 'ward'))
);

-- Dummy user data
INSERT INTO users (first_name, last_name, role, location) VALUES
('Alice', 'Nguyen', 'GP', 'Room 1'),
('Ben', 'Turner', 'GP', 'Room 2'),
('Cara', 'Singh', 'GP', 'Room 3'),
('David', 'Okafor', 'GP', 'Room 4'),
('Ella', 'Martinez', 'GP', 'Room 5');