-- 1. Fix invitations RLS - require authentication for SELECT (was exposing all codes/emails publicly)
DROP POLICY IF EXISTS "Invitations are viewable by everyone" ON public.invitations;
CREATE POLICY "Authenticated users can view invitations" ON public.invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Add visitor management policies for admins
CREATE POLICY "Admins can update visitors" ON public.visitors
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete visitors" ON public.visitors
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add role management policies (admin only)
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add visit request deletion for admins
CREATE POLICY "Admins can delete visit requests" ON public.visit_requests
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));