/**
 * Stub exports for inspection hooks, types, and workflow functions
 * that are referenced but whose original source files were removed during migration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---- Types ----

export interface TemplateItem {
  id: string;
  template_id: string;
  item_code: string;
  description: string;
  description_ar?: string;
  response_type: string;
  is_critical: boolean;
  sort_order: number;
  section?: string;
  section_ar?: string;
  [key: string]: any;
}

export interface InspectionResponse {
  id: string;
  session_id: string;
  template_item_id: string;
  response_value?: string;
  result?: string;
  notes?: string;
  [key: string]: any;
}

export interface InspectionTemplate {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  template_type: string;
  is_active: boolean;
  [key: string]: any;
}

export interface InspectionSchedule {
  id: string;
  name: string;
  reference_id: string;
  schedule_type: string;
  frequency: string;
  next_due: string | null;
  days_until: number;
  is_active: boolean;
  [key: string]: any;
}

export interface InspectionAction {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  [key: string]: any;
}

// ---- Hooks ----

export function useAssetInspections(assetId: string) {
  return useQuery({
    queryKey: ['asset-inspections', assetId],
    queryFn: async () => [] as any[],
    enabled: !!assetId,
  });
}

export function useInspectionStats() {
  return useQuery({
    queryKey: ['inspection-stats'],
    queryFn: async () => ({ total: 0, passed: 0, failed: 0, partial: 0, complianceRate: 0 }),
  });
}

export function useRecentInspections(limit = 5) {
  return useQuery({
    queryKey: ['recent-inspections', limit],
    queryFn: async () => [] as any[],
  });
}

export function useMyInspectionActions() {
  return useQuery({
    queryKey: ['my-inspection-actions'],
    queryFn: async () => [] as any[],
  });
}

export function useUpcomingSchedules(days = 14) {
  return useQuery({
    queryKey: ['upcoming-schedules', days],
    queryFn: async () => [] as any[],
  });
}

export function useOverdueSchedulesCount() {
  return useQuery({
    queryKey: ['overdue-schedules-count'],
    queryFn: async () => 0,
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useTemplatesForAsset(assetId: string) {
  return useQuery({
    queryKey: ['templates-for-asset', assetId],
    queryFn: async () => [] as any[],
    enabled: !!assetId,
  });
}

export function useInspectionTemplates() {
  return useQuery({
    queryKey: ['inspection-templates'],
    queryFn: async () => [] as any[],
  });
}

export function useTemplateItems(templateId: string) {
  return useQuery({
    queryKey: ['template-items', templateId],
    queryFn: async () => [] as TemplateItem[],
    enabled: !!templateId,
  });
}

export function useCreateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-items'] }),
  });
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-items'] }),
  });
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-items'] }),
  });
}

export function useCreateInspectionSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  });
}

export function useUpdateInspectionSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  });
}

export function calculatePreviewDates(...args: any[]): Date[] {
  return [];
}

export function useVerifyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-actions'] }),
  });
}

// Session hooks
export interface InspectionSession {
  id: string;
  status: string;
  [key: string]: any;
}

export interface SessionAsset {
  id: string;
  asset_id: string;
  [key: string]: any;
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}

export function useSessionActions(sessionId: string) {
  return useQuery({ queryKey: ['session-actions', sessionId], queryFn: async () => [] as any[], enabled: !!sessionId });
}

export function useRecordAssetInspection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }) });
}

// Photo hooks
export function useInspectionPhotos(responseId: string) {
  return useQuery({ queryKey: ['inspection-photos', responseId], queryFn: async () => [] as any[], enabled: !!responseId });
}

export function useUploadInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: any) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-photos'] }) });
}

export function useDeleteInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => id, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-photos'] }) });
}

export function getPhotoUrl(path: string): string {
  return path;
}

// Workflow service stubs
export async function performExpertScreening(...args: any[]) { return {}; }
export async function handleReporterResponse(...args: any[]) { return {}; }
export async function handleManagerApproval(...args: any[]) { return {}; }
export async function handleHSSEManagerEscalation(...args: any[]) { return {}; }
export async function startInvestigation(...args: any[]) { return {}; }
export async function handleDeptRepApproval(...args: any[]) { return {}; }
export async function canPerformExpertScreening(userId: string) { return false; }
export async function canApproveInvestigation(userId: string, incidentId: string) { return false; }
export async function getIncidentDepartmentManager(incidentId: string) { return null; }
export async function canApproveDeptRep(userId: string, incidentId: string) { return false; }
