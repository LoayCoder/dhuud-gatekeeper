import { supabase } from '../supabaseClient';
import type { Database } from '@/integrations/supabase/types';
import type { IncidentFormData } from '@/features/incidents';

type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];

export const createIncident = async (data: IncidentFormData) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Your session has expired. Please refresh the page and try again.');
    }
    const freshUserId = sessionData.session.user.id;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, assigned_department_id')
        .eq('id', freshUserId)
        .single();

    if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
    }

    const isObservation = data.event_type === 'observation';
    const reporterDeptId = data.department_id || profile?.assigned_department_id || null;
    let deptRepId: string | null = null;

    if (reporterDeptId) {
        const { data: deptRep } = await supabase
            .rpc('get_department_representative', { p_department_id: reporterDeptId });
        deptRepId = deptRep || null;
    }

    let initialStatus: string;
    if (isObservation) {
        initialStatus = 'submitted';
    } else {
        initialStatus = 'pending_dept_rep_incident_review';
    }

    const insertData: IncidentInsert & { risk_rating?: string; severity_v2?: string; severity_override_reason?: string; erp_activated?: boolean } = {
        tenant_id: profile.tenant_id,
        reporter_id: freshUserId,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        subtype: data.subtype || null,
        occurred_at: data.occurred_at,
        location: data.location || null,
        department: data.department || null,
        severity: null,
        immediate_actions: data.immediate_actions || null,
        has_injury: isObservation ? false : data.has_injury,
        injury_details: isObservation ? null : (data.has_injury ? data.injury_details : null),
        has_damage: isObservation ? false : data.has_damage,
        damage_details: isObservation ? null : (data.has_damage ? data.damage_details : null),
        status: initialStatus as 'submitted',
        approval_manager_id: isObservation ? null : deptRepId,
        site_id: data.site_id || null,
        branch_id: data.branch_id || null,
        department_id: reporterDeptId,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        special_event_id: data.special_event_id || null,
    };

    if (data.location_country) (insertData as Record<string, unknown>).location_country = data.location_country;
    if (data.location_city) (insertData as Record<string, unknown>).location_city = data.location_city;
    if (data.location_district) (insertData as Record<string, unknown>).location_district = data.location_district;
    if (data.location_street) (insertData as Record<string, unknown>).location_street = data.location_street;
    if (data.location_formatted) (insertData as Record<string, unknown>).location_formatted = data.location_formatted;

    if (data.severity) {
        (insertData as Record<string, unknown>).severity_v2 = data.severity;
        if (!isObservation) {
            if (data.severity_override_reason) {
                (insertData as Record<string, unknown>).severity_override_reason = data.severity_override_reason;
            }
            if (data.erp_activated !== undefined) {
                (insertData as Record<string, unknown>).erp_activated = data.erp_activated;
            }
        }
    }

    if (isObservation && data.risk_rating) {
        (insertData as Record<string, unknown>).risk_rating = data.risk_rating;
    }

    if (isObservation && data.closed_on_spot_data) {
        (insertData as Record<string, unknown>).immediate_actions_data = data.closed_on_spot_data;
        if (data.closed_on_spot_data.closed_on_spot) {
            insertData.status = 'closed';
        }
    }

    if (isObservation && data.recognition_type) {
        (insertData as Record<string, unknown>).recognition_type = data.recognition_type;
        if (data.recognized_user_id) {
            (insertData as Record<string, unknown>).recognized_user_id = data.recognized_user_id;
        }
        if (data.recognized_contractor_worker_id) {
            (insertData as Record<string, unknown>).recognized_contractor_worker_id = data.recognized_contractor_worker_id;
        }
    }

    if (data.related_contractor_company_id) {
        (insertData as Record<string, unknown>).related_contractor_company_id = data.related_contractor_company_id;
    }

    if (data.tags && data.tags.length > 0) {
        (insertData as Record<string, unknown>).tags = data.tags;
    }
    if (data.related_contractor_company_id) {
        (insertData as Record<string, unknown>).tag_contractor_id = data.related_contractor_company_id;
    } else if (data.department_id) {
        (insertData as Record<string, unknown>).tag_department_id = data.department_id;
    }

    if (isObservation) {
        console.log('[ObservationRouting]', {
            is_contractor_related: !!data.related_contractor_company_id,
            branchId: data.branch_id,
            departmentId: data.department_id,
            status: 'submitted',
            message: 'Observation submitted - database trigger will determine routing based on contractor relationship'
        });
    }

    const { data: incident, error } = await supabase
        .from('incidents')
        .insert(insertData)
        .select('id, reference_id')
        .single();

    if (error) throw error;

    if (!isObservation && data.has_injury && data.injury_details) {
        const oshaKeywords = [
            'fatality', 'fatal', 'death', 'deceased', 'died',
            'hospitalization', 'hospitalized', 'hospital', 'inpatient',
            'amputation', 'amputated', 'severed',
            'loss of eye', 'eye loss', 'blinded', 'blindness', 'enucleation',
        ];
        const injuryText = (typeof data.injury_details === 'string' ? data.injury_details : (data.injury_details as Record<string, unknown>)?.description as string || '').toLowerCase();
        const isOshaReportable = oshaKeywords.some(kw => injuryText.includes(kw));

        if (isOshaReportable) {
            await supabase
                .from('incidents')
                .update({ osha_reportable: true } as Record<string, unknown>)
                .eq('id', incident.id);

            supabase.functions.invoke('dispatch-incident-notification', {
                body: { incident_id: incident.id, event_type: 'osha_reportable_detected' }
            }).catch(err => console.warn('Failed to dispatch OSHA notification:', err));
        }
    }

    supabase.functions.invoke('dispatch-incident-notification', {
        body: { incident_id: incident.id, event_type: 'incident_created' }
    }).catch(err => console.warn('Failed to dispatch incident notification:', err));

    return incident;
};
