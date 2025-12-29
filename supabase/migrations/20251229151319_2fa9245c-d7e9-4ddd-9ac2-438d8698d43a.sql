-- =============================================
-- PHASE 1: CRITICAL INFRASTRUCTURE FIXES
-- =============================================

-- 1.1 Create worker-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('worker-photos', 'worker-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 1.2 Create contractor-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contractor-documents', 'contractor-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- 1.3 Storage policies for worker-photos bucket
CREATE POLICY "Tenant users can view worker photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'worker-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can upload worker photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'worker-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can update worker photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'worker-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can delete worker photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'worker-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- 1.4 Storage policies for contractor-documents bucket
CREATE POLICY "Tenant users can view contractor documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contractor-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can upload contractor documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contractor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can update contractor documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contractor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Tenant users can delete contractor documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contractor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- 1.5 Create contractor_documents table
CREATE TABLE IF NOT EXISTS public.contractor_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('license', 'insurance', 'certificate', 'id_document', 'contract', 'safety_certification', 'medical_fitness', 'other')),
  title TEXT NOT NULL,
  title_ar TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  expiry_warning_sent_at TIMESTAMPTZ,
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT contractor_documents_owner_check CHECK (
    (company_id IS NOT NULL AND worker_id IS NULL) OR 
    (company_id IS NULL AND worker_id IS NOT NULL) OR
    (company_id IS NOT NULL AND worker_id IS NOT NULL)
  )
);

-- Create indexes for contractor_documents
CREATE INDEX IF NOT EXISTS idx_contractor_documents_tenant ON public.contractor_documents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_documents_company ON public.contractor_documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_documents_worker ON public.contractor_documents(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_documents_expiry ON public.contractor_documents(expiry_date) WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

-- Enable RLS on contractor_documents
ALTER TABLE public.contractor_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for contractor_documents
CREATE POLICY "Tenant isolation for contractor_documents"
ON public.contractor_documents
FOR ALL
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
)
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_contractor_documents_updated_at
  BEFORE UPDATE ON public.contractor_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.6 Add audit trigger for contractor_documents
CREATE OR REPLACE FUNCTION public.log_contractor_document_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contractor_module_audit_logs (
      tenant_id, entity_type, entity_id, action, 
      new_value, actor_id, actor_type
    ) VALUES (
      NEW.tenant_id, 'contractor_document', NEW.id, 'created',
      jsonb_build_object('title', NEW.title, 'document_type', NEW.document_type, 'company_id', NEW.company_id, 'worker_id', NEW.worker_id),
      NEW.uploaded_by, 'user'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      INSERT INTO public.contractor_module_audit_logs (
        tenant_id, entity_type, entity_id, action,
        old_value, actor_id, actor_type
      ) VALUES (
        NEW.tenant_id, 'contractor_document', NEW.id, 'deleted',
        jsonb_build_object('title', OLD.title, 'document_type', OLD.document_type),
        auth.uid(), 'user'
      );
    ELSE
      INSERT INTO public.contractor_module_audit_logs (
        tenant_id, entity_type, entity_id, action,
        old_value, new_value, actor_id, actor_type
      ) VALUES (
        NEW.tenant_id, 'contractor_document', NEW.id, 'updated',
        jsonb_build_object('title', OLD.title, 'expiry_date', OLD.expiry_date),
        jsonb_build_object('title', NEW.title, 'expiry_date', NEW.expiry_date),
        auth.uid(), 'user'
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER contractor_documents_audit_trigger
  AFTER INSERT OR UPDATE ON public.contractor_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contractor_document_changes();