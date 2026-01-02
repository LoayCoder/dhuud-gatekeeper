import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface HostArrivalNotificationParams {
  entryId: string;
  visitorName: string;
  hostPhone: string;
  visitReference: string;
  entryTime: string;
  tenantId: string;
}

export function useHostArrivalNotification() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      entryId,
      visitorName,
      hostPhone,
      visitReference,
      entryTime,
      tenantId,
    }: HostArrivalNotificationParams) => {
      console.log('[HostNotify] Sending arrival notification to host:', hostPhone);

      // Call the edge function with host_arrival notification type
      const { data, error } = await supabase.functions.invoke('send-gate-whatsapp', {
        body: {
          mobile_number: hostPhone,
          tenant_id: tenantId,
          notification_type: 'host_arrival',
          visitor_name: visitorName,
          visit_reference: visitReference,
          entry_time: entryTime,
          entry_id: entryId,
        },
      });

      if (error) {
        console.error('[HostNotify] Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[HostNotify] Notification failed:', data?.error);
        throw new Error(data?.error || 'Failed to send notification');
      }

      console.log('[HostNotify] Notification sent successfully:', data);
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
