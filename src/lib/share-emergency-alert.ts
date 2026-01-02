import { supabase } from "@/integrations/supabase/client";

export interface ShareableAlert {
  id: string;
  alert_type: string;
  status?: string;
  latitude: number | null;
  longitude: number | null;
  source_name?: string | null;
  notes?: string | null;
  triggered_at: string;
  photo_evidence_path?: string | null;
}

/**
 * Generate a Google Maps URL for navigation to the alert location
 */
export function getNavigationUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/**
 * Generate a Google Maps view URL for the alert location
 */
export function getMapViewUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Get signed URL for photo evidence
 */
export async function getPhotoUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  
  try {
    const { data } = await supabase.storage
      .from('emergency-evidence')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    
    return data?.signedUrl || null;
  } catch {
    // Try alternate bucket name
    try {
      const { data } = await supabase.storage
        .from('visitor-photos')
        .createSignedUrl(storagePath, 3600);
      return data?.signedUrl || null;
    } catch {
      return null;
    }
  }
}

/**
 * Format alert details for sharing
 */
export function formatAlertMessage(alert: ShareableAlert, photoUrl?: string | null): string {
  const alertTypeAr = getAlertTypeArabic(alert.alert_type);
  const alertTypeEn = alert.alert_type.replace('_', ' ').toUpperCase();
  
  let message = `🚨 تنبيه طوارئ | Emergency Alert\n\n`;
  message += `النوع | Type: ${alertTypeAr} | ${alertTypeEn}\n`;
  
  if (alert.source_name) {
    message += `الاسم | Name: ${alert.source_name}\n`;
  }
  
  if (alert.notes) {
    message += `ملاحظات | Notes: ${alert.notes}\n`;
  }
  
  message += `الوقت | Time: ${new Date(alert.triggered_at).toLocaleString('ar-SA')}\n`;
  
  if (alert.latitude && alert.longitude) {
    message += `\n📍 الموقع | Location:\n`;
    message += getMapViewUrl(alert.latitude, alert.longitude);
  }
  
  if (photoUrl) {
    message += `\n\n📷 صورة | Photo:\n${photoUrl}`;
  }
  
  return message;
}

/**
 * Get Arabic translation for alert type
 */
export function getAlertTypeArabic(alertType: string): string {
  const translations: Record<string, string> = {
    'panic': 'ذعر',
    'duress': 'إكراه',
    'medical': 'طوارئ طبية',
    'fire': 'حريق',
    'security_breach': 'اختراق أمني',
  };
  return translations[alertType] || alertType;
}

/**
 * Share via WhatsApp
 */
export function shareViaWhatsApp(message: string, phoneNumber?: string): void {
  const encodedMessage = encodeURIComponent(message);
  const baseUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}` 
    : 'https://wa.me/';
  window.open(`${baseUrl}?text=${encodedMessage}`, '_blank');
}

/**
 * Share via SMS
 */
export function shareViaSMS(message: string, phoneNumber?: string): void {
  const encodedMessage = encodeURIComponent(message);
  const smsUrl = phoneNumber 
    ? `sms:${phoneNumber}?body=${encodedMessage}`
    : `sms:?body=${encodedMessage}`;
  window.location.href = smsUrl;
}

/**
 * Copy alert details to clipboard
 */
export async function copyAlertDetails(message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = message;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
}

/**
 * Share using Web Share API if available
 */
export async function shareNative(alert: ShareableAlert, photoUrl?: string | null): Promise<boolean> {
  if (!navigator.share) return false;
  
  const message = formatAlertMessage(alert, photoUrl);
  
  try {
    await navigator.share({
      title: `Emergency Alert - ${alert.alert_type}`,
      text: message,
    });
    return true;
  } catch {
    return false;
  }
}
