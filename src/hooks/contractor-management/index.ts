import { useQuery } from '@tanstack/react-query';

export interface InductionVideo {
  id: string;
  title: string;
  url: string;
  [key: string]: any;
}

export function useContractorPortalData() {
  return { data: null, isLoading: false, company: null, projects: [] as any[], workers: [] as any[] };
}

export function useContractorGatePasses(companyId?: string) {
  return useQuery({
    queryKey: ['contractor-gate-passes', companyId],
    queryFn: async () => [] as any[],
    enabled: !!companyId,
  });
}

export function useInductionVideos() {
  return useQuery({
    queryKey: ['induction-videos'],
    queryFn: async () => [] as InductionVideo[],
  });
}
