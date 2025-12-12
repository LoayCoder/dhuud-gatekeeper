-- Add pending_closure to incident_status enum
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_closure';