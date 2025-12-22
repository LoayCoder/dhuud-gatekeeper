/**
 * Hook to preview notification recipients before incident submission
 * Shows who will be notified via which channels based on severity matrix
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export interface NotificationPreviewRecipient {
  stakeholder_role: string;
  channels: string[];
  recipient_count: number;
  condition_type: string | null;
  will_receive: boolean;
}

interface NotificationMatrixRow {
  stakeholder_role: string;
  severity_level: string;
  channels: string[];
  condition_type: string | null;
  is_active: boolean;
}

// Map stakeholder roles to display names
const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  'area_owner': { en: 'Area Owner', ar: 'مالك المنطقة' },
  'hsse_manager': { en: 'HSSE Manager', ar: 'مدير السلامة' },
  'dept_representative': { en: 'Dept. Representative', ar: 'ممثل القسم' },
  'hsse_expert': { en: 'HSSE Expert', ar: 'خبير السلامة' },
  'bc_team': { en: 'BC Team', ar: 'فريق استمرارية الأعمال' },
  'first_aider': { en: 'First Aider', ar: 'مسعف أولي' },
  'clinic_team': { en: 'Clinic Team', ar: 'الفريق الطبي' },
  'security': { en: 'Security', ar: 'الأمن' },
};

// Severity level numbers
const SEVERITY_LEVEL_MAP: Record<string, number> = {
  'level_1': 1,
  'level_2': 2,
  'level_3': 3,
  'level_4': 4,
  'level_5': 5,
};

export function useNotificationPreview(params: {
  severityLevel: SeverityLevelV2 | undefined;
  hasInjury: boolean;
  erpActivated: boolean;
  siteId?: string;
}) {
  const { profile } = useAuth();
  const { severityLevel, hasInjury, erpActivated, siteId } = params;

  // Calculate effective severity (ERP forces level_4 minimum)
  const effectiveSeverity = useMemo(() => {
    if (!severityLevel) return 'level_2';
    if (erpActivated) {
      const currentLevel = SEVERITY_LEVEL_MAP[severityLevel] || 2;
      return currentLevel < 4 ? 'level_4' : severityLevel;
    }
    return severityLevel;
  }, [severityLevel, erpActivated]);

  // Fetch notification matrix for current tenant
  const { data: matrixData, isLoading } = useQuery({
    queryKey: ['notification-matrix-preview', profile?.tenant_id, effectiveSeverity],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get matrix rules for this severity level
      const { data, error } = await supabase
        .from('incident_notification_matrix')
        .select('stakeholder_role, severity_level, channels, condition_type, is_active')
        .or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`)
        .eq('severity_level', effectiveSeverity)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Failed to fetch notification matrix:', error);
        return [];
      }

      // Deduplicate: prefer tenant-specific over global
      const roleMap = new Map<string, NotificationMatrixRow>();
      for (const row of (data || []) as NotificationMatrixRow[]) {
        if (!roleMap.has(row.stakeholder_role) || row.condition_type === null) {
          roleMap.set(row.stakeholder_role, row);
        }
      }

      return Array.from(roleMap.values());
    },
    enabled: !!profile?.tenant_id && !!effectiveSeverity,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process matrix data into preview recipients
  const previewRecipients = useMemo<NotificationPreviewRecipient[]>(() => {
    if (!matrixData) return [];

    const severityLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;

    return matrixData.map((rule) => {
      let channels = [...rule.channels];
      let willReceive = channels.length > 0;

      // Apply WhatsApp gating for levels 1-2
      if (severityLevel < 3) {
        if (rule.stakeholder_role !== 'first_aider' || !hasInjury) {
          channels = channels.filter(c => c !== 'whatsapp');
        }
      }

      // Check condition type
      if (rule.condition_type === 'injury' && !hasInjury) {
        willReceive = false;
        channels = [];
      }

      if (rule.condition_type === 'erp' && !erpActivated) {
        willReceive = false;
        channels = [];
      }

      return {
        stakeholder_role: rule.stakeholder_role,
        channels,
        recipient_count: 0, // Could be enhanced to show actual count
        condition_type: rule.condition_type,
        will_receive: willReceive && channels.length > 0,
      };
    }).filter(r => r.will_receive);
  }, [matrixData, effectiveSeverity, hasInjury, erpActivated]);

  // Get WhatsApp recipients (for warning display)
  const whatsappRecipients = useMemo(() => {
    return previewRecipients.filter(r => r.channels.includes('whatsapp'));
  }, [previewRecipients]);

  // Determine if high priority (level 3+ or high risk rating)
  const isHighPriority = useMemo(() => {
    const level = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
    return level >= 3 || erpActivated;
  }, [effectiveSeverity, erpActivated]);

  return {
    effectiveSeverity,
    previewRecipients,
    whatsappRecipients,
    isHighPriority,
    isErpOverride: erpActivated && SEVERITY_LEVEL_MAP[severityLevel || 'level_2'] < 4,
    isLoading,
    roleLabels: ROLE_LABELS,
  };
}
