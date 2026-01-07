import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Factor {
  id: string;
  friendly_name: string | null;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

interface EnrollResult {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

interface UseMFAReturn {
  factors: Factor[];
  isEnabled: boolean;
  isLoading: boolean;
  enroll: (issuer?: string) => Promise<EnrollResult | null>;
  verify: (factorId: string, challengeId: string, code: string) => Promise<boolean>;
  unenroll: (factorId: string) => Promise<boolean>;
  challenge: (factorId: string) => Promise<string | null>;
  refreshFactors: () => Promise<void>;
}

export function useMFA(): UseMFAReturn {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error fetching MFA factors:', error);
        return;
      }

      // Only include verified TOTP factors
      const verifiedFactors = (data?.totp || []).filter(
        (f) => f.status === 'verified'
      ) as Factor[];
      
      setFactors(verifiedFactors);
    } catch (err) {
      console.error('Error in refreshFactors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clean up any unverified factors to prevent enrollment conflicts
  const cleanupUnverifiedFactors = useCallback(async (): Promise<void> => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      if (!data?.totp) return;
      
      // Find all unverified factors (cast to avoid type narrowing issues)
      const unverifiedFactors = (data.totp as Array<{ id: string; status: string }>).filter(
        f => f.status === 'unverified'
      );
      
      // Unenroll each unverified factor
      for (const factor of unverifiedFactors) {
        console.log('Cleaning up unverified factor:', factor.id);
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    } catch (err) {
      console.error('Error cleaning up unverified factors:', err);
    }
  }, []);

  useEffect(() => {
    refreshFactors();
  }, [refreshFactors]);

  const enroll = async (issuer?: string): Promise<EnrollResult | null> => {
    try {
      // Clean up any unverified factors first to prevent name conflicts
      await cleanupUnverifiedFactors();
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
        issuer: issuer || 'DHUUD',
      });

      if (error) {
        // Handle specific error for factor name conflict
        if (error.message?.includes('already exists')) {
          toast({
            title: 'Setup Issue',
            description: 'Please wait a moment and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Enrollment Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
        return null;
      }

      return data as EnrollResult;
    } catch (err) {
      toast({
        title: 'Enrollment Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return null;
    }
  };

  const challenge = async (factorId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        toast({
          title: 'Challenge Failed',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }

      return data.id;
    } catch (err) {
      toast({
        title: 'Challenge Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return null;
    }
  };

  const verify = async (
    factorId: string,
    challengeId: string,
    code: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        toast({
          title: 'Verification Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      await refreshFactors();
      return true;
    } catch (err) {
      toast({
        title: 'Verification Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unenroll = async (factorId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        toast({
          title: 'Failed to Disable 2FA',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      await refreshFactors();
      return true;
    } catch (err) {
      toast({
        title: 'Failed to Disable 2FA',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    factors,
    isEnabled: factors.length > 0,
    isLoading,
    enroll,
    verify,
    unenroll,
    challenge,
    refreshFactors,
  };
}
