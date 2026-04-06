ALTER TABLE public.user_branch_assignments
  ADD CONSTRAINT user_branch_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;