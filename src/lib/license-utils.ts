// License checking utilities

export type UserType = 'employee' | 'contractor_longterm' | 'contractor_shortterm' | 'member' | 'visitor';

export interface UserForLicenseCheck {
  has_login?: boolean;
  user_type?: UserType | string;
  is_active?: boolean;
  is_deleted?: boolean;
}

/**
 * Check if a user counts as a licensed user (consumes license quota)
 * Licensed users are those with login access who are active
 */
export function isLicensedUser(user: UserForLicenseCheck): boolean {
  // Must have login enabled
  if (!user.has_login) return false;
  
  // Must be active
  if (!user.is_active) return false;
  
  // Must not be deleted
  if (user.is_deleted) return false;
  
  // Only certain user types count as licensed
  const licensedTypes: string[] = ['employee', 'contractor_longterm', 'member'];
  return licensedTypes.includes(user.user_type || '');
}

/**
 * Check if a user counts as a billable profile (consumes profile quota)
 * Billable profiles are those without login access
 */
export function isBillableProfile(user: UserForLicenseCheck): boolean {
  // Must not have login
  if (user.has_login) return false;
  
  // Must not be deleted
  if (user.is_deleted) return false;
  
  // Visitors, members without login, and short-term contractors are billable
  const billableTypes: string[] = ['visitor', 'member', 'contractor_shortterm'];
  return billableTypes.includes(user.user_type || '');
}

/**
 * Get user type display label key for i18n
 */
export function getUserTypeLabel(userType: UserType | string): string {
  const labels: Record<string, string> = {
    employee: 'userTypes.employee',
    contractor_longterm: 'userTypes.contractorLongterm',
    contractor_shortterm: 'userTypes.contractorShortterm',
    member: 'userTypes.member',
    visitor: 'userTypes.visitor',
  };
  return labels[userType] || 'userTypes.unknown';
}

/**
 * Check if user type typically has login
 */
export function userTypeHasLogin(userType: UserType | string): boolean {
  return ['employee', 'contractor_longterm'].includes(userType);
}

/**
 * Check if user type is contractor
 */
export function isContractorType(userType: UserType | string): boolean {
  return ['contractor_longterm', 'contractor_shortterm'].includes(userType);
}

/**
 * Get contractor type from user type
 */
export function getContractorType(userType: UserType | string): 'long_term' | 'short_term' | null {
  if (userType === 'contractor_longterm') return 'long_term';
  if (userType === 'contractor_shortterm') return 'short_term';
  return null;
}
