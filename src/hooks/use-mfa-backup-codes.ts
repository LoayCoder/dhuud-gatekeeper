import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BackupCodeStatus {
  total: number;
  remaining: number;
  hasBackupCodes: boolean;
}

export function useMFABackupCodes() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<BackupCodeStatus | null>(null);

  const generateCodes = useCallback(async (): Promise<string[] | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
        body: { action: 'generate' }
      });

      if (error) {
        console.error('Generate backup codes error:', error);
        return null;
      }

      // Update status after generating
      await fetchStatus();
      return data.codes;
    } catch (err) {
      console.error('Generate backup codes exception:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
        body: { action: 'verify', code }
      });

      if (error) {
        console.error('Verify backup code error:', error);
        return false;
      }

      // Update status after verification (a code may have been consumed)
      await fetchStatus();
      return data.valid;
    } catch (err) {
      console.error('Verify backup code exception:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<BackupCodeStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
        body: { action: 'status' }
      });

      if (error) {
        console.error('Fetch backup code status error:', error);
        return null;
      }

      setStatus(data);
      return data;
    } catch (err) {
      console.error('Fetch backup code status exception:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    status,
    generateCodes,
    verifyCode,
    fetchStatus,
  };
}
