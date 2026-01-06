import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface AppUpdate {
  id: string;
  version: string;
  release_notes: string[];
  priority: 'normal' | 'important' | 'critical';
  broadcast_at: string;
  broadcast_by: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  tenant_id: string | null;
  created_at: string;
}

export interface VersionInfo {
  version: string;
  buildDate: string;
  releaseNotes: string[];
  priority: 'normal' | 'important' | 'critical';
}

export interface BroadcastParams {
  version: string;
  release_notes: string[];
  priority: 'normal' | 'important' | 'critical';
  tenant_ids?: string[];
  custom_title?: string;
  custom_body?: string;
  language?: string;
}

export function useAppUpdates() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch current version.json
  const versionQuery = useQuery({
    queryKey: ['version-info'],
    queryFn: async (): Promise<VersionInfo> => {
      const response = await fetch('/version.json?_=' + Date.now(), {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch version info');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch update history - use raw query to avoid TypeScript issues with new table
  const historyQuery = useQuery({
    queryKey: ['app-updates-history'],
    queryFn: async (): Promise<AppUpdate[]> => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .is('deleted_at', null)
        .order('broadcast_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as AppUpdate[];
    },
  });

  // Fetch subscription count for preview
  const subscriptionCountQuery = useQuery({
    queryKey: ['push-subscription-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async (params: BroadcastParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('broadcast-update-notification', {
        body: {
          ...params,
          language: i18n.language,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Broadcast failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['app-updates-history'] });
      toast({
        title: t('admin.updates.broadcastSuccess', 'Broadcast Successful'),
        description: t('admin.updates.broadcastDetails', {
          success: data.successful_sends,
          total: data.total_recipients,
          defaultValue: `Sent to ${data.successful_sends} of ${data.total_recipients} users`,
        }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.updates.broadcastError', 'Broadcast Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Version info
    versionInfo: versionQuery.data,
    isLoadingVersion: versionQuery.isLoading,
    
    // Update history
    updateHistory: historyQuery.data || [],
    isLoadingHistory: historyQuery.isLoading,
    
    // Subscription count
    subscriptionCount: subscriptionCountQuery.data || 0,
    
    // Broadcast
    broadcast: broadcastMutation.mutate,
    isBroadcasting: broadcastMutation.isPending,
    
    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['version-info'] });
      queryClient.invalidateQueries({ queryKey: ['app-updates-history'] });
      queryClient.invalidateQueries({ queryKey: ['push-subscription-count'] });
    },
  };
}
