-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'GP';

-- Insert dummy user Dr. Sarah Williams
INSERT INTO public.profiles (id, email, role, created_at) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'sarah.williams@nhs.uk',
  'GP',
  now()
);