-- Add missing consultant workflow statuses to incident_status enum
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_consultant_screening';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_consultant_review';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_consultant_actions';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_action_dispute_review';