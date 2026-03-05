// Re-export contractor hooks for backward compatibility
export { useCreateContractorWorker } from '@/features/contractors/hooks/use-contractor-workers';
export { useContractorCompanies } from '@/features/contractors/hooks/use-contractor-companies/use-contractor-company-queries';
export { useContractorProjects } from '@/features/contractors/hooks/use-contractor-projects';

// Stub exports for portal features
export function useContractorPortalData() {
  return { data: null, company: null, projects: [] as any[], workers: [] as any[], isLoading: false, error: null };
}

export function useContractorGatePasses(_companyId?: string) {
  return { data: [] as any[], isLoading: false, error: null };
}

export function useInductionVideos() {
  return { data: [] as any[], isLoading: false, error: null, refetch: () => {} };
}

export type InductionVideo = {
  id: string;
  title: string;
  title_ar?: string;
  url: string;
  duration_minutes?: number;
  is_required?: boolean;
  category?: string;
  created_at?: string;
  [key: string]: any;
};
