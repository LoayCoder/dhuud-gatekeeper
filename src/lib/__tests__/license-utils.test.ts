import { describe, it, expect } from 'vitest';
import {
  isLicensedUser,
  isBillableProfile,
  userTypeHasLogin,
  isContractorType,
  getContractorType,
  UserForLicenseCheck,
} from '../license-utils';

describe('License Utils', () => {
  describe('isLicensedUser', () => {
    it('should return true for active employee with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'employee',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(true);
    });

    it('should return true for active long-term contractor with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'contractor_longterm',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(true);
    });

    it('should return true for active member with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'member',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(true);
    });

    it('should return false for user without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'employee',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(false);
    });

    it('should return false for inactive user', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'employee',
        is_active: false,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(false);
    });

    it('should return false for deleted user', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'employee',
        is_active: true,
        is_deleted: true,
      };
      expect(isLicensedUser(user)).toBe(false);
    });

    it('should return false for visitor even with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'visitor',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(false);
    });

    it('should return false for short-term contractor even with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'contractor_shortterm',
        is_active: true,
        is_deleted: false,
      };
      expect(isLicensedUser(user)).toBe(false);
    });

    it('should handle undefined values correctly', () => {
      const user: UserForLicenseCheck = {};
      expect(isLicensedUser(user)).toBe(false);
    });
  });

  describe('isBillableProfile', () => {
    it('should return true for visitor without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'visitor',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(true);
    });

    it('should return true for member without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'member',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(true);
    });

    it('should return true for short-term contractor without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'contractor_shortterm',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(true);
    });

    it('should return false for user with login', () => {
      const user: UserForLicenseCheck = {
        has_login: true,
        user_type: 'visitor',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(false);
    });

    it('should return false for deleted profile', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'visitor',
        is_deleted: true,
      };
      expect(isBillableProfile(user)).toBe(false);
    });

    it('should return false for employee without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'employee',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(false);
    });

    it('should return false for long-term contractor without login', () => {
      const user: UserForLicenseCheck = {
        has_login: false,
        user_type: 'contractor_longterm',
        is_deleted: false,
      };
      expect(isBillableProfile(user)).toBe(false);
    });
  });

  describe('userTypeHasLogin', () => {
    it('should return true for employee', () => {
      expect(userTypeHasLogin('employee')).toBe(true);
    });

    it('should return true for long-term contractor', () => {
      expect(userTypeHasLogin('contractor_longterm')).toBe(true);
    });

    it('should return false for short-term contractor', () => {
      expect(userTypeHasLogin('contractor_shortterm')).toBe(false);
    });

    it('should return false for member', () => {
      expect(userTypeHasLogin('member')).toBe(false);
    });

    it('should return false for visitor', () => {
      expect(userTypeHasLogin('visitor')).toBe(false);
    });
  });

  describe('isContractorType', () => {
    it('should return true for long-term contractor', () => {
      expect(isContractorType('contractor_longterm')).toBe(true);
    });

    it('should return true for short-term contractor', () => {
      expect(isContractorType('contractor_shortterm')).toBe(true);
    });

    it('should return false for employee', () => {
      expect(isContractorType('employee')).toBe(false);
    });

    it('should return false for member', () => {
      expect(isContractorType('member')).toBe(false);
    });

    it('should return false for visitor', () => {
      expect(isContractorType('visitor')).toBe(false);
    });
  });

  describe('getContractorType', () => {
    it('should return long_term for long-term contractor', () => {
      expect(getContractorType('contractor_longterm')).toBe('long_term');
    });

    it('should return short_term for short-term contractor', () => {
      expect(getContractorType('contractor_shortterm')).toBe('short_term');
    });

    it('should return null for non-contractor types', () => {
      expect(getContractorType('employee')).toBeNull();
      expect(getContractorType('member')).toBeNull();
      expect(getContractorType('visitor')).toBeNull();
    });
  });
});

describe('Edge Cases for Billing Classification', () => {
  describe('User Status Combinations', () => {
    const allUserTypes = [
      'employee',
      'contractor_longterm',
      'contractor_shortterm',
      'member',
      'visitor',
    ];

    it('should classify all user types correctly when active with login', () => {
      const expectedLicensed = ['employee', 'contractor_longterm', 'member'];
      
      allUserTypes.forEach((userType) => {
        const user: UserForLicenseCheck = {
          has_login: true,
          user_type: userType,
          is_active: true,
          is_deleted: false,
        };
        
        const isLicensed = isLicensedUser(user);
        const expected = expectedLicensed.includes(userType);
        
        expect(isLicensed).toBe(expected);
      });
    });

    it('should classify all user types correctly when active without login', () => {
      const expectedBillable = ['visitor', 'member', 'contractor_shortterm'];
      
      allUserTypes.forEach((userType) => {
        const user: UserForLicenseCheck = {
          has_login: false,
          user_type: userType,
          is_active: true,
          is_deleted: false,
        };
        
        const isBillable = isBillableProfile(user);
        const expected = expectedBillable.includes(userType);
        
        expect(isBillable).toBe(expected);
      });
    });

    it('should not count any user type when deleted', () => {
      allUserTypes.forEach((userType) => {
        const user: UserForLicenseCheck = {
          has_login: true,
          user_type: userType,
          is_active: true,
          is_deleted: true,
        };
        
        expect(isLicensedUser(user)).toBe(false);
      });
    });
  });

  describe('Mutual Exclusivity', () => {
    it('should never classify a user as both licensed and billable', () => {
      const testCases: UserForLicenseCheck[] = [
        { has_login: true, user_type: 'employee', is_active: true, is_deleted: false },
        { has_login: false, user_type: 'visitor', is_active: true, is_deleted: false },
        { has_login: true, user_type: 'member', is_active: true, is_deleted: false },
        { has_login: false, user_type: 'member', is_active: true, is_deleted: false },
        { has_login: true, user_type: 'contractor_longterm', is_active: true, is_deleted: false },
        { has_login: false, user_type: 'contractor_shortterm', is_active: true, is_deleted: false },
      ];

      testCases.forEach((user) => {
        const isLicensed = isLicensedUser(user);
        const isBillable = isBillableProfile(user);
        
        // Should never be both
        expect(isLicensed && isBillable).toBe(false);
      });
    });
  });
});
