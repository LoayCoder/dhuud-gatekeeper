import { useQuery } from '@tanstack/react-query';

export interface InductionVideo {
  id: string;
  title: string;
  url: string;
  [key: string]: unknown;
}

export interface ContractorProject {
  id: string;
  [key: string]: unknown;
}

export interface ContractorWorker {
  id: string;
  [key: string]: unknown;
}

export function useContractorPortalData() {
  return { data: null, isLoading: false, company: null, projects: [] as ContractorProject[], workers: [] as ContractorWorker[] };
}

export function useContractorGatePasses(companyId?: string) {
  return useQuery({
    queryKey: ['contractor-gate-passes', companyId],
    queryFn: async () => [] as Record<string, unknown>[],
    enabled: !!companyId,
  });
}

export function useInductionVideos() {
  return useQuery({
    queryKey: ['induction-videos'],
    queryFn: async () => [] as InductionVideo[],
  });
}
