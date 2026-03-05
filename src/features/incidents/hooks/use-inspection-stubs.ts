/**
 * Stub exports for inspection hooks and types that are referenced
 * but whose original source files were removed during migration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export function calculatePreviewDates(schedule: any): Date[] {
  return [];
}

export function useVerifyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-actions'] }),
  });
}
