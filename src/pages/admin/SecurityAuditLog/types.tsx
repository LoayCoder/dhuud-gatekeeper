import React from 'react';
import { Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, LogIn, LogOut, Clock, ShieldCheck, ShieldOff, ShieldAlert, KeyRound } from 'lucide-react';

export interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  metadata: {
    sensitive_data_access?: boolean;
    access_type?: string;
    target_user_id?: string;
    target_visitor_id?: string;
    target_tenant_id?: string;
    access_granted?: boolean;
    reason?: string;
    timestamp?: string;
    target_user_name?: string;
    target_user_email?: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
    ip_address?: string;
    user_agent?: string;
    risk_score?: number;
    risk_factors?: string[];
    is_suspicious?: boolean;
    is_new_device?: boolean;
    is_new_location?: boolean;
    country?: string;
    city?: string;
    login_success?: boolean;
    failure_reason?: string;
    device_fingerprint?: string;
  } | null;
  session_duration_seconds?: number | null;
  created_at: string;
  user_name?: string | null;
  ip_address?: string | null;
}

interface LoginHistoryRecord {
  id: string;
  user_id: string;
  email: string;
  ip_address: string | null;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  is_vpn: boolean;
  is_proxy: boolean;
  device_fingerprint: string | null;
  user_agent: string | null;
  platform: string | null;
  browser: string | null;
  risk_score: number;
  risk_factors: string[];
  is_suspicious: boolean;
  is_new_device: boolean;
  is_new_location: boolean;
  login_success: boolean;
  failure_reason: string | null;
  created_at: string;
  user_name?: string | null;
}

export const accessTypeLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  profile_phone_viewed: { label: "Phone Number", icon: <Eye className="h-3 w-3" />, variant: "secondary" },
  profile_emergency_contact_viewed: { label: "Emergency Contact", icon: <Eye className="h-3 w-3" />, variant: "secondary" },
  visitor_national_id_viewed: { label: "Visitor National ID", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
  blacklist_entry_viewed: { label: "Blacklist Entry", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
  tenant_billing_viewed: { label: "Tenant Billing", icon: <Lock className="h-3 w-3" />, variant: "outline" },
  invitation_code_viewed: { label: "Invitation Code", icon: <Lock className="h-3 w-3" />, variant: "outline" },
};

export const userEventLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  user_created: { label: "User Created", icon: <UserPlus className="h-3 w-3" />, variant: "default" },
  user_updated: { label: "User Updated", icon: <Pencil className="h-3 w-3" />, variant: "secondary" },
  user_deactivated: { label: "User Deactivated", icon: <UserX className="h-3 w-3" />, variant: "destructive" },
  user_activated: { label: "User Activated", icon: <UserCheck className="h-3 w-3" />, variant: "default" },
  user_deleted: { label: "User Deleted", icon: <UserMinus className="h-3 w-3" />, variant: "destructive" },
};

export const securityEventLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  login: { label: "Login", icon: <LogIn className="h-3 w-3" />, variant: "default" },
  logout: { label: "Logout", icon: <LogOut className="h-3 w-3" />, variant: "secondary" },
  session_timeout: { label: "Session Timeout", icon: <Clock className="h-3 w-3" />, variant: "outline" },
  session_extended: { label: "Session Extended", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  mfa_enabled: { label: "MFA Enabled", icon: <ShieldCheck className="h-3 w-3" />, variant: "default" },
  mfa_disabled: { label: "MFA Disabled", icon: <ShieldOff className="h-3 w-3" />, variant: "destructive" },
  mfa_verification_failed: { label: "MFA Failed", icon: <ShieldAlert className="h-3 w-3" />, variant: "destructive" },
  backup_code_used: { label: "Backup Code Used", icon: <KeyRound className="h-3 w-3" />, variant: "destructive" },
};

export const USER_MANAGEMENT_EVENTS = ['user_created', 'user_updated', 'user_deactivated', 'user_activated', 'user_deleted'] as const;
export const SECURITY_EVENTS = ['login', 'logout', 'session_timeout', 'session_extended', 'mfa_enabled', 'mfa_disabled', 'mfa_verification_failed', 'backup_code_used'] as const;

export function getRiskBadgeVariant(riskScore: number): "default" | "secondary" | "destructive" | "outline" {
  if (riskScore >= 75) return "destructive";
  if (riskScore >= 50) return "secondary";
  return "outline";
}

export function getRiskColor(riskScore: number): string {
  if (riskScore >= 75) return "text-red-600";
  if (riskScore >= 50) return "text-amber-600";
  if (riskScore >= 25) return "text-yellow-600";
  return "text-green-600";
}

