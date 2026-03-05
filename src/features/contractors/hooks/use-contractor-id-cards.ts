import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SendIdCardParams {
  company_id: string;
  tenant_id: string;
  person_type: 'site_rep' | 'safety_officer';
  safety_officer_id?: string;
  person_name: string;
  person_phone: string;
  person_email?: string;
  company_name: string;
  contract_end_date?: string;
}

interface SendIdCardResult {
  success: boolean;
  qr_record_id?: string;
  qr_token?: string;
  whatsapp_sent?: boolean;
  message_id?: string;
  error?: string;
}

export function useSendContractorIdCard() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: SendIdCardParams): Promise<SendIdCardResult> => {
      const { data, error } = await supabase.functions.invoke('send-contractor-id-card', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send ID card');
      }

      return data as SendIdCardResult;
    },
    onSuccess: (data) => {
      if (data.whatsapp_sent) {
        toast.success(t("contractors.idCard.sentSuccess", "ID card sent via WhatsApp"));
      } else {
        toast.info(t("contractors.idCard.qrCreated", "Access QR code created (WhatsApp not configured)"));
      }
    },
    onError: (error: Error) => {
      console.error('Failed to send ID card:', error);
      toast.error(t("contractors.idCard.sendError", "Failed to send ID card: {{error}}", { error: error.message }));
    },
  });
}

interface SendIdCardsForCompanyParams {
  company_id: string;
  tenant_id: string;
  company_name: string;
  contract_end_date?: string;
  site_rep?: {
    name: string;
    phone: string;
    email?: string;
  };
  safety_officers?: Array<{
    id?: string;
    name: string;
    phone: string;
    email?: string;
  }>;
}

export function useSendIdCardsForCompany() {
  const { t } = useTranslation();
  const sendIdCard = useSendContractorIdCard();

  return useMutation({
    mutationFn: async (params: SendIdCardsForCompanyParams) => {
      const results: SendIdCardResult[] = [];

      // Send to site rep if they have a phone
      if (params.site_rep?.name && params.site_rep?.phone) {
        try {
          const result = await sendIdCard.mutateAsync({
            company_id: params.company_id,
            tenant_id: params.tenant_id,
            person_type: 'site_rep',
            person_name: params.site_rep.name,
            person_phone: params.site_rep.phone,
            person_email: params.site_rep.email,
            company_name: params.company_name,
            contract_end_date: params.contract_end_date,
          });
          results.push(result);
        } catch (error) {
          console.error('Failed to send ID card to site rep:', error);
        }
      }

      // Send to each safety officer with a phone
      if (params.safety_officers) {
        for (const officer of params.safety_officers) {
          if (officer.name && officer.phone) {
            try {
              const result = await sendIdCard.mutateAsync({
                company_id: params.company_id,
                tenant_id: params.tenant_id,
                person_type: 'safety_officer',
                safety_officer_id: officer.id,
                person_name: officer.name,
                person_phone: officer.phone,
                person_email: officer.email,
                company_name: params.company_name,
                contract_end_date: params.contract_end_date,
              });
              results.push(result);
            } catch (error) {
              console.error('Failed to send ID card to safety officer:', error);
            }
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const sentCount = results.filter(r => r.whatsapp_sent).length;
      const createdCount = results.filter(r => r.success && !r.whatsapp_sent).length;
      
      if (sentCount > 0) {
        toast.success(t("contractors.idCard.batchSent", "{{count}} ID card(s) sent via WhatsApp", { count: sentCount }));
      }
      if (createdCount > 0 && sentCount === 0) {
        toast.info(t("contractors.idCard.batchCreated", "{{count}} access code(s) created", { count: createdCount }));
      }
    },
  });
}
