/**
 * Returns the canonical application URL for use in outgoing links
 * (invitations, emails, WhatsApp messages, etc.)
 * 
 * This ensures all shared links use the production domain
 * regardless of where the app is currently accessed from
 * (preview, lovable, localhost, etc.)
 */
export function getAppUrl(): string {
  return "https://www.dhuud.com";
}
