import { differenceInDays, isPast } from 'date-fns';

export const EXPIRY_WARNING_DAYS = 7;

export type InductionExpiryStatus = 'expired' | 'expiring_soon' | 'valid' | 'not_completed';

export interface WorkerInduction {
  id: string;
  status: string;
  expires_at: string | null;
}

/**
 * Get the expiry status of an induction
 */
export function getInductionExpiryStatus(induction: WorkerInduction | null): InductionExpiryStatus {
  if (!induction || induction.status !== 'acknowledged') {
    return 'not_completed';
  }

  if (!induction.expires_at) {
    return 'valid'; // No expiry set means always valid
  }

  const expiryDate = new Date(induction.expires_at);
  
  if (isPast(expiryDate)) {
    return 'expired';
  }

  const daysRemaining = differenceInDays(expiryDate, new Date());
  
  if (daysRemaining <= EXPIRY_WARNING_DAYS) {
    return 'expiring_soon';
  }

  return 'valid';
}

/**
 * Get number of days until induction expires
 * Returns null if no expiry date or induction not completed
 */
export function getDaysUntilExpiry(induction: WorkerInduction | null): number | null {
  if (!induction || induction.status !== 'acknowledged' || !induction.expires_at) {
    return null;
  }

  const expiryDate = new Date(induction.expires_at);
  return differenceInDays(expiryDate, new Date());
}

/**
 * Check if induction is expiring soon (within warning threshold)
 */
export function isInductionExpiringSoon(induction: WorkerInduction | null): boolean {
  return getInductionExpiryStatus(induction) === 'expiring_soon';
}

/**
 * Check if induction has expired
 */
export function isInductionExpired(induction: WorkerInduction | null): boolean {
  return getInductionExpiryStatus(induction) === 'expired';
}
