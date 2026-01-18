/**
 * Visitor Induction Workflow Hook
 * 
 * Manages visitor induction video workflow with tracking.
 * Tracks video progress and acknowledgment.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Tables, Enums } from '@/integrations/supabase/types';

export type VisitorInduction = Tables<'visitor_inductions'>;
export type InductionStatus = Enums<'visitor_induction_status'>;

export interface InductionDetails {
  induction: VisitorInduction;
  visitor: {
    id: string;
    full_name: string;
    company_name: string | null;
  };
  video: {
    id: string;
    title: string;
    title_ar: string | null;
    video_url: string;
    duration_seconds: number | null;
  } | null;
}

// Public: Get induction details by ID (for public page)
export function useVisitorInductionDetails(inductionId: string | undefined) {
  return useQuery({
    queryKey: ['visitor-induction-details', inductionId],
    queryFn: async () => {
      if (!inductionId) throw new Error('No induction ID');

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select(`
          *,
          visitor:visitors(id, full_name, company_name),
          video:induction_videos(id, title, video_url, duration_seconds)
        `)
        .eq('id', inductionId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return {
        induction: data,
        visitor: data.visitor,
        video: data.video ? { ...data.video, title_ar: null } : null,
      } as InductionDetails;
    },
    enabled: !!inductionId,
  });
}

// Public: Update induction progress (video watch progress)
export function useUpdateInductionProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      inductionId, 
      progressPercent 
    }: { 
      inductionId: string; 
      progressPercent: number; 
    }) => {
      const updates: Record<string, unknown> = {};

      // Mark as viewed if progress starts
      if (progressPercent > 0) {
        const { data: current } = await supabase
          .from('visitor_inductions')
          .select('status, viewed_at')
          .eq('id', inductionId)
          .single();

        if (current && !current.viewed_at) {
          updates.status = 'viewed' as InductionStatus;
          updates.viewed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('visitor_inductions')
        .update(updates)
        .eq('id', inductionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-induction-details', variables.inductionId] });
    },
  });
}

// Public: Complete induction with acknowledgment
export function useCompleteVisitorInduction() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      inductionId, 
      signaturePath,
      acknowledgedItems 
    }: { 
      inductionId: string; 
      signaturePath?: string;
      acknowledgedItems?: string[];
    }) => {
      const { error } = await supabase
        .from('visitor_inductions')
        .update({
          status: 'completed' as InductionStatus,
          acknowledged_at: new Date().toISOString(),
          signature_path: signaturePath,
          progress_percent: 100,
        })
        .eq('id', inductionId);

      if (error) throw error;

      // Also update visitor's induction status
      const { data: induction } = await supabase
        .from('visitor_inductions')
        .select('visitor_id')
        .eq('id', inductionId)
        .single();

      if (induction?.visitor_id) {
        await supabase
          .from('visitors')
          .update({ 
            induction_completed_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('id', induction.visitor_id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-induction-details', variables.inductionId] });
      queryClient.invalidateQueries({ queryKey: ['visitor-inductions'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ 
        title: t('visitors.induction.completed', 'Induction completed'),
        description: t('visitors.induction.completedDesc', 'You have successfully completed the safety induction.')
      });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Admin: Send induction to visitor
export function useSendVisitorInduction() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ 
      visitorId, 
      videoId,
      sendMethod,
      expiresInDays = 7,
    }: { 
      visitorId: string; 
      videoId: string;
      sendMethod: 'whatsapp' | 'email' | 'sms';
      expiresInDays?: number;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('visitor_inductions')
        .insert({
          tenant_id: tenantId,
          visitor_id: visitorId,
          video_id: videoId,
          status: 'sent' as InductionStatus,
          sent_at: new Date().toISOString(),
          sent_by: user?.id,
          expires_at: expiresAt.toISOString(),
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-inductions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-visitor-inductions'] });
      toast({ title: t('visitors.induction.sent', 'Induction sent to visitor') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Admin: Get visitors pending induction
export function useVisitorsPendingInduction() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitors-pending-induction', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Get visitors without completed induction
      const { data, error } = await supabase
        .from('visitors')
        .select('id, full_name, company_name, phone, email, induction_completed_at')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .is('induction_completed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Admin: Get induction status summary
export function useInductionStatusSummary() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['induction-status-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select('status')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;

      const summary = {
        pending: 0,
        sent: 0,
        viewed: 0,
        completed: 0,
        expired: 0,
        total: data.length,
      };

      data.forEach(row => {
        const status = row.status as keyof typeof summary;
        if (status in summary) {
          summary[status]++;
        }
      });

      return summary;
    },
    enabled: !!tenantId,
  });
}

// Get available induction videos
export function useInductionVideosForVisitors() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['induction-videos-visitors', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('induction_videos')
        .select('id, title, description, video_url, duration_seconds, thumbnail_url, is_required')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
