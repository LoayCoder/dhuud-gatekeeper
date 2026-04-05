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

// Induction videos hook (stub — real implementation in features/contractors)
export { useInductionVideos } from "./use-induction-videos";
export type { InductionVideo } from "./use-induction-videos";

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

export interface ContractorProject {
  id: string;
  [key: string]: unknown;
}

export interface ContractorWorker {
  id: string;
  [key: string]: unknown;
}
