import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { 
  startRegistration, 
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable
} from '@simplewebauthn/browser';

interface WebAuthnCredential {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface UseWebAuthnReturn {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  credentials: WebAuthnCredential[];
  isLoading: boolean;
  registerCredential: (deviceName?: string) => Promise<boolean>;
  authenticate: (email: string) => Promise<boolean>;
  removeCredential: (credentialId: string) => Promise<boolean>;
  refreshCredentials: () => Promise<void>;
}

export function useWebAuthn(): UseWebAuthnReturn {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = browserSupportsWebAuthn();
      setIsSupported(supported);
      
      if (supported) {
        const platformAvailable = await platformAuthenticatorIsAvailable();
        setIsPlatformAvailable(platformAvailable);
      }
    };
    
    checkSupport();
  }, []);

  // Fetch user's credentials
  const refreshCredentials = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('id, device_name, created_at, last_used_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (err) {
      console.error('Error fetching WebAuthn credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCredentials();
  }, [refreshCredentials]);

  // Register a new credential
  const registerCredential = useCallback(async (deviceName?: string): Promise<boolean> => {
    try {
      if (!isSupported || !isPlatformAvailable) {
        toast({
          title: t('biometric.notSupported'),
          description: t('biometric.notSupportedDesc'),
          variant: 'destructive',
        });
        return false;
      }

      // Get registration options from server
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'webauthn-registration-options'
      );

      if (optionsError || !optionsData?.options) {
        throw new Error(optionsError?.message || 'Failed to get registration options');
      }

      // Start registration with the browser
      const credential = await startRegistration({
        optionsJSON: optionsData.options,
      });

      // Verify registration with server
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'webauthn-registration-verify',
        {
          body: { credential, deviceName },
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message || 'Failed to verify registration');
      }

      toast({
        title: t('biometric.registrationSuccess'),
        description: t('biometric.registrationSuccessDesc'),
      });

      await refreshCredentials();
      return true;
    } catch (err: any) {
      console.error('WebAuthn registration error:', err);
      
      // Handle user cancellation gracefully
      if (err.name === 'NotAllowedError') {
        toast({
          title: t('biometric.registrationCancelled'),
          description: t('biometric.registrationCancelledDesc'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('biometric.registrationFailed'),
          description: err.message || t('biometric.registrationFailedDesc'),
          variant: 'destructive',
        });
      }
      return false;
    }
  }, [isSupported, isPlatformAvailable, t, refreshCredentials]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (email: string): Promise<boolean> => {
    try {
      if (!isSupported) {
        toast({
          title: t('biometric.notSupported'),
          description: t('biometric.notSupportedDesc'),
          variant: 'destructive',
        });
        return false;
      }

      // Get authentication options from server
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'webauthn-auth-options',
        {
          body: { email },
        }
      );

      if (optionsError || !optionsData?.options) {
        toast({
          title: t('biometric.noCredentials'),
          description: t('biometric.noCredentialsDesc'),
          variant: 'destructive',
        });
        return false;
      }

      // Start authentication with the browser
      const credential = await startAuthentication({
        optionsJSON: optionsData.options,
      });

      // Verify authentication with server
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'webauthn-auth-verify',
        {
          body: { email, credential },
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message || 'Authentication failed');
      }

      // Use the magic link token to sign in
      if (verifyData.token && verifyData.tokenType) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: verifyData.token,
          type: verifyData.tokenType,
        });

        if (signInError) {
          throw signInError;
        }
      }

      toast({
        title: t('biometric.authSuccess'),
        description: t('biometric.authSuccessDesc'),
      });

      return true;
    } catch (err: any) {
      console.error('WebAuthn authentication error:', err);
      
      // Handle user cancellation gracefully
      if (err.name === 'NotAllowedError') {
        toast({
          title: t('biometric.authCancelled'),
          description: t('biometric.authCancelledDesc'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('biometric.authFailed'),
          description: err.message || t('biometric.authFailedDesc'),
          variant: 'destructive',
        });
      }
      return false;
    }
  }, [isSupported, t]);

  // Remove a credential
  const removeCredential = useCallback(async (credentialId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', credentialId);

      if (error) throw error;

      toast({
        title: t('biometric.credentialRemoved'),
        description: t('biometric.credentialRemovedDesc'),
      });

      await refreshCredentials();
      return true;
    } catch (err: any) {
      console.error('Error removing credential:', err);
      toast({
        title: t('biometric.removeFailed'),
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [t, refreshCredentials]);

  return {
    isSupported,
    isPlatformAvailable,
    credentials,
    isLoading,
    registerCredential,
    authenticate,
    removeCredential,
    refreshCredentials,
  };
}
