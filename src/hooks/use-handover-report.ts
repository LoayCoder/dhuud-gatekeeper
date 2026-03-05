import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateHandoverReportPDF, downloadHandoverPDF } from '@/lib/generate-handover-report-pdf';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function useHandoverReport(handoverId: string | null) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: handover, isLoading } = useQuery({
    queryKey: ['handover-report-data', handoverId],
    queryFn: async () => {
      if (!handoverId) return null;
      
      const { data, error } = await supabase
        .from('shift_handovers')
        .select(`
          id, tenant_id, outgoing_guard_id, incoming_guard_id, shift_date, zone_id,
          handover_time, acknowledged_at, status, outstanding_issues, equipment_checklist,
          key_observations, visitor_info, next_shift_priorities, attachments, notes,
          outgoing_signature, incoming_signature, signature_timestamp, created_at, updated_at,
          handover_type, requires_approval, approved_by, approved_at, rejection_reason,
          outgoing_guard:profiles!shift_handovers_outgoing_guard_id_fkey(full_name, employee_id),
          incoming_guard:profiles!shift_handovers_incoming_guard_id_fkey(full_name, employee_id),
          zone:security_zones(zone_name, zone_code)
        `)
        .eq('id', handoverId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!handoverId,
  });

  const generatePDF = async () => {
    if (!handover) {
      toast({ title: 'No handover data', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await generateHandoverReportPDF(handover as unknown);
      const filename = `handover-${format(new Date(handover.shift_date), 'yyyy-MM-dd')}-${handover.id.substring(0, 8)}.pdf`;
      downloadHandoverPDF(blob, filename);
      toast({ title: 'PDF downloaded successfully' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    handover,
    isLoading,
    isGenerating,
    generatePDF,
  };
}
