-- Phase 5: Add expiry_warning_sent_at column to worker_inductions
ALTER TABLE worker_inductions 
ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;