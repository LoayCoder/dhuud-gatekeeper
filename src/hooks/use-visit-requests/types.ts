import { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type VisitRequest = Tables<'visit_requests'>;
export type VisitRequestInsert = TablesInsert<'visit_requests'>;
export type VisitRequestUpdate = TablesUpdate<'visit_requests'>;
export type VisitStatus = Enums<'visit_status'>;

export interface VisitRequestWithRelations extends VisitRequest {
    visitor?: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        company_name: string | null;
        national_id: string | null;
        qr_code_token: string;
        host_name: string | null;
        host_phone: string | null;
        host_email: string | null;
        host_id: string | null;
    } | null;
    site?: {
        id: string;
        name: string;
    } | null;
}

export interface UseVisitRequestsFilters {
    status?: VisitStatus;
    hostId?: string;
    siteId?: string;
    todayOnly?: boolean;
}
