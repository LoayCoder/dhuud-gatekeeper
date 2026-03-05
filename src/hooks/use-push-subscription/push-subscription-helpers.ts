import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Validate VAPID public key format
 * - Must be non-empty
 * - Must contain only valid URL-safe Base64 characters
 * - Must have minimum length (VAPID public keys are ~87 chars)
 */
export function isValidVapidPublicKey(key: string | undefined): key is string {
    if (!key || typeof key !== 'string') {
        return false;
    }

    // Check for unresolved env variable patterns
    if (key.includes('${') || key === 'undefined' || key === 'null') {
        return false;
    }

    // VAPID public keys are typically 87 characters in URL-safe Base64
    if (key.length < 80 || key.length > 100) {
        return false;
    }

    // Check for valid URL-safe Base64 characters only
    const validBase64UrlRegex = /^[A-Za-z0-9_-]+$/;
    return validBase64UrlRegex.test(key);
}

/**
 * Convert a URL-safe base64 string to Uint8Array for VAPID key
 * Returns null if decoding fails or key is invalid
 */
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer | null {
    try {
        // Add padding if necessary
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        // Convert URL-safe Base64 to standard Base64
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

        // Decode Base64 to binary string
        const rawData = window.atob(base64);

        // VAPID public key must be exactly 65 bytes (P-256 uncompressed point)
        if (rawData.length !== 65) {
            console.error('[Push] Invalid VAPID key length:', rawData.length, '(expected 65 bytes)');
            return null;
        }

        // Convert binary string to Uint8Array
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray.buffer;
    } catch (error) {
        console.error('[Push] Failed to decode VAPID key:', error instanceof Error ? error.message : error);
        return null;
    }
}

// Log VAPID key info when module loads (for debugging)
if (typeof window !== 'undefined') {
    logger.debug('[Push] 🔑 VAPID Key Check:');
    logger.debug('[Push]   - Key loaded:', VAPID_PUBLIC_KEY ? 'Yes' : 'No');
    logger.debug('[Push]   - Key length:', VAPID_PUBLIC_KEY?.length || 0);

    if (VAPID_PUBLIC_KEY) {
        const isValid = isValidVapidPublicKey(VAPID_PUBLIC_KEY);
        logger.debug('[Push]   - Format valid:', isValid);
        if (isValid) {
            const testDecode = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            logger.debug('[Push]   - Decode test:', testDecode ? 'Passed' : 'Failed');
            logger.debug('[Push]   - Expected key: BGNgPMHETSMk09BaEp4zcplZAuBi3WM_TQIN_uleDqOyxMo_BZsQjLSd0kbeITiNC4SclPMqLEn_jBzoju3eI_Y');
            logger.debug('[Push]   - Match:', VAPID_PUBLIC_KEY === 'BGNgPMHETSMk09BaEp4zcplZAuBi3WM_TQIN_uleDqOyxMo_BZsQjLSd0kbeITiNC4SclPMqLEn_jBzoju3eI_Y');
        }
    }
}

/**
 * Get device type and browser name for subscription tracking
 */
export function getDeviceInfo(): { device_type: string; browser_name: string } {
    const ua = navigator.userAgent;
    const device_type = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';

    let browser_name = 'unknown';
    if (ua.includes('Edg')) browser_name = 'Edge';
    else if (ua.includes('Chrome')) browser_name = 'Chrome';
    else if (ua.includes('Firefox')) browser_name = 'Firefox';
    else if (ua.includes('Safari')) browser_name = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser_name = 'Opera';

    return { device_type, browser_name };
}

/**
 * Save subscription to Supabase database
 */
export async function saveSubscriptionToDatabase(
    userId: string,
    tenantId: string,
    subscription: PushSubscriptionJSON
): Promise<boolean> {
    try {
        const { device_type, browser_name } = getDeviceInfo();

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                tenant_id: tenantId,
                endpoint: subscription.endpoint,
                p256dh_key: subscription.keys?.p256dh,
                auth_key: subscription.keys?.auth,
                device_type,
                browser_name,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,endpoint',
            });

        if (error) {
            console.error('Failed to save subscription to database:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error saving subscription:', error);
        return false;
    }
}

/**
 * Mark subscription as inactive in database
 */
export async function deactivateSubscriptionInDatabase(endpoint: string): Promise<void> {
    try {
        await supabase
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('endpoint', endpoint);
    } catch (error) {
        console.error('Error deactivating subscription:', error);
    }
}

export { VAPID_PUBLIC_KEY };
