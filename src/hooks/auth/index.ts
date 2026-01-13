/**
 * Authentication Hooks
 * 
 * This barrel file exports all hooks related to authentication and security.
 */

// Session Management
export * from '../use-session-management';
export * from '../use-session-lifecycle';
export * from '../use-idle-timeout';
export * from '../use-token-refresh';

// MFA
export * from '../useMFA';
export * from '../use-mfa-backup-codes';

// Device Trust
export * from '../use-trusted-device';
export * from '../use-verified-device';
export * from '../use-device-fingerprint';
export * from '../use-cached-session';

// WebAuthn / Biometrics
export * from '../use-webauthn';

// Password
export * from '../use-password-breach-check';
export * from '../use-password-strength';
export * from '../use-deletion-password';

// Tenant Session
export * from '../use-tenant-session-config';
