import { PassTypeScope } from "@/features/contractors/hooks/use-gate-pass-types";

export type ApproverScope = "external" | "internal" | "both";

export interface EditingApprover {
  id: string | null;
  user_id: string;
  approver_scope: ApproverScope;
  is_active: boolean;
}

export interface EditingPassType {
  id: string | null;
  code: string;
  name: string;
  name_ar: string;
  allowed_scope: PassTypeScope;
  is_active: boolean;
}
