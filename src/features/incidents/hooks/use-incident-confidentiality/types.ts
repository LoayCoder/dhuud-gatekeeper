export type ConfidentialityLevel = 'public' | 'restricted' | 'confidential';
export interface ConfidentialitySettings { level: ConfidentialityLevel; expiry: string | null; autoDeclassifyTo: 'public' | 'restricted' | null; expiryReason: string | null; setBy: string | null; setAt: string | null; }
export interface AccessListUser { id: string; user_id: string; full_name: string; email?: string; granted_by_name: string; granted_at: string; reason?: string; }
export interface ConfidentialityAuditEntry { id: string; action: string; old_level: string | null; new_level: string | null; actor_name: string; affected_user_name?: string; reason?: string; created_at: string; }
