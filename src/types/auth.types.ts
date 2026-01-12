/**
 * Authentication & Authorization Types
 * Types for user sessions, permissions, roles, and access control
 */

// User role definitions
export type UserRole = 
  | 'super_admin'
  | 'tenant_admin'
  | 'hsse_manager'
  | 'hsse_officer'
  | 'security_manager'
  | 'security_officer'
  | 'contractor_manager'
  | 'department_head'
  | 'employee'
  | 'visitor'
  | 'contractor_worker';

// User type categories
export type UserType = 
  | 'employee'
  | 'contractor'
  | 'subcontractor'
  | 'member'
  | 'visitor';

// Permission action types
export type PermissionAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'manage';

// Module names for permission checks
export type ModuleName = 
  | 'incidents'
  | 'inspections'
  | 'assets'
  | 'contractors'
  | 'visitors'
  | 'security'
  | 'permits'
  | 'reports'
  | 'settings'
  | 'users';

// Session state
export interface SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivity: Date | null;
  expiresAt: Date | null;
}

// User profile (subset for auth context)
export interface AuthProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  user_type: UserType;
  is_active: boolean;
  has_login: boolean;
  department_id?: string | null;
  branch_id?: string | null;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// MFA types
export type MFAMethod = 'totp' | 'sms' | 'email' | 'passkey';

export interface MFAStatus {
  enabled: boolean;
  method: MFAMethod | null;
  enrolledAt: Date | null;
  lastVerifiedAt: Date | null;
}

// OAuth provider types
export type OAuthProvider = 'google' | 'microsoft' | 'github';

// Login attempt tracking
export interface LoginAttempt {
  userId: string;
  timestamp: Date;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason?: string;
}

// Session activity log
export interface SessionActivity {
  sessionId: string;
  userId: string;
  action: 'login' | 'logout' | 'refresh' | 'timeout' | 'forced_logout';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
