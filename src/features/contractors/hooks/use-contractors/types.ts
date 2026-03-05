import { Json } from '@/integrations/supabase/types';

export interface Contractor {
    id: string; contractor_code: string; full_name: string; company_name: string | null;
    mobile_number: string | null; email: string | null; national_id: string | null; nationality: string | null;
    preferred_language: string | null; permit_number: string | null; permit_expiry_date: string | null;
    safety_induction_date: string | null; safety_induction_expiry: string | null;
    medical_exam_date: string | null; medical_exam_expiry: string | null;
    photo_path: string | null; is_banned: boolean | null; ban_reason: string | null;
    ban_expires_at: string | null; banned_at: string | null; banned_by: string | null;
    allowed_sites: string[] | null; allowed_zones: string[] | null; qr_code_data: string | null;
    tenant_id: string; created_at: string | null;
}

export interface ContractorAccessLog {
    id: string; contractor_id: string; site_id: string | null; zone_id: string | null;
    guard_id: string | null; entry_time: string; exit_time: string | null; access_type: string;
    validation_status: string; validation_errors: Json; alert_sent: boolean | null;
    alert_language: string | null; notes: string | null; tenant_id: string; contractor?: Contractor;
}

export interface ContractorFilters {
    search?: string; status?: 'all' | 'active' | 'banned' | 'expired'; companyName?: string;
}

export const getProfileId = (profile: unknown): string | undefined => (profile as { id?: string })?.id;
