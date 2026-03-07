/**
 * Stub exports for inspection hooks, types, and workflow functions
 * that are referenced but whose original source files were removed during migration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LucideIcon } from 'lucide-react';

// ---- Types ----

export interface TemplateItem {
  id: string;
  template_id: string;
  item_code: string;
  question: string;
  question_ar?: string;
  description: string;
  description_ar?: string;
  response_type: string;
  is_critical: boolean;
  is_required?: boolean;
  sort_order: number;
  section?: string;
  section_ar?: string;
  instructions?: string;
  instructions_ar?: string;
  min_value?: number | null;
  max_value?: number | null;
  rating_scale?: number | null;
}

export interface InspectionResponse {
  id: string;
  session_id: string;
  template_item_id: string;
  response_value?: string;
  result?: string;
  notes?: string;
}

export interface InspectionTemplate {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  template_type: string;
  is_active: boolean;
  category_id?: string;
  type_id?: string;
  branch_id?: string;
  site_id?: string;
  inspection_category_id?: string;
  area_type?: string;
  standard_reference?: string;
  passing_score_percentage?: number;
  estimated_duration_minutes?: number;
  requires_photos?: boolean;
  requires_gps?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
  scope_description?: string | null;
  category?: { name: string; name_ar: string | null } | null;
  type?: { name: string; name_ar: string | null } | null;
  branch?: { name: string } | null;
  site?: { name: string } | null;
}

/** Represents an asset inspection result (returned by useAssetInspections / useRecentInspections) */
export interface AssetInspectionResult {
  id: string;
  reference_id: string;
  asset_id: string;
  template_id: string;
  status: string;
  inspection_date: string;
  overall_result: string | null;
  summary_notes: string | null;
  inspector_id: string;
  completed_at: string | null;
  created_at: string;
  asset?: { name: string; asset_code: string } | null;
  template?: { name: string; name_ar: string | null } | null;
  inspector?: { full_name: string } | null;
}

/** Workspace inspection detail (returned by useInspection) */
export interface InspectionDetail {
  id: string;
  reference_id: string;
  asset_id: string;
  template_id: string;
  status: string;
  inspection_date: string;
  overall_result: string | null;
  summary_notes: string | null;
  asset?: { name: string; asset_code: string } | null;
  template?: { name: string; name_ar: string | null } | null;
}

export interface InspectionSchedule {
  id: string;
  name: string;
  name_ar?: string;
  reference_id: string;
  schedule_type: 'asset' | 'area' | 'audit';
  frequency: string;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';
  frequency_value: number;
  next_due: string | null;
  days_until: number;
  is_active: boolean;
  template_id: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  site_id?: string | null;
  building_id?: string | null;
  assigned_inspector_id?: string | null;
  start_date: string;
  end_date?: string | null;
  reminder_days_before: number;
  auto_generate_session: boolean;
  sessions_generated_count: number;
  last_generated?: string | null;
  assigned_inspector?: { id: string; full_name: string } | null;
  template?: { id: string; name: string; name_ar: string | null; template_type: string } | null;
  site?: { id: string; name: string } | null;
}

export interface InspectionAction {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  priority: string;
  reference_id?: string | null;
  due_date?: string | null;
  assigned_user?: { full_name: string } | null;
}

export type AssetDocumentType = 'certificate' | 'compliance' | 'inspection_report' | 'maintenance_record' | 'manual' | 'other' | 'purchase_order' | 'warranty';

export interface AssetDocument {
  id: string;
  file_name: string;
  storage_path: string;
  document_type: AssetDocumentType;
  title: string;
  expiry_date: string | null;
  created_at: string;
}

// Flexible record for stub mutations — consumers pass various shapes
type StubInput = Record<string, unknown>;

// ---- Hooks ----

export function useAssetInspections(assetId: string) {
  return useQuery({
    queryKey: ['asset-inspections', assetId],
    queryFn: async () => [] as AssetInspectionResult[],
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
    queryFn: async () => [] as AssetInspectionResult[],
  });
}

