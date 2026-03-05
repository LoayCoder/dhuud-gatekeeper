import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractorPersonnelInfo {
  companyName: string | null;
  contractorRepresentative: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  safetyOfficer: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  clientSiteRepresentative: {
    name: string | null;
  } | null;
}

export function useContractorPersonnel(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor-personnel', companyId],
    queryFn: async (): Promise<ContractorPersonnelInfo | null> => {
      if (!companyId) return null;

      // Fetch company basic info only (no legacy site rep fields)
      const { data: company, error: companyError } = await supabase
        .from('contractor_companies')
        .select(`
          company_name,
          client_site_rep_id
        `)
        .eq('id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching contractor company:', companyError);
        return null;
      }

      if (!company) return null;

      // Fetch contractor site representative from dedicated table (ONLY SOURCE)
      const { data: siteRep } = await supabase
        .from('contractor_site_representatives')
        .select('full_name, mobile_number, phone, email')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      // Fetch primary safety officer from contractor_safety_officers table
      const { data: primaryOfficer } = await supabase
        .from('contractor_safety_officers')
        .select('name, phone, email')
        .eq('company_id', companyId)
        .eq('is_primary', true)
        .is('deleted_at', null)
        .maybeSingle();

      // Fetch client site representative profile if exists
      let clientSiteRep = null;
      if (company.client_site_rep_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', company.client_site_rep_id)
          .maybeSingle();
        
        if (profile) {
          clientSiteRep = {
            name: profile.full_name || null
          };
        }
      }

      // Contractor representative from dedicated table only
      const contractorRepresentative = siteRep ? {
        name: siteRep.full_name,
        phone: siteRep.mobile_number || siteRep.phone,
        email: siteRep.email
      } : null;

      // Safety officer from dedicated table only
      const safetyOfficer = primaryOfficer ? {
        name: primaryOfficer.name,
        phone: primaryOfficer.phone,
        email: primaryOfficer.email
      } : null;

      return {
        companyName: company.company_name,
        contractorRepresentative,
        safetyOfficer,
        clientSiteRepresentative: clientSiteRep
      };
    },
    enabled: !!companyId
  });
}
