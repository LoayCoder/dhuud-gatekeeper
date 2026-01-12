import { useTranslation } from 'react-i18next';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from '@/lib/activity-logger';

export function SessionTimeoutWarning() {
  const { t } = useTranslation();
  const { isWarning, remainingTime, resetTimer } = useSessionTimeout();
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    const duration = getSessionDurationSeconds();
    await logUserActivity({ 
      eventType: 'logout',
      sessionDurationSeconds: duration ?? undefined,
    });
    clearSessionTracking();
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleStayLoggedIn = async () => {
    await logUserActivity({ eventType: 'session_extended' });
    resetTimer();
  };

  return (
    <AlertDialog open={isWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            {t('sessionTimeout.warningTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t('sessionTimeout.warningDescription', { time: formatTime(remainingTime) })}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            {t('sessionTimeout.logOutNow')}
          </Button>
          <AlertDialogAction onClick={handleStayLoggedIn}>
            {t('sessionTimeout.stayLoggedIn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
