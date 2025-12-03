// Pure pricing functions for the profile billing system

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

// Plan pricing configuration
export const PLAN_PRICING: Record<string, PlanPricing> = {
  starter: {
    name: 'Starter',
    profileQuotaMonthly: 50,
    extraProfilePriceSar: 0.50,
  },
  professional: {
    name: 'Professional',
    profileQuotaMonthly: 500,
    extraProfilePriceSar: 0.25,
  },
  enterprise: {
    name: 'Enterprise',
    profileQuotaMonthly: 2000,
    extraProfilePriceSar: 0.10,
  },
};

/**
 * Calculate profile billing for a given usage and plan
 */
export function calculateProfileBilling(
  usage: ProfileUsageData,
  planName: string
): BillingCalculation {
  const plan = PLAN_PRICING[planName.toLowerCase()] || PLAN_PRICING.starter;
  
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
 * Get plan pricing by name
 */
export function getPlanPricing(planName: string): PlanPricing {
  return PLAN_PRICING[planName.toLowerCase()] || PLAN_PRICING.starter;
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
