/**
 * Dispatch Incident Notification - GCC-Standard Matrix-Based Routing
 * 
 * Routes notifications based on 5-level severity matrix to specific stakeholders
 * using Push, Email, and WhatsApp channels with role-based routing.
 * 
 * LOCALIZATION: All notifications sent in recipient's preferred_language
 * DYNAMIC TEMPLATES: Uses matrix-assigned → default database → hardcoded fallback
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText, sendWhatsAppWithMedia } from '../_shared/whatsapp-provider.ts';
import { sendEmail, wrapEmailHtml, EmailAttachment } from '../_shared/email-sender.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';
import { 
  SupportedLanguage, 
  isRTL, 
  getTranslations, 
  replaceVariables,
  INCIDENT_TRANSLATIONS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_EMOJI,
  getEventTypeLabel
} from '../_shared/email-translations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DispatchPayload {
  incident_id: string;
  event_type?: string; // 'incident_created', 'incident_updated', 'erp_activated'
}

interface MediaAttachment {
  url: string;
  type?: string;
  name?: string;
}

interface IncidentDetails {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  severity_v2: string | null;
  has_injury: boolean | null;
  erp_activated: boolean | null;
  injury_classification: string | null;
  status: string | null;
  location: string | null;
  occurred_at: string | null;
  tenant_id: string;
  site_id: string | null;
  branch_id: string | null;
  reporter_id: string | null;
  media_attachments: MediaAttachment[] | null;
}

interface NotificationRecipient {
  user_id: string;
  stakeholder_role: string;
  channels: string[];
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  preferred_language: string | null;
  was_condition_match: boolean;
  whatsapp_template_id?: string | null;
  email_template_id?: string | null;
  push_template_id?: string | null;
  matrix_rule_id?: string | null;
}

interface NotificationResult {
  channel: string;
  recipient_id: string;
  stakeholder_role: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  template_id?: string | null;
  template_source?: 'matrix' | 'default' | 'fallback';
}

interface NotificationTemplate {
  id: string;
  content_pattern: string;
  variable_keys: string[];
  language: string;
  email_subject?: string | null;
}

// Template source tracking
type TemplateSource = 'matrix' | 'default' | 'fallback';

// Severity level to number mapping
const SEVERITY_LEVEL_MAP: Record<string, number> = {
  'level_1': 1,
  'level_2': 2,
  'level_3': 3,
  'level_4': 4,
  'level_5': 5,
};

// Severity level labels for messages (localized) - Updated for 5-level unified matrix
const SEVERITY_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  'level_1': { en: 'Level 1 (Low)', ar: 'المستوى 1 (منخفض)', ur: 'لیول 1 (کم)', hi: 'स्तर 1 (निम्न)', fil: 'Antas 1 (Mababa)' },
  'level_2': { en: 'Level 2 (Moderate)', ar: 'المستوى 2 (متوسط)', ur: 'لیول 2 (درمیانہ)', hi: 'स्तर 2 (मध्यम)', fil: 'Antas 2 (Katamtaman)' },
  'level_3': { en: 'Level 3 (Serious)', ar: 'المستوى 3 (خطير)', ur: 'لیول 3 (سنگین)', hi: 'स्तर 3 (गंभीर)', fil: 'Antas 3 (Seryoso)' },
  'level_4': { en: 'Level 4 (Major)', ar: 'المستوى 4 (كبير)', ur: 'لیول 4 (بڑا)', hi: 'स्तर 4 (बड़ा)', fil: 'Antas 4 (Malaki)' },
  'level_5': { en: 'Level 5 (Catastrophic)', ar: 'المستوى 5 (كارثي)', ur: 'لیول 5 (تباہ کن)', hi: 'स्तर 5 (विनाशकारी)', fil: 'Antas 5 (Sakuna)' },
};

const SEVERITY_EMOJI: Record<string, string> = {
  'level_1': '🟢',
  'level_2': '🟡',
  'level_3': '🟠',
  'level_4': '🔴',
  'level_5': '⛔',
};

// Maximum photos to attach per notification
const MAX_PHOTOS_PER_NOTIFICATION = 5;

/**
 * Find default template from database by slug pattern
 * Priority: tenant-specific template → null (use fallback)
 */
