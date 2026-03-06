/**
 * PTW (Permit to Work) hooks barrel file
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- index signatures consumed by many downstream components
export interface PTWPermit { id: string; reference_id?: string; status?: string; [key: string]: any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PTWProject { id: string; name: string; reference_id: string; [key: string]: any; }

export interface PTWType {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  requires_gas_test?: boolean;
  requires_isolation?: boolean;
  requires_rescue_plan?: boolean;
  [key: string]: unknown;
}

export interface ActiveMapPermit {
  id: string;
  reference_id: string;
  gps_lat: number | null;
  gps_lng: number | null;
  permit_type?: { name: string } | null;
  [key: string]: unknown;
}

export function usePTWTypes() {
  return useQuery({ queryKey: ['ptw-types'], queryFn: async () => [] as PTWType[] });
}
export function usePTWPermits(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['ptw-permits', filters], queryFn: async () => [] as PTWPermit[] });
}
export function usePTWPermit(id?: string) {
  return useQuery({ queryKey: ['ptw-permit', id], queryFn: async () => ({} as PTWPermit), enabled: !!id });
}
export function useCreatePTWPermit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits'] }) });
}
export function useUpdatePermitStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits'] }) });
}
export function useActivePermitsForMap() {
  return useQuery({ queryKey: ['ptw-active-map'], queryFn: async () => [] as ActiveMapPermit[] });
}
export function usePTWProjects(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['ptw-projects', filters], queryFn: async () => [] as PTWProject[] });
}
export function usePTWProjectClearances(projectId?: string) {
  return useQuery({ queryKey: ['ptw-clearances', projectId], queryFn: async () => [] as Record<string, unknown>[], enabled: !!projectId });
}
export function useCreatePermit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits'] }) });
}
export function usePermits(filters?: Record<string, unknown>) {
  return usePTWPermits(filters);
}
export function useUpdatePermit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: Record<string, unknown>) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits'] }) });
}