export function useMyInspectionActions() {
  return useQuery({
    queryKey: ['my-inspection-actions'],
    queryFn: async () => [] as InspectionAction[],
  });
}

export function useUpcomingSchedules(days = 14) {
  return useQuery({
    queryKey: ['upcoming-schedules', days],
    queryFn: async () => [] as InspectionSchedule[],
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
    mutationFn: async (data: StubInput) => ({ id: '', ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useTemplatesForAsset(assetId: string) {
  return useQuery({
    queryKey: ['templates-for-asset', assetId],
    queryFn: async () => [] as InspectionTemplate[],
    enabled: !!assetId,
  });
}

export function useInspectionTemplates() {
  return useQuery({
    queryKey: ['inspection-templates'],
    queryFn: async () => [] as InspectionTemplate[],
  });
}

export function useTemplateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-items', templateId],
    queryFn: async () => [] as TemplateItem[],
    enabled: !!templateId,
  });
}

export function useCreateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-items'] }),
  });
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
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
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  });
}

export function useUpdateInspectionSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  });
}

export function calculatePreviewDates(..._args: unknown[]): Date[] {
  return [];
}

export function useVerifyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-actions'] }),
  });
}

// Session hooks
export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => ({ id: '', ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => ({ id: sessionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useSessionActions(sessionId: string) {
  return useQuery({
    queryKey: ['session-actions', sessionId],
    queryFn: async () => [] as InspectionAction[],
    enabled: !!sessionId,
  });
}

export function useRecordAssetInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }),
  });
}

// Photo hooks
export function useInspectionPhotos(responseId: string) {
  return useQuery({
    queryKey: ['inspection-photos', responseId],
    queryFn: async () => [] as Array<{ id: string; storage_path: string; file_name: string }>,
    enabled: !!responseId,
  });
}

export function useUploadInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-photos'] }),
  });
}

export function useDeleteInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-photos'] }),
  });
}

export function getPhotoUrl(path: string): string {
  return path;
}

// Workflow service stubs
export async function performExpertScreening(..._args: unknown[]) { return {}; }
export async function handleReporterResponse(..._args: unknown[]) { return {}; }
export async function handleManagerApproval(..._args: unknown[]) { return {}; }
export async function handleHSSEManagerEscalation(..._args: unknown[]) { return {}; }
export async function startInvestigation(..._args: unknown[]) { return {}; }
export async function handleDeptRepApproval(..._args: unknown[]) { return {}; }
export async function canPerformExpertScreening(_userId: string) { return false; }
export async function canApproveInvestigation(_userId: string, _incidentId: string) { return false; }
export async function getIncidentDepartmentManager(_incidentId: string) { return null; }
export async function canApproveDeptRep(_userId: string, _incidentId: string) { return false; }

// Template CRUD stubs
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-templates'] }),
  });
}
export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-templates'] }),
  });
}
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-templates'] }),
  });
}
export function useBulkUpdateTemplateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-templates'] }),
  });
}
export function useBulkDeleteTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => ids,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-templates'] }),
  });
}

// Inspection workspace stubs
export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: ['inspection', id],
    queryFn: async () => ({} as InspectionDetail),
    enabled: !!id,
  });
}
export function useInspectionResponses(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-responses', sessionId],
    queryFn: async () => [] as InspectionResponse[],
    enabled: !!sessionId,
  });
}
export function useSaveInspectionResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StubInput) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-responses'] }),
  });
}
export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection'] }),
  });
}
export function useCancelInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection'] }),
  });
}

// Asset photo/document stubs  
export function useAssetPhotos(assetId: string) {
  return useQuery({
    queryKey: ['asset-photos', assetId],
    queryFn: async () => [] as Array<{ id: string; storage_path: string; file_name: string; is_primary: boolean; caption: string | null; created_at: string }>,
    enabled: !!assetId,
  });
}
export function useAssetDocuments(assetId: string) {
  return useQuery({
    queryKey: ['asset-documents', assetId],
    queryFn: async () => [] as AssetDocument[],
    enabled: !!assetId,
  });
}