async function findDefaultTemplate(
  supabase: any,
  tenantId: string,
  language: string,
  notificationType: 'new' | 'update' | 'erp'
): Promise<NotificationTemplate | null> {
  const slug = `hsse_event_${notificationType}_${language}`;
  
  console.log(`[Template] Looking for default template: ${slug} for tenant ${tenantId}`);
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('id, content_pattern, variable_keys, language, email_subject')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();
  
  if (error) {
    console.log(`[Template] No default template found for slug: ${slug}`);
    return null;
  }
  
  console.log(`[Template] Found default template: ${data.id} (${slug})`);
  return data as NotificationTemplate;
}

/**
 * Determine notification type from event_type
 */
function getNotificationType(eventType: string): 'new' | 'update' | 'erp' {
  if (eventType === 'erp_activated') return 'erp';
  if (eventType === 'incident_updated') return 'update';
  return 'new';
}

/**
 * Fetch photo URLs directly from Supabase Storage
 * This is more reliable than relying on media_attachments column
 */
async function getPhotosFromStorage(
  supabase: any,
  tenantId: string,
  incidentId: string
): Promise<string[]> {
  const storagePath = `${tenantId}/${incidentId}/photos`;
  
  console.log(`[Photo Storage] ========================================`);
  console.log(`[Photo Storage] === FETCHING PHOTOS FROM STORAGE ===`);
  console.log(`[Photo Storage] Bucket: incident-attachments`);
  console.log(`[Photo Storage] Path: ${storagePath}`);
  console.log(`[Photo Storage] Max photos: ${MAX_PHOTOS_PER_NOTIFICATION}`);
  
  try {
    const { data: files, error } = await supabase.storage
      .from('incident-attachments')
      .list(storagePath);
    
    if (error) {
      console.error(`[Photo Storage] List error: ${error.message}`);
      console.log(`[Photo Storage] === RESULT: 0 photos (error) ===`);
      return [];
    }
    
    if (!files?.length) {
      console.log(`[Photo Storage] No files found in path`);
      console.log(`[Photo Storage] === RESULT: 0 photos (empty) ===`);
      return [];
    }
    
    console.log(`[Photo Storage] Raw file count: ${files.length}`);
    
    // Log each file found with metadata
    files.forEach((f: any, i: number) => {
      const fileSize = f.metadata?.size ? `${Math.round(f.metadata.size / 1024)} KB` : 'unknown size';
      const mimeType = f.metadata?.mimetype || 'unknown type';
      console.log(`[Photo Storage] File ${i + 1}: ${f.name} (${fileSize}, ${mimeType})`);
    });
    
    // Filter to image files only
    const imageFiles = files.filter((file: any) => {
      if (!file.name || file.name.startsWith('.')) return false;
      return file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    });
    
    console.log(`[Photo Storage] Image files after filtering: ${imageFiles.length}`);
    
    // Generate signed URLs for each photo
    const photoUrls: string[] = [];
    for (const file of imageFiles.slice(0, MAX_PHOTOS_PER_NOTIFICATION)) {
      const fullPath = `${storagePath}/${file.name}`;
      console.log(`[Photo Storage] Generating signed URL for: ${file.name}`);
      
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('incident-attachments')
        .createSignedUrl(fullPath, 60 * 60); // 1 hour expiry
      
      if (signedUrl?.signedUrl) {
        console.log(`[Photo Storage] URL generated: ${signedUrl.signedUrl.substring(0, 80)}...`);
        console.log(`[Photo Storage] URL length: ${signedUrl.signedUrl.length} chars`);
        console.log(`[Photo Storage] Expires in: 1 hour`);
        
        // Validate URL is accessible
        try {
          const check = await fetch(signedUrl.signedUrl, { method: 'HEAD' });
          const contentType = check.headers.get('content-type');
          const contentLength = check.headers.get('content-length');
          console.log(`[Photo Storage] URL validation: ${check.ok ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'} (HTTP ${check.status})`);
          console.log(`[Photo Storage] Content-Type: ${contentType}, Size: ${contentLength ? Math.round(parseInt(contentLength) / 1024) + ' KB' : 'unknown'}`);
        } catch (checkError) {
          const errMsg = checkError instanceof Error ? checkError.message : 'Unknown error';
          console.warn(`[Photo Storage] URL validation failed: ${errMsg}`);
        }
        
        photoUrls.push(signedUrl.signedUrl);
      } else if (urlError) {
        console.error(`[Photo Storage] Failed to generate URL for ${file.name}: ${urlError.message}`);
      }
    }
    
    console.log(`[Photo Storage] === RESULT: ${photoUrls.length} photos ready ===`);
    console.log(`[Photo Storage] ========================================`);
    
    return photoUrls;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Photo Storage] Exception: ${errMsg}`);
    console.log(`[Photo Storage] === RESULT: 0 photos (exception) ===`);
    return [];
  }
}

/**
 * Fallback: Extract photo URLs from media_attachments column
 * Used when storage lookup fails or for backwards compatibility
 */
function extractPhotoUrls(mediaAttachments: MediaAttachment[] | null): string[] {
  if (!mediaAttachments || !Array.isArray(mediaAttachments)) {
    return [];
  }
  
  return mediaAttachments
    .filter((m) => {
      // Check if it's an image by type or URL extension
      const isImageType = m.type?.startsWith('image/');
      const isImageUrl = m.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      return (isImageType || isImageUrl) && m.url;
    })
    .map((m) => m.url)
    .slice(0, MAX_PHOTOS_PER_NOTIFICATION);
}

/**
 * Render template with variables
 */
function renderTemplate(contentPattern: string, variables: Record<string, string>): string {
  let result = contentPattern;
  
  // Replace named variables like {{incident_id}}, {{location}}, etc.
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value || '');
  });
  
  // Also replace positional placeholders {{1}}, {{2}}, etc.
  // Order: event_type, reference_id, title, location, risk_level, reported_by, incident_time, action_link, description
  const orderedKeys = ['event_type', 'reference_id', 'title', 'location', 'risk_level', 'reported_by', 'incident_time', 'action_link', 'description'];
  orderedKeys.forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    result = result.split(placeholder).join(variables[key] || '');
  });
  
  return result;
}

/**
 * Build template variables map (centralized for consistency)
 */
function buildTemplateVariables(
  incident: IncidentDetails,
  lang: SupportedLanguage,
  locationText: string,
  reporterName: string,
  siteName: string,
  effectiveSeverity: string
): Record<string, string> {
  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
  
  // Use localized event type label
  const eventTypeLabel = getEventTypeLabel(incident.event_type, lang, false);
  
  return {
    incident_id: incident.id,
    reference_id: incident.reference_id || '-',
    title: incident.title,
    description: incident.description?.substring(0, 500) || '',
    location: locationText,
    risk_level: SEVERITY_LABELS[effectiveSeverity]?.[lang] || effectiveSeverity,
    reported_by: reporterName,
    incident_time: incident.occurred_at || new Date().toISOString(),
    action_link: `${appUrl}/incidents/${incident.id}`,
    event_type: eventTypeLabel, // DYNAMIC: Uses localized label
    site_name: siteName || '-',
  };
}

/**
 * Generate localized WhatsApp message (FALLBACK generator)
 */
function generateWhatsAppMessage(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  locationText: string,
  reporterName: string,
  hasInjury: boolean,
  isErpOverride: boolean
): string {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  
  // Use centralized event type labels with emoji for visual distinction
  const eventTypeLabel = getEventTypeLabel(incident.event_type, lang, false);
  const eventTypeEmoji = EVENT_TYPE_EMOJI[incident.event_type] || '📋';
  
  const erpPreamble = isErpOverride ? t.whatsapp.erpAlert + '\n\n' : '';
  const injuryLine = hasInjury ? t.whatsapp.injuriesReported + '\n' : '';
  const descriptionLine = incident.description 
    ? `\n📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}`
    : '';

  return `${erpPreamble}${eventTypeEmoji} ${t.whatsapp.newEvent.replace('{type}', eventTypeLabel)}: ${incident.title}

