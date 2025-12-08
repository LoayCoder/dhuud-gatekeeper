import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Hash a password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useDeletionPassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  /**
   * Check if deletion password is configured
   */
  const checkStatus = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-deletion-password', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setIsConfigured(data.configured);
      return data.configured;
    } catch (error) {
      console.error('Failed to check deletion password status:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set or update deletion password
   */
  const setPassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const passwordHash = await hashPassword(newPassword);

      const { data, error } = await supabase.functions.invoke('manage-deletion-password', {
        body: { action: 'set', password_hash: passwordHash },
      });

      if (error) throw error;
      
      if (data.success) {
        setIsConfigured(true);
        toast({
          title: t('profile.deletionPassword.setSuccess'),
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set deletion password:', error);
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  /**
   * Verify password (used before deleting closed incidents)
   */
  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase.functions.invoke('manage-deletion-password', {
        body: { action: 'verify', password_hash: passwordHash },
      });

      if (error) throw error;
      return data.valid;
    } catch (error) {
      console.error('Failed to verify deletion password:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a closed incident with password verification
   */
  const deleteClosedIncident = useCallback(async (incidentId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const passwordHash = await hashPassword(password);

      const { error } = await supabase.rpc('soft_delete_closed_incident', {
        p_incident_id: incidentId,
        p_password_hash: passwordHash,
      });

      if (error) throw error;
      
      toast({
        title: t('incidents.deleteSuccess'),
      });
      return true;
    } catch (error: any) {
      console.error('Failed to delete closed incident:', error);
      
      let errorMessage = t('common.error');
      if (error.message?.includes('Invalid deletion password')) {
        errorMessage = t('profile.deletionPassword.invalidPassword');
      } else if (error.message?.includes('Deletion password not configured')) {
        errorMessage = t('profile.deletionPassword.notConfiguredError');
      }
      
      toast({
        title: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  return {
    isLoading,
    isConfigured,
    checkStatus,
    setPassword,
    verifyPassword,
    deleteClosedIncident,
  };
}