// ---- Analytics & Dashboard stubs ----

export type AnalyticsPeriod = 'week' | 'month' | 'quarter';
export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  siteId?: string;
}

interface SessionTrendItem {
  date: string;
  total: number;
  completed: number;
  rate: number;
}

interface FindingsTrendItem {
  date: string;
  total: number;
  minor_nc?: number;
  major_nc?: number;
  critical_nc?: number;
  observation?: number;
  ofi?: number;
}

interface FailingItem {
  id: string;
  question: string;
  question_ar?: string;
  category?: string;
  failureCount: number;
}

interface ComplianceTrendItem {
  month: string;
  avg_compliance: number;
  session_count: number;
}

interface ClassificationCount {
  classification: string;
  count: number;
}

interface FindingsDistributionData {
  total_open: number;
  by_classification: ClassificationCount[];
}

interface RecentFinding {
  id: string;
  reference_id: string;
  classification: string;
  risk_level: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  session: { reference_id: string } | null;
}

export function useInspectionAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['inspection-analytics', filters],
    queryFn: async () => ({
      sessions: { total: 0, completed: 0, in_progress: 0 },
      completion_rate: 0,
      findings: { total: 0 },
      sla_compliance: { total_with_due: 0, on_time: 0, overdue: 0 },
    }),
  });
}

export function useSessionTrend(filters?: AnalyticsFilters) {
  return useQuery({ queryKey: ['session-trend', filters], queryFn: async () => [] as SessionTrendItem[] });
}

export function useFindingsTrend(filters?: AnalyticsFilters) {
  return useQuery({ queryKey: ['findings-trend', filters], queryFn: async () => [] as FindingsTrendItem[] });
}

export function useTopFailingItems(filters?: AnalyticsFilters) {
  return useQuery({ queryKey: ['top-failing-items', filters], queryFn: async () => [] as FailingItem[] });
}

export function useInspectionSessionStats() {
  return useQuery({
    queryKey: ['inspection-session-stats'],
    queryFn: async () => ({ total_sessions: 0, in_progress: 0, avg_compliance: 0 }),
  });
}

export function useComplianceTrend() {
  return useQuery({ queryKey: ['compliance-trend'], queryFn: async () => [] as ComplianceTrendItem[] });
}

export function useFindingsDistribution() {
  return useQuery({
    queryKey: ['findings-distribution'],
    queryFn: async () => ({ total_open: 0, by_classification: [] as ClassificationCount[] } as FindingsDistributionData),
  });
}

export function useOverdueInspectionsCount() {
  return useQuery({ queryKey: ['overdue-inspections-count'], queryFn: async () => 0 });
}

export function useRecentFindings(limit = 5) {
  return useQuery({ queryKey: ['recent-findings', limit], queryFn: async () => [] as RecentFinding[] });
}

// Schedule hooks
export function useInspectionSchedules() {
  return useQuery({ queryKey: ['inspection-schedules'], queryFn: async () => [] as InspectionSchedule[] });
}

export function useDeleteInspectionSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => id, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }) });
}

export function useToggleScheduleActive() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: { id: string; isActive: boolean }) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-schedules'] }) });
}

// Action status hooks
export function useUpdateInspectionActionStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: StubInput) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['my-inspection-actions'] }) });
}

// My Actions workflow stubs
export function useMyAssignedInvestigations() {
  return useQuery({ queryKey: ['my-assigned-investigations'], queryFn: async () => [] as Array<Record<string, unknown>> });
}

export function useMyScheduledInspections() {
  return useQuery({ queryKey: ['my-scheduled-inspections'], queryFn: async () => [] as Array<Record<string, unknown>> });
}

// KPI type
export interface KPIItem {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  status: string;
  onClick?: () => void;
}

// Inspection session hooks for pages that import from features/incidents
export function useCreateActionFromFinding() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data: StubInput) => data, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-actions'] }) });
}
