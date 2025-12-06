-- Phase 1: Extend witness_statements table with new columns
ALTER TABLE public.witness_statements 
ADD COLUMN IF NOT EXISTS statement_type text NOT NULL DEFAULT 'direct_entry',
ADD COLUMN IF NOT EXISTS relationship text,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS original_transcription text,
ADD COLUMN IF NOT EXISTS transcription_edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS assigned_witness_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assignment_status text;

-- Add check constraints for valid values
ALTER TABLE public.witness_statements 
ADD CONSTRAINT witness_statements_statement_type_check 
CHECK (statement_type IN ('document_upload', 'direct_entry', 'voice_recording'));

ALTER TABLE public.witness_statements 
ADD CONSTRAINT witness_statements_assignment_status_check 
CHECK (assignment_status IS NULL OR assignment_status IN ('pending', 'in_progress', 'completed', 'approved'));

-- Phase 2: Create witness_attachments table for multiple files per statement
CREATE TABLE IF NOT EXISTS public.witness_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  statement_id uuid NOT NULL REFERENCES public.witness_statements(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE public.witness_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for witness_attachments
CREATE POLICY "Users can view witness attachments in their tenant"
ON public.witness_attachments
FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create witness attachments"
ON public.witness_attachments
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can update witness attachments"
ON public.witness_attachments
FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_hsse_incident_access(auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_witness_statements_statement_type ON public.witness_statements(statement_type);
CREATE INDEX IF NOT EXISTS idx_witness_statements_assigned_witness ON public.witness_statements(assigned_witness_id);
CREATE INDEX IF NOT EXISTS idx_witness_statements_assignment_status ON public.witness_statements(assignment_status);
CREATE INDEX IF NOT EXISTS idx_witness_attachments_statement_id ON public.witness_attachments(statement_id);
CREATE INDEX IF NOT EXISTS idx_witness_attachments_tenant_id ON public.witness_attachments(tenant_id);

-- Add policy for assigned witnesses to submit their own statements
CREATE POLICY "Assigned witnesses can update their assigned statements"
ON public.witness_statements
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND assigned_witness_id = auth.uid()
  AND assignment_status IN ('pending', 'in_progress')
);

-- Add policy for assigned witnesses to view their assigned statements
CREATE POLICY "Assigned witnesses can view their assigned statements"
ON public.witness_statements
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND assigned_witness_id = auth.uid()
);