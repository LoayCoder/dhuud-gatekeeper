import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  allow_public_gate_pass_requests: boolean;
  public_gate_pass_instructions: string | null;
  public_gate_pass_instructions_ar: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_name?: string | null;
}

/**
 * Fetch tenant information by slug for public pages
 * This hook works without authentication
 */
export function useTenantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-tenant", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Tenant slug is required");

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          slug,
          logo_url,
          brand_color,
          allow_public_gate_pass_requests,
          public_gate_pass_instructions,
          public_gate_pass_instructions_ar,
          emergency_contact_number,
          emergency_contact_name
        `)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Tenant not found");

      return data as PublicTenant;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}

/**
 * Check if public gate pass requests are enabled for a tenant
 */
export function usePublicGatePassEnabled(slug: string | undefined) {
  const { data: tenant, isLoading, error } = useTenantBySlug(slug);

  return {
    isEnabled: tenant?.allow_public_gate_pass_requests ?? false,
    tenant,
    isLoading,
    error,
  };
}
