-- ISO 45001 & OSHA Compliance Fields for Risk Assessment

-- Add compliance columns to risk_assessments table
ALTER TABLE public.risk_assessments
ADD COLUMN IF NOT EXISTS scope_description TEXT,
ADD COLUMN IF NOT EXISTS boundaries TEXT,
ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'routine',
ADD COLUMN IF NOT EXISTS work_environment TEXT,
ADD COLUMN IF NOT EXISTS applicable_legislation JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS permit_requirements TEXT,
ADD COLUMN IF NOT EXISTS review_frequency TEXT,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.risk_assessments(id),
ADD COLUMN IF NOT EXISTS risk_tolerance TEXT,
ADD COLUMN IF NOT EXISTS acceptance_justification TEXT,
ADD COLUMN IF NOT EXISTS management_approval_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS worker_consultation_date DATE,
ADD COLUMN IF NOT EXISTS worker_consultation_notes TEXT,
ADD COLUMN IF NOT EXISTS union_representative_consulted BOOLEAN DEFAULT false;

-- Add compliance columns to risk_assessment_details table
ALTER TABLE public.risk_assessment_details
ADD COLUMN IF NOT EXISTS job_step_number INTEGER,
ADD COLUMN IF NOT EXISTS job_step_description TEXT,
ADD COLUMN IF NOT EXISTS persons_at_risk JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS number_exposed INTEGER,
ADD COLUMN IF NOT EXISTS control_hierarchy_level TEXT,
ADD COLUMN IF NOT EXISTS higher_control_justification TEXT,
ADD COLUMN IF NOT EXISTS required_ppe JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS control_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS implementation_date DATE,
ADD COLUMN IF NOT EXISTS verification_date DATE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

-- Add comments for documentation
COMMENT ON COLUMN public.risk_assessments.activity_type IS 'Type: routine, non_routine, emergency, maintenance';
COMMENT ON COLUMN public.risk_assessments.risk_tolerance IS 'Acceptability: acceptable, tolerable_alarp, unacceptable';
COMMENT ON COLUMN public.risk_assessments.review_frequency IS 'Frequency: daily, weekly, monthly, quarterly, annually';
COMMENT ON COLUMN public.risk_assessment_details.control_hierarchy_level IS 'Hierarchy: elimination, substitution, engineering, administrative, ppe';
COMMENT ON COLUMN public.risk_assessment_details.control_status IS 'Status: pending, in_progress, implemented, verified';