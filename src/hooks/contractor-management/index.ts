import { useQuery } from '@tanstack/react-query';

export interface InductionVideo {
  id: string;
  title: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- consumed by downstream components expecting indexable type
  [key: string]: any;
}

export interface ContractorProject {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ContractorWorker {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useContractorPortalData() {
  return { data: null, isLoading: false, company: null, projects: [] as ContractorProject[], workers: [] as ContractorWorker[] };
}

export interface GatePass {
  id: string;
  reference_number: string;
  pass_date: string;
  pass_type: string;
  vehicle_plate: string | null;
  status: string;
  [key: string]: unknown;
}

export function useContractorGatePasses(companyId?: string) {
  return useQuery({
    queryKey: ['contractor-gate-passes', companyId],
    queryFn: async () => [] as GatePass[],
    enabled: !!companyId,
  });
}

export function useInductionVideos() {
  return useQuery({
    queryKey: ['induction-videos'],
    queryFn: async () => [] as InductionVideo[],
  });
}
