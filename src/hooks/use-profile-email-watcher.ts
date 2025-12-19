import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface UseProfileEmailWatcherOptions {
  userId: string | undefined;
  sessionEmail: string | undefined;
  enabled?: boolean;
}

/**
 * Watches for profile email changes via Realtime and triggers session refresh/logout
 * when an admin updates the user's email.
 */
export function useProfileEmailWatcher({
  userId,
  sessionEmail,
  enabled = true
}: UseProfileEmailWatcherOptions) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !sessionEmail) return;

    const channel = supabase
      .channel(`profile-email-watcher-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        async (payload) => {
          const newEmail = payload.new?.email as string | undefined;
          const oldEmail = payload.old?.email as string | undefined;
          
          // Check if email actually changed
          if (!newEmail || newEmail.toLowerCase() === oldEmail?.toLowerCase()) {
            return;
          }

          // Check if new email differs from session email
          if (newEmail.toLowerCase() !== sessionEmail.toLowerCase()) {
            console.log('[ProfileEmailWatcher] Email mismatch detected:', {
              sessionEmail,
              newProfileEmail: newEmail
            });

            // Try to refresh the session first
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('[ProfileEmailWatcher] Session refresh failed:', refreshError);
            }

            // Check if refresh fixed the mismatch
            const refreshedEmail = refreshData?.user?.email;
            if (refreshedEmail?.toLowerCase() === newEmail.toLowerCase()) {
              console.log('[ProfileEmailWatcher] Session refreshed successfully');
              toast({
                title: t('profile.emailUpdatedTitle', { defaultValue: 'Email Updated' }),
                description: t('profile.emailUpdatedSuccess', { 
                  newEmail,
                  defaultValue: `Your email has been updated to ${newEmail}.`
                }),
              });
              return;
            }

            // Session refresh didn't work, need to force logout
            toast({
              title: t('profile.emailChangedTitle', { defaultValue: 'Email Changed' }),
              description: t('profile.emailChangedNotification', { 
                newEmail,
                defaultValue: `Your email has been updated to ${newEmail} by an administrator. You will be logged out in 5 seconds.`
              }),
              variant: 'destructive',
              duration: 5000,
            });

            // Clear any existing timer
            if (logoutTimerRef.current) {
              clearTimeout(logoutTimerRef.current);
            }

            // Auto-logout after 5 seconds
            logoutTimerRef.current = setTimeout(async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, sessionEmail, enabled, toast, t, navigate]);
}
