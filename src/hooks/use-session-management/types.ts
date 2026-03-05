export const SESSION_TOKEN_KEY = 'app_session_token';
export const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface SessionValidationResult {
    valid: boolean;
    reason?: string;
    originalCountry?: string;
    currentCountry?: string;
}
