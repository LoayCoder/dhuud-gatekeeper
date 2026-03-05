import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import type { HostArrivalNotificationParams } from '@/features/notifications';

export function useHostArrivalNotification() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: HostArrivalNotificationParams) => {
      logger.debug('[HostNotify] Sending arrival notification to host:', params.hostPhone);

      const { sendHostArrivalNotification } = await import('@/services/notifications/notificationService');
      const data = await sendHostArrivalNotification(params);

      logger.debug('[HostNotify] Notification sent successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: t('security.gate.hostNotified', 'Host notified'),
        description: t('security.gate.hostNotifiedDesc', 'WhatsApp sent to host'),
      });
    },
    onError: (error) => {
      console.error('[HostNotify] Mutation error:', error);
      // Don't show error toast - notification failure shouldn't block entry flow
    },
  });
}

