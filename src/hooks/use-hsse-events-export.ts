/**
 * Hook for exporting HSSE Events to Excel/PDF
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { performSecureExport, type ReportColumn } from '@/lib/secure-export';
import { toast } from '@/hooks/use-toast';
import { formatStatusLabel } from '@/lib/incident-status-colors';
import { format } from 'date-fns';
import type { IncidentFilters } from '@/components/incidents/listing';

interface ExportableIncident {
  reference_id: string;
  title: string;
  event_type: string | null;
  subtype: string | null;
  status: string | null;
  severity_v2: string | null;
  occurred_at: string | null;
  location: string | null;
  branch_name: string | null;
  created_at: string;
}

export function useHSSEEventsExport() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.dir() === 'rtl';

  const getExportColumns = useCallback((): ReportColumn[] => {
    return [
      { id: 'reference_id', label: isRTL ? 'المرجع' : 'Reference' },
      { id: 'title', label: isRTL ? 'العنوان' : 'Title' },
      { id: 'event_type', label: isRTL ? 'نوع الحدث' : 'Event Type' },
      { id: 'subtype', label: isRTL ? 'النوع الفرعي' : 'Subtype' },
      { id: 'status', label: isRTL ? 'الحالة' : 'Status' },
      { id: 'severity', label: isRTL ? 'الخطورة' : 'Severity' },
      { id: 'occurred_at', label: isRTL ? 'تاريخ الحدوث' : 'Occurred At' },
      { id: 'location', label: isRTL ? 'الموقع' : 'Location' },
      { id: 'branch', label: isRTL ? 'الفرع' : 'Branch' },
      { id: 'created_at', label: isRTL ? 'تاريخ الإنشاء' : 'Created At' },
    ];
  }, [isRTL]);

  const formatStatus = useCallback((status: string | null): string => {
    if (!status) return '-';
    // Try to get translation, fallback to formatted status string
    const translationKey = `incidents.status.${status}`;
    const translated = t(translationKey);
    // If translation returns the key itself, format the status nicely
    if (translated === translationKey) {
      return formatStatusLabel(status);
    }
    return translated;
  }, [t]);

  const formatSeverity = useCallback((severity: string | null): string => {
    if (!severity) return '-';
    const translationKey = `incidents.severity.${severity}`;
    const translated = t(translationKey);
    if (translated === translationKey) {
      return severity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return translated;
  }, [t]);

  const formatEventType = useCallback((eventType: string | null): string => {
    if (!eventType) return '-';
    const translationKey = `incidents.eventType.${eventType}`;
    const translated = t(translationKey);
    if (translated === translationKey) {
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return translated;
  }, [t]);

  const formatDate = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateStr;
    }
  }, []);

  const fetchEventsForExport = useCallback(async (
    filters: IncidentFilters
  ): Promise<ExportableIncident[]> => {
    // Build query - use explicit column selection and handle filters separately
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        reference_id,
        title,
        event_type,
        subtype,
        status,
        severity_v2,
        occurred_at,
        location,
        created_at,
        branch:branches!incidents_branch_id_fkey(name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[HSSEEventsExport] Error fetching data:', error);
      throw error;
    }

    // Apply filters in memory to avoid type issues with dynamic filter values
    let filteredData = data || [];

    if (filters.status) {
      filteredData = filteredData.filter(i => i.status === filters.status);
    }
    if (filters.severity) {
      filteredData = filteredData.filter(i => i.severity_v2 === filters.severity);
    }
    if (filters.eventType) {
      filteredData = filteredData.filter(i => i.event_type === filters.eventType);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(i =>
        i.title?.toLowerCase().includes(searchLower) ||
        i.reference_id?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.dateRange?.from) {
      const fromDate = filters.dateRange.from.getTime();
      const toDate = filters.dateRange.to?.getTime() || fromDate;
      filteredData = filteredData.filter(i => {
        if (!i.occurred_at) return false;
        const occurredTime = new Date(i.occurred_at).getTime();
        return occurredTime >= fromDate && occurredTime <= toDate;
      });
    }

    return filteredData.map((incident) => ({
      reference_id: incident.reference_id,
      title: incident.title,
      event_type: incident.event_type,
      subtype: incident.subtype,
      status: incident.status,
      severity_v2: incident.severity_v2,
      occurred_at: incident.occurred_at,
      location: incident.location,
      branch_name: (incident.branch as { name: string } | null)?.name || null,
      created_at: incident.created_at,
    }));
  }, []);

  const exportEvents = useCallback(async (
    format: 'excel' | 'pdf',
    filters: IncidentFilters
  ): Promise<void> => {
    if (!user?.id) {
      toast({
        title: t('common.error'),
        description: t('common.unauthorized'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Fetch data
      const incidents = await fetchEventsForExport(filters);

      if (incidents.length === 0) {
        toast({
          title: t('common.noData'),
          description: t('common.noDataToExport', 'No data available to export'),
          variant: 'default',
        });
        return;
      }

      // Format data for export
      const formattedData = incidents.map((incident) => ({
        reference_id: incident.reference_id || '-',
        title: incident.title || '-',
        event_type: formatEventType(incident.event_type),
        subtype: incident.subtype || '-',
        status: formatStatus(incident.status),
        severity: formatSeverity(incident.severity_v2),
        occurred_at: formatDate(incident.occurred_at),
        location: incident.location || '-',
        branch: incident.branch_name || '-',
        created_at: formatDate(incident.created_at),
      }));

      const columns = getExportColumns();
      const reportTitle = isRTL ? 'أحداث السلامة والصحة المهنية' : 'HSSE Events Report';

      const result = await performSecureExport(
        user.id,
        'hsse_incidents',
        'incident',
        formattedData,
        columns,
        reportTitle,
        format,
        {
          status: filters.status || undefined,
          severity: filters.severity || undefined,
          eventType: filters.eventType || undefined,
          branchId: filters.branchId || undefined,
          dateRange: filters.dateRange ? {
            from: filters.dateRange.from?.toISOString(),
            to: filters.dateRange.to?.toISOString(),
          } : undefined,
        }
      );

      if (result.success) {
        toast({
          title: t('common.success'),
          description: t('common.exportSuccess', 'Export completed successfully'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: result.error || t('common.exportFailed', 'Export failed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[HSSEEventsExport] Export error:', error);
      toast({
        title: t('common.error'),
        description: t('common.exportFailed', 'Export failed'),
        variant: 'destructive',
      });
    }
  }, [user?.id, t, isRTL, fetchEventsForExport, formatStatus, formatSeverity, formatEventType, formatDate, getExportColumns]);

  return { exportEvents };
}
