-- Remove redundant doctor_name column from appointments table
-- The doctor name can be derived from the users table via user_id foreign key
ALTER TABLE public.appointments DROP COLUMN doctor_name RESTRICT;