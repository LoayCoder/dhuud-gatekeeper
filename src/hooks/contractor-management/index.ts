// Re-export real implementations from the contractor feature module
export {
  useContractorPortalData,
  useContractorGatePasses,
  useContractorRepresentative,
  useCreateContractorWorker,
  useContractorPortalProjects,
  useContractorPortalWorkers,
  useContractorPortalGatePasses,
  useContractorPortalStats,
  useContractorPortalCreateWorker,
} from "@/features/contractors/hooks/use-contractor-portal";

// GatePass type for backward compatibility
export interface GatePass {
  id: string;
  reference_number: string;
  pass_date: string;
  pass_type: string;
  vehicle_plate: string | null;
  status: string;
  [key: string]: unknown;
}

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

import { useQuery } from '@tanstack/react-query';

export function useInductionVideos() {
  return useQuery({
    queryKey: ['induction-videos'],
    queryFn: async () => [] as InductionVideo[],
  });
}
