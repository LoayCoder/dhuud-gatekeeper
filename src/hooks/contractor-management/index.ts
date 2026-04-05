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

// Types re-exported for backward compatibility
export type { GatePass } from "@/features/contractors/hooks/use-contractor-portal";

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
