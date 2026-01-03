-- Add worker_type column to distinguish regular workers from site reps and safety officers
ALTER TABLE contractor_workers 
ADD COLUMN worker_type TEXT DEFAULT 'worker' CHECK (worker_type IN ('worker', 'site_representative', 'safety_officer'));

-- Add link to safety officer record (for sync purposes)
ALTER TABLE contractor_workers 
ADD COLUMN safety_officer_id UUID REFERENCES contractor_safety_officers(id) ON DELETE SET NULL;

-- Add index for efficient filtering by worker type
CREATE INDEX idx_contractor_workers_worker_type ON contractor_workers(worker_type);

-- Add comment for clarity
COMMENT ON COLUMN contractor_workers.worker_type IS 'Type of worker: worker, site_representative, or safety_officer';
COMMENT ON COLUMN contractor_workers.safety_officer_id IS 'Reference to the safety officer record if this worker is a safety officer';