-- Sync existing NULL emails from auth.users to profiles
UPDATE public.profiles p 
SET email = au.email 
FROM auth.users au 
WHERE p.id = au.id AND p.email IS NULL AND au.email IS NOT NULL;