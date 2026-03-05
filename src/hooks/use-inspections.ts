// Re-export from features location
export * from '@/features/incidents/hooks/use-inspections/use-inspection-hooks';

// TemplateItem type stub
export interface TemplateItem {
  id: string;
  template_id: string;
  question: string;
  question_ar?: string;
  response_type: string;
  sort_order: number;
  is_required?: boolean;
  is_active?: boolean;
}
