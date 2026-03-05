import type { Json } from '@/integrations/supabase/types';

export interface CCTVCamera { camera_id: string; location: string; date: string; start_time: string; end_time: string; }

export interface EvidenceItem {
    id: string; incident_id: string; tenant_id: string;
    evidence_type: 'photo' | 'document' | 'cctv' | 'ptw' | 'checklist' | 'video_clip';
    storage_path: string | null; file_name: string | null; file_size: number | null;
    mime_type: string | null; reference_id: string | null;
    reference_type: 'ptw' | 'checklist' | null;
    cctv_data: CCTVCamera[] | null; description: string | null;
    review_comment: string | null; reviewed_by: string | null; reviewed_at: string | null;
    uploaded_by: string; upload_session_id: string | null;
    created_at: string; updated_at: string; is_soft_deleted: boolean;
    uploader_name?: string; reviewer_name?: string;
}

export interface CreateEvidenceParams {
    incident_id: string; evidence_type: EvidenceItem['evidence_type'];
    storage_path?: string; file_name?: string; file_size?: number; mime_type?: string;
    reference_id?: string; reference_type?: 'ptw' | 'checklist';
    cctv_data?: CCTVCamera[]; description?: string;
}

export interface UpdateEvidenceReviewParams { id: string; review_comment: string; }

export type { Json };
