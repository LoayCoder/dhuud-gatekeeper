import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BulkWorkerData {
  company_id: string;
  full_name: string;
  national_id: string;
  mobile_number: string;
  nationality?: string;
  preferred_language?: string;
}

export function useBulkImportContractorWorkers() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (workers: BulkWorkerData[]) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error("No tenant or user found");
      }

      // Prepare workers with tenant_id and pending status
      const workersToInsert = workers.map((worker) => ({
        ...worker,
        tenant_id: profile.tenant_id,
        approval_status: "pending",
        created_by: user.id,
      }));

      // Insert in batches of 50 to avoid hitting limits
      const batchSize = 50;
      const results: any[] = [];
      const errors: { national_id: string; error: string }[] = [];

      for (let i = 0; i < workersToInsert.length; i += batchSize) {
        const batch = workersToInsert.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from("contractor_workers")
          .insert(batch)
          .select("id, full_name, national_id");

        if (error) {
          // Check for duplicate national_id errors
          if (error.code === "23505") {
            // Unique constraint violation - try one by one
            for (const worker of batch) {
              const { data: singleData, error: singleError } = await supabase
                .from("contractor_workers")
                .insert(worker)
                .select("id, full_name, national_id");
              
              if (singleError) {
                errors.push({
                  national_id: worker.national_id,
                  error: singleError.message.includes("duplicate") 
                    ? "Duplicate National ID" 
                    : singleError.message,
                });
              } else if (singleData) {
                results.push(...singleData);
              }
            }
          } else {
            throw error;
          }
        } else if (data) {
          results.push(...data);
        }
      }

      return { inserted: results, errors };
    },
    onSuccess: ({ inserted, errors }) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-workers"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-stats"] });
      
      if (errors.length > 0) {
        toast.warning(
          `Imported ${inserted.length} workers. ${errors.length} failed (duplicates or errors).`
        );
      } else {
        toast.success(`Successfully imported ${inserted.length} workers for approval`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
