import { supabase } from '@/integrations/supabase/client';
import { Json } from "@/integrations/supabase/types";

// ==========================================
// Risk Assessments
// ==========================================

export interface RiskAssessmentFilters {
    search?: string;
    status?: string;
    projectId?: string;
    contractorId?: string;
    riskRating?: string;
}

export async function getRiskAssessments(tenantId: string, filters: RiskAssessmentFilters = {}) {
    let query = supabase
        .from("risk_assessments")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (filters.search) {
        query = query.or(`activity_name.ilike.%${filters.search}%,assessment_number.ilike.%${filters.search}%`);
    }
    if (filters.status) {
        query = query.eq("status", filters.status);
    }
    if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
    }
    if (filters.contractorId) {
        query = query.eq("contractor_id", filters.contractorId);
    }
    if (filters.riskRating) {
        query = query.eq("overall_risk_rating", filters.riskRating);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getRiskAssessment(assessmentId: string, tenantId: string) {
    const { data, error } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("id", assessmentId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

    if (error) throw error;
    return data;
}

export interface CreateRiskAssessmentData {
    activity_name: string;
    activity_name_ar?: string;
    activity_description?: string;
    location?: string;
    project_id?: string;
    contractor_id?: string;
    template_id?: string;
    overall_risk_rating?: 'low' | 'medium' | 'high' | 'critical';
    ai_risk_score?: number;
    ai_confidence_level?: number;
    valid_until?: string;
}

export async function createRiskAssessment(data: CreateRiskAssessmentData, tenantId: string, userId: string) {
    const { data: result, error } = await supabase
        .from("risk_assessments")
        .insert({
            ...data,
            tenant_id: tenantId,
            created_by: userId,
            assessment_number: '',
        })
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function updateRiskAssessment(id: string, data: Record<string, unknown>) {
    const { data: result, error } = await supabase
        .from("risk_assessments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function approveRiskAssessment(id: string, userId: string, validUntil?: string) {
    const { data, error } = await supabase
        .from("risk_assessments")
        .update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            valid_until: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function rejectRiskAssessment(id: string, reason: string) {
    const { data, error } = await supabase
        .from("risk_assessments")
        .update({
            status: 'rejected',
            rejection_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteRiskAssessment(assessmentId: string) {
    const { error } = await supabase
        .rpc('soft_delete_risk_assessment', { p_assessment_id: assessmentId });

    if (error) throw error;
    return assessmentId;
}

// ==========================================
// Risk Assessment Details (Hazards)
// ==========================================

export async function getRiskAssessmentDetails(assessmentId: string, tenantId: string) {
    const { data, error } = await supabase
        .from("risk_assessment_details")
        .select("*")
        .eq("risk_assessment_id", assessmentId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
}

export interface CreateRiskDetailData {
    risk_assessment_id: string;
    hazard_description: string;
    hazard_description_ar?: string;
    hazard_category?: string;
    likelihood?: number;
    severity?: number;
    existing_controls?: Json[];
    additional_controls?: Json[];
    responsible_person?: string;
    target_completion_date?: string;
    residual_likelihood?: number;
    residual_severity?: number;
    ai_suggested?: boolean;
    ai_confidence?: number;
    sort_order?: number;
}

export async function createRiskDetail(data: CreateRiskDetailData, tenantId: string) {
    const { data: result, error } = await supabase
        .from("risk_assessment_details")
        .insert({
            ...data,
            tenant_id: tenantId,
        })
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function updateRiskDetail(id: string, data: Record<string, unknown>) {
    const { data: result, error } = await supabase
        .from("risk_assessment_details")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function deleteRiskDetail(id: string) {
    const { error } = await supabase
        .from("risk_assessment_details")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw error;
    return id;
}

export async function bulkCreateRiskDetails(assessmentId: string, hazards: Array<Omit<CreateRiskDetailData, 'risk_assessment_id'>>, tenantId: string) {
    const detailsToInsert = hazards.map((hazard, index) => ({
        ...hazard,
        risk_assessment_id: assessmentId,
        tenant_id: tenantId,
        sort_order: index,
    }));

    const { data, error } = await supabase
        .from("risk_assessment_details")
        .insert(detailsToInsert)
        .select();

    if (error) throw error;
    return data;
}

// ==========================================
// Risk Assessment Team
// ==========================================

export async function getRiskAssessmentTeam(assessmentId: string, tenantId: string) {
    const { data, error } = await supabase
        .from("risk_assessment_team")
        .select("*")
        .eq("risk_assessment_id", assessmentId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
}

export interface AddTeamMemberData {
    risk_assessment_id: string;
    worker_id?: string;
    user_id?: string;
    role: string;
    role_ar?: string;
    is_required?: boolean;
}

export async function addTeamMember(data: AddTeamMemberData, tenantId: string) {
    const { data: result, error } = await supabase
        .from("risk_assessment_team")
        .insert({
            ...data,
            tenant_id: tenantId,
        })
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function removeTeamMember(id: string) {
    const { error } = await supabase
        .from("risk_assessment_team")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return id;
}

export async function signAssessment(teamMemberId: string, signatureData: string) {
    const { data, error } = await supabase
        .from("risk_assessment_team")
        .update({
            signature_data: signatureData,
            signed_at: new Date().toISOString(),
        })
        .eq("id", teamMemberId)
        .select()
        .single();

    if (error) throw error;
    return data;
}
