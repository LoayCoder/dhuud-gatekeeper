// Contractor management hooks - stubs for missing exports

export function useContractorPortalData() {
  return { data: null, isLoading: false, error: null };
}

export function useContractorGatePasses() {
  return { data: [], isLoading: false, error: null };
}

export function useInductionVideos() {
  return { data: [], isLoading: false, error: null, refetch: () => {} };
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
