-- Create appointments table with simple structure matching existing schema
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    room VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add appointment_id foreign key to audio_recordings
ALTER TABLE audio_recordings 
ADD COLUMN appointment_id INTEGER REFERENCES appointments(appointment_id) ON DELETE SET NULL;

-- Insert sample appointment data matching current mock data
INSERT INTO appointments (user_id, patient_name, doctor_name, room, appointment_date, appointment_time) VALUES
(1, 'Sarah Johnson', 'Dr. Smith', 'Room 1', '2025-08-09', '09:00'),
(2, 'Michael Chen', 'Dr. Williams', 'Room 2', '2025-08-09', '09:30'), 
(1, 'Emma Williams', 'Dr. Smith', 'Room 1', '2025-08-09', '10:15'),
(3, 'James Rodriguez', 'Dr. Brown', 'Room 3', '2025-08-09', '11:00'),
(2, 'Lisa Thompson', 'Dr. Williams', 'Room 2', '2025-08-09', '11:45'),
(4, 'David Kumar', 'Dr. Johnson', 'Room 4', '2025-08-09', '14:00');