import { describe, it, expect } from 'vitest';
import {
  calculateProfileBilling,
  calculateUsagePercentage,
  isNearQuota,
  isOverQuota,
  formatSAR,
  calculateProportionalBilling,
  PlanPricing,
  ProfileUsageData,
} from '../pricing-engine';

// Test plan configurations matching database tiers
const STARTER_PLAN: PlanPricing = {
  name: 'starter',
  profileQuotaMonthly: 50,
  extraProfilePriceSar: 0.5,
};

const PROFESSIONAL_PLAN: PlanPricing = {
  name: 'professional',
  profileQuotaMonthly: 500,
  extraProfilePriceSar: 0.25,
};

const ENTERPRISE_PLAN: PlanPricing = {
  name: 'enterprise',
  profileQuotaMonthly: 2000,
  extraProfilePriceSar: 0.1,
};

describe('Profile Billing Calculations', () => {
  describe('Edge Case: 0 Profiles', () => {
    it('should calculate zero charges when there are no profiles', () => {
      const usage: ProfileUsageData = {
        visitorCount: 0,
        memberCount: 0,
        contractorCount: 0,
        totalProfiles: 0,
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.totalProfiles).toBe(0);
      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
      expect(result.freeQuota).toBe(50);
    });

    it('should work with zero profiles on all plan tiers', () => {
      const usage: ProfileUsageData = {
        visitorCount: 0,
        memberCount: 0,
        contractorCount: 0,
        totalProfiles: 0,
      };

      const starterResult = calculateProfileBilling(usage, STARTER_PLAN);
      const proResult = calculateProfileBilling(usage, PROFESSIONAL_PLAN);
      const enterpriseResult = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(starterResult.profileCharges).toBe(0);
      expect(proResult.profileCharges).toBe(0);
      expect(enterpriseResult.profileCharges).toBe(0);
    });
  });

  describe('Edge Case: Under Quota', () => {
    it('should calculate zero charges when under quota (Starter)', () => {
      const usage: ProfileUsageData = {
        visitorCount: 10,
        memberCount: 5,
        contractorCount: 5,
        totalProfiles: 20,
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.totalProfiles).toBe(20);
      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });

    it('should calculate zero charges when exactly 1 under quota', () => {
      const usage: ProfileUsageData = {
        visitorCount: 30,
        memberCount: 10,
        contractorCount: 9,
        totalProfiles: 49, // 1 under 50 quota
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });

    it('should handle Professional plan under quota', () => {
      const usage: ProfileUsageData = {
        visitorCount: 200,
        memberCount: 150,
        contractorCount: 100,
        totalProfiles: 450, // 50 under 500 quota
      };

      const result = calculateProfileBilling(usage, PROFESSIONAL_PLAN);

      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });
  });

  describe('Edge Case: At Quota (Boundary)', () => {
    it('should calculate zero charges when exactly at quota (Starter)', () => {
      const usage: ProfileUsageData = {
        visitorCount: 25,
        memberCount: 15,
        contractorCount: 10,
        totalProfiles: 50, // Exactly at 50 quota
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.totalProfiles).toBe(50);
      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });

    it('should calculate zero charges when exactly at quota (Professional)', () => {
      const usage: ProfileUsageData = {
        visitorCount: 200,
        memberCount: 200,
        contractorCount: 100,
        totalProfiles: 500, // Exactly at 500 quota
      };

      const result = calculateProfileBilling(usage, PROFESSIONAL_PLAN);

      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });

    it('should calculate zero charges when exactly at quota (Enterprise)', () => {
      const usage: ProfileUsageData = {
        visitorCount: 1000,
        memberCount: 600,
        contractorCount: 400,
        totalProfiles: 2000, // Exactly at 2000 quota
      };

      const result = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(result.billableProfiles).toBe(0);
      expect(result.profileCharges).toBe(0);
    });
  });

  describe('Edge Case: Over Quota', () => {
    it('should calculate correct charges when 1 over quota (Starter)', () => {
      const usage: ProfileUsageData = {
        visitorCount: 25,
        memberCount: 16,
        contractorCount: 10,
        totalProfiles: 51, // 1 over 50 quota
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.billableProfiles).toBe(1);
      expect(result.profileCharges).toBe(0.5); // 1 * 0.50 SAR
    });

    it('should calculate correct charges when significantly over quota', () => {
      const usage: ProfileUsageData = {
        visitorCount: 50,
        memberCount: 30,
        contractorCount: 20,
        totalProfiles: 100, // 50 over quota
      };

      const result = calculateProfileBilling(usage, STARTER_PLAN);

      expect(result.billableProfiles).toBe(50);
      expect(result.profileCharges).toBe(25); // 50 * 0.50 SAR
    });

    it('should calculate correct charges for Professional plan over quota', () => {
      const usage: ProfileUsageData = {
        visitorCount: 300,
        memberCount: 200,
        contractorCount: 100,
        totalProfiles: 600, // 100 over 500 quota
      };

      const result = calculateProfileBilling(usage, PROFESSIONAL_PLAN);

      expect(result.billableProfiles).toBe(100);
      expect(result.profileCharges).toBe(25); // 100 * 0.25 SAR
    });

    it('should calculate correct charges for Enterprise plan over quota', () => {
      const usage: ProfileUsageData = {
        visitorCount: 1500,
        memberCount: 800,
        contractorCount: 200,
        totalProfiles: 2500, // 500 over 2000 quota
      };

      const result = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(result.billableProfiles).toBe(500);
      expect(result.profileCharges).toBe(50); // 500 * 0.10 SAR
    });
  });

  describe('Edge Case: Large Volume Scenarios', () => {
    it('should handle 10,000 profiles correctly', () => {
      const usage: ProfileUsageData = {
        visitorCount: 5000,
        memberCount: 3000,
        contractorCount: 2000,
        totalProfiles: 10000,
      };

      const result = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(result.billableProfiles).toBe(8000); // 10000 - 2000 quota
      expect(result.profileCharges).toBe(800); // 8000 * 0.10 SAR
    });

    it('should handle 100,000 profiles correctly', () => {
      const usage: ProfileUsageData = {
        visitorCount: 50000,
        memberCount: 30000,
        contractorCount: 20000,
        totalProfiles: 100000,
      };

      const result = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(result.billableProfiles).toBe(98000);
      expect(result.profileCharges).toBe(9800); // 98000 * 0.10 SAR
    });

    it('should handle 1,000,000 profiles without precision errors', () => {
      const usage: ProfileUsageData = {
        visitorCount: 500000,
        memberCount: 300000,
        contractorCount: 200000,
        totalProfiles: 1000000,
      };

      const result = calculateProfileBilling(usage, ENTERPRISE_PLAN);

      expect(result.billableProfiles).toBe(998000);
      expect(result.profileCharges).toBe(99800);
      expect(result.breakdown.visitors).toBe(500000);
      expect(result.breakdown.members).toBe(300000);
      expect(result.breakdown.contractors).toBe(200000);
    });

    it('should maintain precision for very small rates on large volumes', () => {
      const customPlan: PlanPricing = {
        name: 'custom',
        profileQuotaMonthly: 0,
        extraProfilePriceSar: 0.01, // Very small rate
      };

      const usage: ProfileUsageData = {
        visitorCount: 10000,
        memberCount: 0,
        contractorCount: 0,
        totalProfiles: 10000,
      };

      const result = calculateProfileBilling(usage, customPlan);

      expect(result.profileCharges).toBe(100); // 10000 * 0.01
    });
  });

  describe('Usage Percentage Calculations', () => {
    it('should calculate 0% when no usage', () => {
      expect(calculateUsagePercentage(0, 100)).toBe(0);
    });

    it('should calculate 50% correctly', () => {
      expect(calculateUsagePercentage(50, 100)).toBe(50);
    });

    it('should calculate 100% at quota', () => {
      expect(calculateUsagePercentage(100, 100)).toBe(100);
    });

    it('should calculate over 100% when over quota', () => {
      expect(calculateUsagePercentage(150, 100)).toBe(150);
    });

    it('should handle zero quota edge case', () => {
      expect(calculateUsagePercentage(10, 0)).toBe(100);
    });

    it('should round to nearest integer', () => {
      expect(calculateUsagePercentage(33, 100)).toBe(33);
      expect(calculateUsagePercentage(1, 3)).toBe(33); // 33.33... rounds to 33
    });
  });

  describe('Quota Threshold Checks', () => {
    it('should correctly identify when near quota (80%+)', () => {
      expect(isNearQuota(79, 100)).toBe(false);
      expect(isNearQuota(80, 100)).toBe(true);
      expect(isNearQuota(90, 100)).toBe(true);
      expect(isNearQuota(100, 100)).toBe(true);
    });

    it('should correctly identify when over quota', () => {
      expect(isOverQuota(99, 100)).toBe(false);
      expect(isOverQuota(100, 100)).toBe(true);
      expect(isOverQuota(150, 100)).toBe(true);
    });
  });

  describe('Currency Formatting', () => {
    it('should format SAR correctly', () => {
      const formatted = formatSAR(100);
      expect(formatted).toContain('100');
      expect(formatted).toContain('SAR');
    });

    it('should handle decimal amounts', () => {
      const formatted = formatSAR(25.50);
      expect(formatted).toContain('25.50');
    });

    it('should handle zero amount', () => {
      const formatted = formatSAR(0);
      expect(formatted).toContain('0.00');
    });
  });

  describe('Proportional Billing', () => {
    it('should calculate proportional billing for mid-cycle plan change', () => {
      const result = calculateProportionalBilling(15, 30, 100, 200);
      // 15 days used at old rate: (15/30) * 100 = 50
      // 15 days remaining at new rate: (15/30) * 200 = 100
      // Total: 150
      expect(result).toBe(150);
    });

    it('should handle day 1 change (full new plan)', () => {
      const result = calculateProportionalBilling(30, 30, 100, 200);
      expect(result).toBe(200);
    });

    it('should handle last day change (full old plan)', () => {
      const result = calculateProportionalBilling(0, 30, 100, 200);
      expect(result).toBe(100);
    });
  });
});

describe('Billing Calculation Breakdown', () => {
  it('should preserve breakdown information correctly', () => {
    const usage: ProfileUsageData = {
      visitorCount: 100,
      memberCount: 50,
      contractorCount: 25,
      totalProfiles: 175,
    };

    const result = calculateProfileBilling(usage, STARTER_PLAN);

    expect(result.breakdown.visitors).toBe(100);
    expect(result.breakdown.members).toBe(50);
    expect(result.breakdown.contractors).toBe(25);
    expect(result.totalProfiles).toBe(175);
  });
});
