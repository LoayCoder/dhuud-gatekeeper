import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ContractorDocumentType = 
  | "license" 
  | "insurance" 
  | "certificate" 
  | "id_document" 
  | "contract" 
  | "safety_certification" 
  | "medical_fitness" 
  | "other";

export interface ContractorDocument {
  id: string;
  tenant_id: string;
  company_id: string | null;
  worker_id: string | null;
  document_type: ContractorDocumentType;
  title: string;
  title_ar: string | null;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface ContractorDocumentFilters {
  companyId?: string;
  workerId?: string;
  documentType?: ContractorDocumentType;
}

export function useContractorDocuments(filters: ContractorDocumentFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-documents", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("contractor_documents")
        .select("id, tenant_id, company_id, worker_id, document_type, title, title_ar, storage_path, file_name, file_size, mime_type, expiry_date, notes, uploaded_by, created_at")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.workerId) query = query.eq("worker_id", filters.workerId);
      if (filters.documentType) query = query.eq("document_type", filters.documentType);

      const { data, error } = await query;
      if (error) throw error;
      return data as ContractorDocument[];
    },
    enabled: !!tenantId,
  });
}

export function useUploadContractorDocument() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      companyId?: string;
      workerId?: string;
      documentType: ContractorDocumentType;
      title: string;
      titleAr?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Upload file to storage
      const ext = params.file.name.split(".").pop() || "pdf";
      const fileName = `${profile.tenant_id}/${params.companyId || params.workerId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("contractor-documents")
        .upload(fileName, params.file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from("contractor_documents")
        .insert({
          tenant_id: profile.tenant_id,
          company_id: params.companyId || null,
          worker_id: params.workerId || null,
          document_type: params.documentType,
          title: params.title,
          title_ar: params.titleAr || null,
          storage_path: fileName,
          file_name: params.file.name,
          file_size: params.file.size,
          mime_type: params.file.type,
          expiry_date: params.expiryDate || null,
          notes: params.notes || null,
          uploaded_by: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-documents"] });
      toast.success("Document uploaded");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContractorDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("contractor_documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-documents"] });
      toast.success("Document deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDownloadContractorDocument() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await supabase.storage
        .from("contractor-documents")
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
