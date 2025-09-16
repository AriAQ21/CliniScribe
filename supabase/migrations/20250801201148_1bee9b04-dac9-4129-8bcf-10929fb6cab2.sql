-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'GP';

-- Add display_name field to profiles table for doctor names
ALTER TABLE public.profiles ADD COLUMN display_name TEXT;