-- Add email and password columns to users table
ALTER TABLE public.users 
ADD COLUMN email VARCHAR(255),
ADD COLUMN password VARCHAR(255);

-- Update existing users with email and password
UPDATE public.users 
SET 
  email = LOWER(first_name) || '@email.com',
  password = 'password'
WHERE email IS NULL;