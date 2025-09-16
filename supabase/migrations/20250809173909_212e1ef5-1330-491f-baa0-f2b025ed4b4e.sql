-- Add sample appointments for all users
INSERT INTO public.appointments (user_id, appointment_date, appointment_time, room, patient_name, doctor_name) VALUES
-- Alice's appointments (user_id: 1)
(1, '2025-08-09', '09:00:00', 'Room 1', 'John Smith', 'Dr. Alice Nguyen'),
(1, '2025-08-09', '10:30:00', 'Room 1', 'Sarah Jones', 'Dr. Alice Nguyen'),
(1, '2025-08-09', '14:00:00', 'Room 1', 'Michael Brown', 'Dr. Alice Nguyen'),
-- Ben's appointments (user_id: 2)  
(2, '2025-08-09', '09:30:00', 'Room 2', 'Emily Davis', 'Dr. Ben Turner'),
(2, '2025-08-09', '11:00:00', 'Room 2', 'James Wilson', 'Dr. Ben Turner'),
-- Cara's appointments (user_id: 3)
(3, '2025-08-09', '08:30:00', 'Room 3', 'Lisa Thompson', 'Dr. Cara Singh'),
(3, '2025-08-09', '15:30:00', 'Room 3', 'Robert Miller', 'Dr. Cara Singh'),
-- David's appointments (user_id: 4)
(4, '2025-08-09', '10:00:00', 'Room 4', 'Jennifer Garcia', 'Dr. David Okafor'),
(4, '2025-08-09', '13:30:00', 'Room 4', 'William Martinez', 'Dr. David Okafor'),
-- Ella's appointments (user_id: 5)
(5, '2025-08-09', '11:30:00', 'Room 5', 'Amanda Rodriguez', 'Dr. Ella Martinez'),
(5, '2025-08-09', '16:00:00', 'Room 5', 'Christopher Lee', 'Dr. Ella Martinez');