🆔 ${t.whatsapp.reference}: ${incident.reference_id || '-'}
📍 ${t.whatsapp.location}: ${locationText}
⚠️ ${t.whatsapp.severity}: ${severityEmoji} ${severityLabel}
👤 ${t.whatsapp.reportedBy}: ${reporterName}
${injuryLine}${descriptionLine}`;
}

/**
 * Generate localized email HTML content with deep-link button (FALLBACK generator)
 */
function generateEmailContent(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  locationText: string,
  reporterName: string,
  hasInjury: boolean,
  isErpOverride: boolean,
  tenantName: string
): { subject: string; html: string } {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  const severityLevelNum = SEVERITY_LEVEL_MAP[severityLevel] || 2;
  const rtl = isRTL(lang);
  
  // Use centralized event type labels with emoji for visual distinction
  const eventTypeLabel = getEventTypeLabel(incident.event_type, lang, false);
  const eventTypeEmoji = EVENT_TYPE_EMOJI[incident.event_type] || '📋';

  // Subject line with event type emoji
  const subject = isErpOverride 
    ? `🚨 ${t.email.emergency}: ${incident.reference_id} - ${incident.title}`
    : `${eventTypeEmoji} ${eventTypeLabel}: ${incident.reference_id} - ${incident.title}`;

  // Severity color
  const severityColor = severityLevelNum >= 4 ? '#dc2626' : severityLevelNum >= 3 ? '#f97316' : '#eab308';

  // Build HTML content
  const erpBanner = isErpOverride 
    ? `<div style="background: #dc2626; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">🚨 ${t.email.erpActivated} 🚨</div>` 
    : '';

  const injuryRow = hasInjury 
    ? `<tr><td style="padding: 8px 0; color: #64748b;">${t.email.injuries}:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${t.email.yes}</td></tr>` 
    : '';

  const descriptionBlock = incident.description 
    ? `<div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px;"><p style="margin: 0; color: #475569;">${incident.description}</p></div>` 
    : '';

  // Deep-link button text (localized)
  const viewButtonText: Record<SupportedLanguage, string> = {
    en: 'View Incident',
    ar: 'عرض الحادث',
    ur: 'واقعہ دیکھیں',
    hi: 'घटना देखें',
    fil: 'Tingnan ang Insidente',
  };
  
  // Get app URL for deep-link - direct to incident detail page
  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
  const incidentDeepLink = `${appUrl}/incidents/${incident.id}`;
  const buttonText = viewButtonText[lang] || viewButtonText.en;
  const arrow = rtl ? '←' : '→';

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${rtl ? 'rtl' : 'ltr'};">
      ${erpBanner}
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 16px;">${eventTypeLabel}: ${incident.title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.reference}:</td><td style="padding: 8px 0; font-weight: bold;">${incident.reference_id || '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.severity}:</td><td style="padding: 8px 0;"><span style="background: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px;">${severityLabel}</span></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.location}:</td><td style="padding: 8px 0;">${locationText}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.reportedBy}:</td><td style="padding: 8px 0;">${reporterName}</td></tr>
          ${injuryRow}
        </table>
        ${descriptionBlock}
        
        <!-- Deep-link CTA Button -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="${incidentDeepLink}" style="display: inline-block; background: #1e40af; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; direction: ${rtl ? 'rtl' : 'ltr'};">
            ${rtl ? `${arrow} ${buttonText}` : `${buttonText} ${arrow}`}
          </a>
        </div>
      </div>
    </div>
  `;

  const html = wrapEmailHtml(emailBody, lang, tenantName);

  return { subject, html };
}

/**
 * Generate localized push notification payload (FALLBACK generator)
 */
function generatePushPayload(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  isErpOverride: boolean
): { title: string; body: string } {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  
  // Use centralized event type labels with emoji for visual distinction
  const eventTypeLabel = getEventTypeLabel(incident.event_type, lang, false);
  const eventTypeEmoji = EVENT_TYPE_EMOJI[incident.event_type] || '📋';

  const title = isErpOverride 
    ? `🚨 ${t.push.erpAlert}`
    : `${eventTypeEmoji} ${t.push.newEvent.replace('{type}', eventTypeLabel)}`;

  const body = `${incident.reference_id}: ${incident.title}\n${t.push.severity}: ${severityLabel}`;

  return { title, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: DispatchPayload = await req.json();
    const { incident_id, event_type = 'incident_created' } = payload;

    if (!incident_id) {
      console.error('[Dispatch] Missing incident_id');
      return new Response(
        JSON.stringify({ error: 'Missing incident_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Dispatch] Processing incident: ${incident_id}, event: ${event_type}`);

    // 1. Fetch incident details
    const { data: incidentData, error: incidentError } = await supabase
      .from('incidents')
      .select(`
        id, reference_id, title, description, event_type, 
        severity_v2, has_injury, erp_activated, injury_classification,
        status, location, occurred_at, tenant_id, site_id, branch_id, reporter_id,
        media_attachments
      `)
      .eq('id', incident_id)
      .single();

    if (incidentError || !incidentData) {
      console.error('[Dispatch] Incident not found:', incidentError);
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const incident = incidentData as IncidentDetails;
    console.log(`[Dispatch] Incident: ${incident.reference_id}, severity: ${incident.severity_v2}, ERP: ${incident.erp_activated}`);

    // Fetch photos from Supabase Storage (primary) with fallback to media_attachments column
    let photoUrls = await getPhotosFromStorage(supabase, incident.tenant_id, incident.id);
    
    // Fallback to media_attachments if storage lookup returned no results
    if (photoUrls.length === 0) {
      photoUrls = extractPhotoUrls(incident.media_attachments);
      if (photoUrls.length > 0) {
        console.log(`[Dispatch] Using ${photoUrls.length} photos from media_attachments column (fallback)`);
      }
    }
    
    console.log(`[Dispatch] Total ${photoUrls.length} photos to attach to notifications`);

    // 2. Determine effective severity (ERP Override: Force level_4 or level_5)
    let effectiveSeverity = incident.severity_v2 || 'level_2';
    const isErpOverride = incident.erp_activated === true;
    
    if (isErpOverride) {
      const currentLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      if (currentLevel < 4) {
        effectiveSeverity = 'level_4';
        console.log(`[Dispatch] ERP Override: Elevated severity to level_4`);
      }
    }

    // 3. Check if has injury (for First Aider routing)
    const hasInjury = incident.has_injury === true || 
      ['first_aid', 'medical_treatment', 'lost_time', 'fatality'].includes(incident.injury_classification || '');

    // 4. Fetch tenant info
    let tenantName = '';
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', incident.tenant_id)
      .single();
    if (tenant?.name) tenantName = tenant.name;

    // 5. Fetch reporter info
    let reporterName = '-';
    if (incident.reporter_id) {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', incident.reporter_id)
        .single();
      if (reporter?.full_name) reporterName = reporter.full_name;
    }

    // 6. Fetch site name
    let siteName = '';
    if (incident.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', incident.site_id)
        .single();
      if (site?.name) siteName = site.name;
    }
    const locationText = incident.location || siteName || '-';

    // 7. Get notification recipients using the database function (now includes preferred_language and event_type)
    // Determine event type for matrix filtering
    const incidentEventType = incident.event_type === 'observation' ? 'observation' : 'incident';
    
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_incident_notification_recipients', {
        p_tenant_id: incident.tenant_id,
        p_severity_level: effectiveSeverity, // Pass as TEXT (e.g., 'level_2') to match DB column type
        p_has_injury: hasInjury,
        p_erp_activated: isErpOverride,
        p_event_type: incidentEventType,
      });

    if (recipientsError) {
      console.error('[Dispatch] Failed to get recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to resolve recipients', details: recipientsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientList = (recipients || []) as NotificationRecipient[];
    console.log(`[Dispatch] Found ${recipientList.length} recipients to notify`);
    
    // Enhanced logging for debugging empty recipients
    if (recipientList.length === 0) {
      console.warn(`[Dispatch] WARNING: No recipients found for severity=${effectiveSeverity}, event_type=${incidentEventType}, has_injury=${hasInjury}, erp_activated=${isErpOverride}`);
      console.warn(`[Dispatch] Check notification_matrix table has entries for severity_level='${effectiveSeverity}'`);
    } else {
      console.log(`[Dispatch] Recipients breakdown: ${recipientList.map(r => `${r.stakeholder_role}(${r.channels.join(',')})`).join(', ')}`);
    }

    // 8. Channel determination is now fully driven by Notification Matrix
    // The matrix already specifies which channels each stakeholder receives for each severity level
    // Only Level 5 escalation is applied as an additive rule (ensures HSSE Manager gets all channels)
    const processedRecipients = recipientList.map(r => {
      const severityLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      let filteredChannels = [...r.channels];
      
      // Level 5: Ensure HSSE Manager gets immediate notification on all channels (additive rule)
      if (severityLevel >= 5 && r.stakeholder_role === 'hsse_manager') {
        if (!filteredChannels.includes('whatsapp')) filteredChannels.push('whatsapp');
        if (!filteredChannels.includes('email')) filteredChannels.push('email');
        if (!filteredChannels.includes('push')) filteredChannels.push('push');
      }
      
      return { ...r, channels: filteredChannels };
    }).filter(r => r.channels.length > 0);

    console.log(`[Dispatch] Channels from matrix: ${processedRecipients.length} recipients with active channels`);

    // Determine notification type for template lookup
    const notificationType = getNotificationType(event_type);
    console.log(`[Dispatch] Notification type: ${notificationType}`);

    // 9. Send notifications (per-recipient language)
    const results: NotificationResult[] = [];

    for (const recipient of processedRecipients) {
      // Determine recipient's language (default to English if not set)
      const recipientLang = (recipient.preferred_language || 'en') as SupportedLanguage;
      const validLangs: SupportedLanguage[] = ['en', 'ar', 'ur', 'hi', 'fil'];
      const lang: SupportedLanguage = validLangs.includes(recipientLang) ? recipientLang : 'en';

      console.log(`[Dispatch] Sending to ${recipient.full_name} in language: ${lang}`);

      // Build template variables once per recipient (for all channels)
      const templateVariables = buildTemplateVariables(
        incident, lang, locationText, reporterName, siteName, effectiveSeverity
      );

      for (const channel of recipient.channels) {
        try {
          let status: 'sent' | 'failed' | 'skipped' = 'skipped';
          let errorMsg: string | undefined;
          let providerMessageId: string | undefined;
          let usedTemplateId: string | null = null;
          let templateSource: TemplateSource = 'fallback';

          if (channel === 'whatsapp') {
            if (!recipient.phone_number) {
              status = 'skipped';
              errorMsg = 'No phone number';
            } else {
              let message: string;
              
              // STEP 1: Check matrix-assigned template
              if (recipient.whatsapp_template_id) {
                const { data: template } = await supabase
                  .from('notification_templates')
                  .select('id, content_pattern, variable_keys, language')
                  .eq('id', recipient.whatsapp_template_id)
                  .is('deleted_at', null)
                  .single();
                
                if (template) {
                  message = renderTemplate(template.content_pattern, templateVariables);
                  usedTemplateId = template.id;
                  templateSource = 'matrix';
                  console.log(`[Dispatch] WhatsApp: Using MATRIX template ${template.id} for ${recipient.full_name}`);
                }
              }
              
              // STEP 2: Try default template from database
              if (!usedTemplateId) {
                const defaultTemplate = await findDefaultTemplate(supabase, incident.tenant_id, lang, notificationType);
                if (defaultTemplate) {
                  message = renderTemplate(defaultTemplate.content_pattern, templateVariables);
                  usedTemplateId = defaultTemplate.id;
                  templateSource = 'default';
                  console.log(`[Dispatch] WhatsApp: Using DEFAULT template ${defaultTemplate.id} for ${recipient.full_name}`);
                }
              }
              
              // STEP 3: Use hardcoded fallback generator (with warning)
              if (!usedTemplateId) {
                message = generateWhatsAppMessage(
                  lang, incident, effectiveSeverity, locationText, 
                  reporterName, hasInjury, isErpOverride
                );
                templateSource = 'fallback';
                console.warn(`[Dispatch] WhatsApp: Using FALLBACK generator for ${recipient.full_name} (no template found)`);
              }
              
              // Send WhatsApp message with photos as media attachments
              const result = photoUrls.length > 0
                ? await sendWhatsAppWithMedia(recipient.phone_number, message!, photoUrls)
                : await sendWhatsAppText(recipient.phone_number, message!);
              status = result.success ? 'sent' : 'failed';
              errorMsg = result.error;
              providerMessageId = result.messageId;
            }
          } else if (channel === 'email') {
            if (!recipient.email) {
              status = 'skipped';
              errorMsg = 'No email address';
            } else {
              let subject: string;
              let html: string;
              
              // STEP 1: Check matrix-assigned template
              if (recipient.email_template_id) {
                const { data: emailTemplate } = await supabase
                  .from('notification_templates')
                  .select('id, content_pattern, variable_keys, language, email_subject')
                  .eq('id', recipient.email_template_id)
                  .is('deleted_at', null)
                  .single();
                
                if (emailTemplate) {
                  subject = emailTemplate.email_subject 
                    ? renderTemplate(emailTemplate.email_subject, templateVariables)
                    : `${templateVariables.event_type}: ${incident.reference_id} - ${incident.title}`;
                  
                  const emailBody = renderTemplate(emailTemplate.content_pattern, templateVariables);
                  html = wrapEmailHtml(emailBody, lang, tenantName);
                  usedTemplateId = emailTemplate.id;
                  templateSource = 'matrix';
                  console.log(`[Dispatch] Email: Using MATRIX template ${emailTemplate.id} for ${recipient.full_name}`);
                }
              }
              
              // STEP 2: Try default template from database
              if (!usedTemplateId) {
                const defaultTemplate = await findDefaultTemplate(supabase, incident.tenant_id, lang, notificationType);
                if (defaultTemplate) {
                  subject = defaultTemplate.email_subject 
                    ? renderTemplate(defaultTemplate.email_subject, templateVariables)
                    : `${templateVariables.event_type}: ${incident.reference_id} - ${incident.title}`;
                  
                  const emailBody = renderTemplate(defaultTemplate.content_pattern, templateVariables);
                  html = wrapEmailHtml(emailBody, lang, tenantName);
                  usedTemplateId = defaultTemplate.id;
                  templateSource = 'default';
                  console.log(`[Dispatch] Email: Using DEFAULT template ${defaultTemplate.id} for ${recipient.full_name}`);
                }
              }
              
              // STEP 3: Use hardcoded fallback generator (with warning)
              if (!usedTemplateId) {
                const defaultEmail = generateEmailContent(
                  lang, incident, effectiveSeverity, locationText,
                  reporterName, hasInjury, isErpOverride, tenantName
                );
                subject = defaultEmail.subject;
                html = defaultEmail.html;
                templateSource = 'fallback';
                console.warn(`[Dispatch] Email: Using FALLBACK generator for ${recipient.full_name} (no template found)`);
              }
              
              // Build email attachments from photo URLs
              const emailAttachments: EmailAttachment[] = photoUrls.map((url, index) => {
                const urlParts = url.split('/');
                const originalName = urlParts[urlParts.length - 1]?.split('?')[0] || '';
                const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
                const filename = `incident-photo-${index + 1}.${extension}`;
                
                return {
                  filename,
                  path: url,
                };
              });

              const result = await sendEmail({
                to: [recipient.email],
                subject: subject!,
                html: html!,
                module: 'incident_workflow',
                tenantName,
                attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
              });
              status = result.success ? 'sent' : 'failed';
              errorMsg = result.error;
              providerMessageId = result.messageId;
            }
          } else if (channel === 'push') {
            // STEP 1: Check matrix-assigned push template (NEW!)
            if (recipient.push_template_id) {
              const { data: pushTemplate } = await supabase
                .from('notification_templates')
                .select('id, content_pattern, variable_keys, language, email_subject')
                .eq('id', recipient.push_template_id)
                .is('deleted_at', null)
                .single();
              
              if (pushTemplate) {
                usedTemplateId = pushTemplate.id;
                templateSource = 'matrix';
                console.log(`[Dispatch] Push: Using MATRIX template ${pushTemplate.id} for ${recipient.full_name}`);
              }
            }
            
            // Send localized push notification (always uses generator for now, but tracks template)
            const pushPayload = generatePushPayload(lang, incident, effectiveSeverity, isErpOverride);
            
            if (!usedTemplateId) {
              templateSource = 'fallback';
              console.log(`[Dispatch] Push: Using FALLBACK generator for ${recipient.full_name}`);
            }
            
            try {
              const pushResponse = await supabase.functions.invoke('send-push-notification', {
                body: {
                  user_ids: [recipient.user_id],
                  payload: {
                    title: pushPayload.title,
                    body: pushPayload.body,
                    data: {
                      type: 'incident',
                      incident_id: incident.id,
                      reference_id: incident.reference_id,
                    },
                    tag: `incident-${incident.id}`,
                  },
                  notification_type: 'incidents_new',
                },
              });
              
              if (pushResponse.error) {
                status = 'failed';
                errorMsg = pushResponse.error.message;
              } else {
                status = 'sent';
              }
            } catch (pushError) {
              console.error(`[Dispatch] Push error:`, pushError);
              status = 'failed';
              errorMsg = pushError instanceof Error ? pushError.message : 'Push failed';
            }
          }

          // Log to audit table with template tracking
          await supabase.from('auto_notification_logs').insert({
            tenant_id: incident.tenant_id,
            event_type,
            event_id: incident_id,
            recipient_id: recipient.user_id,
            recipient_phone: recipient.phone_number,
            channel,
            status,
            error_message: errorMsg,
            provider_message_id: providerMessageId,
            sent_at: status === 'sent' ? new Date().toISOString() : null,
            severity_level: effectiveSeverity,
            stakeholder_role: recipient.stakeholder_role,
            was_erp_override: isErpOverride,
            template_id: usedTemplateId,
            template_source: templateSource,
          });

          results.push({
            channel,
            recipient_id: recipient.user_id,
            stakeholder_role: recipient.stakeholder_role,
            status,
            error: errorMsg,
            template_id: usedTemplateId,
            template_source: templateSource,
          });

          console.log(`[Dispatch] ${channel} → ${recipient.full_name} (${recipient.stakeholder_role}, ${lang}): ${status} [template: ${templateSource}${usedTemplateId ? ` #${usedTemplateId.substring(0, 8)}` : ''}]`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Dispatch] Error sending ${channel} to ${recipient.full_name}:`, error);

          await supabase.from('auto_notification_logs').insert({
            tenant_id: incident.tenant_id,
            event_type,
            event_id: incident_id,
            recipient_id: recipient.user_id,
            channel,
            status: 'failed',
            error_message: errorMsg,
            severity_level: effectiveSeverity,
            stakeholder_role: recipient.stakeholder_role,
            was_erp_override: isErpOverride,
            template_source: 'fallback',
          });

          results.push({
            channel,
            recipient_id: recipient.user_id,
            stakeholder_role: recipient.stakeholder_role,
            status: 'failed',
            error: errorMsg,
            template_source: 'fallback',
          });
        }
      }
    }

    // 10. Summary with template usage stats
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const matrixTemplates = results.filter(r => r.template_source === 'matrix').length;
    const defaultTemplates = results.filter(r => r.template_source === 'default').length;
    const fallbackTemplates = results.filter(r => r.template_source === 'fallback').length;

    console.log(`[Dispatch] Complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    console.log(`[Dispatch] Templates: ${matrixTemplates} matrix, ${defaultTemplates} default, ${fallbackTemplates} fallback`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        reference_id: incident.reference_id,
        effective_severity: effectiveSeverity,
        erp_override: isErpOverride,
        has_injury: hasInjury,
        total_recipients: processedRecipients.length,
        notifications: { sent, failed, skipped },
        template_usage: { matrix: matrixTemplates, default: defaultTemplates, fallback: fallbackTemplates },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Dispatch] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
