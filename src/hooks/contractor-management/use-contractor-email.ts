import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractorEmailParams {
  templateSlug: string;
  email: string;
  data: Record<string, string>;
  tenant_id: string;
}

/**
 * Hook to send templated email notifications for contractor workflow
 * Uses the send-email-template edge function with database-stored templates
 */
export function useContractorEmailNotification() {
  return useMutation({
    mutationFn: async (params: ContractorEmailParams) => {
      const { data, error } = await supabase.functions.invoke("send-email-template", {
        body: {
          email: params.email,
          templateSlug: params.templateSlug,
          dataObject: params.data,
          tenant_id: params.tenant_id,
        },
      });

      if (error) {
        console.error("[ContractorEmail] Failed to send email:", error);
        throw error;
      }

      return data;
    },
  });
}

/**
 * Helper to get the appropriate template slug based on language
 */
export function getTemplateSlug(baseSlug: string, language: string = "en"): string {
  const lang = language.toLowerCase().startsWith("ar") ? "ar" : "en";
  return `${baseSlug}_${lang}`;
}

/**
 * Template slug constants for contractor workflow
 */
export const CONTRACTOR_EMAIL_TEMPLATES = {
  COMPANY_APPROVED: "company_approved",
  COMPANY_REJECTED: "company_rejected",
  WORKER_STAGE1_APPROVED: "worker_stage1_approved",
  WORKER_SECURITY_APPROVED: "worker_security_approved",
  WORKER_REJECTED: "worker_rejected",
  WORKER_SECURITY_RETURNED: "worker_security_returned",
} as const;

/**
 * Send company approval email notification
 */
export async function sendCompanyApprovedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    companyName: string;
    approvedBy: string;
    approvalDate: string;
    loginUrl: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.COMPANY_APPROVED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        company_name: params.companyName,
        approved_by: params.approvedBy,
        approval_date: params.approvalDate,
        login_url: params.loginUrl,
      },
      tenant_id: params.tenantId,
    },
  });
}

/**
 * Send company rejection email notification
 */
export async function sendCompanyRejectedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    companyName: string;
    rejectionReason: string;
    rejectedBy: string;
    rejectionDate: string;
    resubmitUrl: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.COMPANY_REJECTED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        company_name: params.companyName,
        rejection_reason: params.rejectionReason,
        rejected_by: params.rejectedBy,
        rejection_date: params.rejectionDate,
        resubmit_url: params.resubmitUrl,
      },
      tenant_id: params.tenantId,
    },
  });
}

/**
 * Send worker stage 1 approval email notification
 */
export async function sendWorkerStage1ApprovedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    workerName: string;
    companyName: string;
    approvedBy: string;
    approvalDate: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.WORKER_STAGE1_APPROVED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        worker_name: params.workerName,
        company_name: params.companyName,
        approved_by: params.approvedBy,
        approval_date: params.approvalDate,
      },
      tenant_id: params.tenantId,
    },
  });
}

/**
 * Send worker security approval email notification
 */
export async function sendWorkerSecurityApprovedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    workerName: string;
    companyName: string;
    approvedBy: string;
    approvalDate: string;
    accessDate: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.WORKER_SECURITY_APPROVED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        worker_name: params.workerName,
        company_name: params.companyName,
        approved_by: params.approvedBy,
        approval_date: params.approvalDate,
        access_date: params.accessDate,
      },
      tenant_id: params.tenantId,
    },
  });
}

/**
 * Send worker rejection email notification
 */
export async function sendWorkerRejectedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    workerName: string;
    companyName: string;
    stage: string;
    rejectedBy: string;
    rejectionDate: string;
    rejectionReason: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.WORKER_REJECTED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        worker_name: params.workerName,
        company_name: params.companyName,
        stage: params.stage,
        rejected_by: params.rejectedBy,
        rejection_date: params.rejectionDate,
        rejection_reason: params.rejectionReason,
      },
      tenant_id: params.tenantId,
    },
  });
}

/**
 * Send worker security returned email notification
 */
export async function sendWorkerSecurityReturnedEmail(
  supabaseClient: typeof supabase,
  params: {
    email: string;
    workerName: string;
    companyName: string;
    reviewerName: string;
    reviewDate: string;
    securityComments: string;
    tenantId: string;
    language?: string;
  }
) {
  const templateSlug = getTemplateSlug(CONTRACTOR_EMAIL_TEMPLATES.WORKER_SECURITY_RETURNED, params.language);
  
  return supabaseClient.functions.invoke("send-email-template", {
    body: {
      email: params.email,
      templateSlug,
      dataObject: {
        worker_name: params.workerName,
        company_name: params.companyName,
        reviewer_name: params.reviewerName,
        review_date: params.reviewDate,
        security_comments: params.securityComments,
      },
      tenant_id: params.tenantId,
    },
  });
}
