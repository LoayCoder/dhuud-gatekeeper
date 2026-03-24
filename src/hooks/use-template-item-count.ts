import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the count of checklist items for a given template.
 * Used to validate that a template has items before creating a session.
 */
export function useTemplateItemCount(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-item-count', templateId],
    queryFn: async () => {
      if (!templateId) return 0;
      const { count, error } = await supabase
        .from('inspection_template_items')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', templateId)
        .is('deleted_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!templateId,
  });
}
