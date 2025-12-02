import { User } from "@supabase/supabase-js";

export interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  tenant_id: string;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
  created_at: string | null;
  branches?: { name: string; location: string | null } | null;
  sites?: { name: string; address: string | null } | null;
}

export interface ProfileFormData {
  fullName: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export type AuthUser = User;
