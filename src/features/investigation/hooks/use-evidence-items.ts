// Stub: use-evidence-items
import { useQuery } from '@tanstack/react-query';

export function useEvidenceItems(incidentId: string | null) {
  return useQuery({
    queryKey: ['evidence-items', incidentId],
    queryFn: async () => [] as any[],
    enabled: !!incidentId,
  });
}
