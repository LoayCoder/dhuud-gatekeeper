// Pure pricing utility functions - pricing data comes from database only
// SECURITY: Never hardcode pricing values - always fetch from server

// Re-export currency utilities for backward compatibility
export { formatCurrency, formatCurrency as formatCurrencyAmount, getCurrencyDecimals, SUPPORTED_CURRENCIES } from './currency-utils';

export interface PlanPricing {
  name: string;
  profileQuotaMonthly: number;
  extraProfilePriceSar: number;
}

export interface ProfileUsageData {
  visitorCount: number;
  memberCount: number;
  contractorCount: number;
  totalProfiles: number;
}

export interface BillingCalculation {
  planName: string;
  freeQuota: number;
  totalProfiles: number;
  billableProfiles: number;
  ratePerProfile: number;
  profileCharges: number;
  breakdown: {
    visitors: number;
    members: number;
    contractors: number;
  };
}

/**
 * Calculate profile billing for a given usage and plan pricing
 * NOTE: Plan pricing MUST come from the database, never hardcoded
 */
export function calculateProfileBilling(
  usage: ProfileUsageData,
  plan: PlanPricing
): BillingCalculation {
  const billableProfiles = Math.max(0, usage.totalProfiles - plan.profileQuotaMonthly);
  const profileCharges = billableProfiles * plan.extraProfilePriceSar;

  return {
    planName: plan.name,
    freeQuota: plan.profileQuotaMonthly,
    totalProfiles: usage.totalProfiles,
    billableProfiles,
    ratePerProfile: plan.extraProfilePriceSar,
    profileCharges,
    breakdown: {
      visitors: usage.visitorCount,
      members: usage.memberCount,
      contractors: usage.contractorCount,
    },
  };
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(used: number, quota: number): number {
  if (quota === 0) return 100;
  return Math.round((used / quota) * 100);
}

/**
 * Check if usage is near quota (>= 80%)
 */
export function isNearQuota(used: number, quota: number): boolean {
  return calculateUsagePercentage(used, quota) >= 80;
}

/**
 * Check if usage is over quota (>= 100%)
 */
export function isOverQuota(used: number, quota: number): boolean {
  return used >= quota;
}

/**
 * @deprecated Use formatCurrency from currency-utils.ts instead
 * Format currency in SAR
 */
export function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * @deprecated Use formatCurrency from currency-utils.ts instead
 * Format currency in SAR for Arabic
 */
export function formatSARArabic(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate proportional billing for plan change mid-cycle
 */
export function calculateProportionalBilling(
  daysRemaining: number,
  totalDays: number,
  oldPlanCharges: number,
  newPlanCharges: number
): number {
  const daysUsed = totalDays - daysRemaining;
  const oldPortion = (daysUsed / totalDays) * oldPlanCharges;
  const newPortion = (daysRemaining / totalDays) * newPlanCharges;
  return oldPortion + newPortion;
}
