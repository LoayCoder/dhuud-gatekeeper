import { useState, useCallback } from 'react';

interface BreachCheckResult {
  isBreached: boolean;
  count: number;
}

/**
 * Hook for checking if a password has been exposed in data breaches
 * Uses Have I Been Pwned API with k-anonymity (only first 5 chars of SHA-1 hash sent)
 */
export function usePasswordBreachCheck() {
  const [isChecking, setIsChecking] = useState(false);

  const checkPassword = useCallback(async (password: string): Promise<BreachCheckResult> => {
    if (!password || password.length < 6) {
      return { isBreached: false, count: 0 };
    }

    setIsChecking(true);
    
    try {
      // Generate SHA-1 hash of password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      // k-anonymity: only send first 5 characters
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);
      
      // Query HIBP API
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true' // Adds padding to prevent response length analysis
        }
      });
      
      if (!response.ok) {
        console.error('HIBP API error:', response.status);
        return { isBreached: false, count: 0 };
      }
      
      const text = await response.text();
      const lines = text.split('\n');
      
      // Check if our hash suffix exists in the response
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          const count = parseInt(countStr.trim(), 10);
          return { isBreached: true, count };
        }
      }
      
      return { isBreached: false, count: 0 };
    } catch (error) {
      console.error('Password breach check failed:', error);
      // Fail open - don't block users if API is unavailable
      return { isBreached: false, count: 0 };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { checkPassword, isChecking };
}
