import { useMemo } from 'react';

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  requirements: PasswordRequirement[];
  allRequirementsMet: boolean;
}

export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      {
        key: 'minLength',
        label: 'passwordStrength.minLength',
        met: password.length >= 12,
      },
      {
        key: 'uppercase',
        label: 'passwordStrength.uppercase',
        met: /[A-Z]/.test(password),
      },
      {
        key: 'lowercase',
        label: 'passwordStrength.lowercase',
        met: /[a-z]/.test(password),
      },
      {
        key: 'number',
        label: 'passwordStrength.number',
        met: /[0-9]/.test(password),
      },
      {
        key: 'special',
        label: 'passwordStrength.special',
        met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~';]/.test(password),
      },
    ];

    const metCount = requirements.filter(r => r.met).length;
    const allRequirementsMet = metCount === requirements.length;

    // Calculate score based on requirements met and password length bonus
    let score = (metCount / requirements.length) * 80;
    
    // Bonus for extra length
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
    
    score = Math.min(100, Math.round(score));

    // Determine level
    let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (score >= 90 && allRequirementsMet) level = 'strong';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'fair';

    return {
      score,
      level,
      requirements,
      allRequirementsMet,
    };
  }, [password]);
}

export function getStrongPasswordSchema() {
  return {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  };
}
