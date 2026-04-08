/**
 * PTW (Permit to Work) hooks barrel file
 * Re-exports real feature hooks for cross-module consumption
 */

// --- Real hook re-exports ---
export { usePTWTypes } from "@/features/ptw/hooks/use-ptw-types";
export {
  usePTWProjects,
  usePTWProjectClearances,
  useCreatePTWProject,
  useApproveClearanceCheck,
  useRejectClearanceCheck,
} from "@/features/ptw/hooks/use-ptw-projects";
export {
  usePTWPermits,
  usePTWPermit,
  useCreatePTWPermit,
  useUpdatePermitStatus,
  useActivePermitsForMap,
  useDeletePTWPermit,
} from "@/features/ptw/hooks/use-ptw-permits";

// --- Type re-exports ---
export type { PTWType } from "@/features/ptw/hooks/use-ptw-types";
export type { PTWProject, PTWClearanceCheck } from "@/features/ptw/hooks/use-ptw-projects";
export type { PTWPermit } from "@/features/ptw/hooks/use-ptw-permits";

// --- Aliases for backward compatibility ---
// ProjectClearanceDialog imports useProjectClearances
export { usePTWProjectClearances as useProjectClearances } from "@/features/ptw/hooks/use-ptw-projects";

// Some components import useCreatePermit / usePermits / useUpdatePermit
export { useCreatePTWPermit as useCreatePermit } from "@/features/ptw/hooks/use-ptw-permits";
export { usePTWPermits as usePermits } from "@/features/ptw/hooks/use-ptw-permits";
export { useUpdatePermitStatus as useUpdatePermit } from "@/features/ptw/hooks/use-ptw-permits";

// ActiveMapPermit type used by PermitConsole
export interface ActiveMapPermit {
  id: string;
  reference_id: string;
  gps_lat: number | null;
  gps_lng: number | null;
  permit_type?: { name: string } | null;
  [key: string]: unknown;
}
