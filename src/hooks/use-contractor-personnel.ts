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
  siteRepresentative: {
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

      // Fetch company info with site rep fields and client site rep
      const { data: company, error: companyError } = await supabase
        .from('contractor_companies')
        .select(`
          company_name,
          contractor_site_rep_name,
          contractor_site_rep_phone,
          contractor_site_rep_email,
          contractor_safety_officer_name,
          contractor_safety_officer_phone,
          contractor_safety_officer_email,
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

      // Fetch primary contractor representative
      const { data: primaryRep } = await supabase
        .from('contractor_representatives')
        .select('full_name, mobile_number, email')
        .eq('company_id', companyId)
        .eq('is_primary', true)
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

      // Determine safety officer - prefer from safety_officers table, fallback to company fields
      const safetyOfficerFromTable = primaryOfficer ? {
        name: primaryOfficer.name,
        phone: primaryOfficer.phone,
        email: primaryOfficer.email
      } : null;

      const safetyOfficerFromCompany = company.contractor_safety_officer_name ? {
        name: company.contractor_safety_officer_name,
        phone: company.contractor_safety_officer_phone,
        email: company.contractor_safety_officer_email
      } : null;

      return {
        companyName: company.company_name,
        contractorRepresentative: primaryRep ? {
          name: primaryRep.full_name,
          phone: primaryRep.mobile_number,
          email: primaryRep.email
        } : null,
        safetyOfficer: safetyOfficerFromTable || safetyOfficerFromCompany,
        siteRepresentative: company.contractor_site_rep_name ? {
          name: company.contractor_site_rep_name,
          phone: company.contractor_site_rep_phone,
          email: company.contractor_site_rep_email
        } : null,
        clientSiteRepresentative: clientSiteRep
      };
    },
    enabled: !!companyId
  });
}
