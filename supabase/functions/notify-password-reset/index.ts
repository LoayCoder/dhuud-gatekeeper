import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetNotification {
  email: string;
  userAgent: string;
  platform: string;
  origin: string;
  timestamp: string;
  language: string;
}

// Rate limiting map (in-memory for edge function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@unknown';
  
  const maskedLocal = localPart.length > 2 
    ? localPart[0] + '***' + localPart[localPart.length - 1]
    : '***';
  
  return `${maskedLocal}@${domain}`;
}

function getClientIp(req: Request): string {
  // Check various headers for client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  
  return 'Unknown';
}

async function sendAdminAlert(
  adminEmail: string,
  maskedEmail: string,
  ipAddress: string,
  userAgent: string,
  platform: string,
  timestamp: string,
  language: string
): Promise<boolean> {
  const AWS_SES_REGION = Deno.env.get('AWS_SES_REGION') || 'us-east-1';
  const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
  const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const AWS_SES_FROM_EMAIL = Deno.env.get('AWS_SES_FROM_EMAIL');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_SES_FROM_EMAIL) {
    console.error('AWS SES credentials not configured');
    return false;
  }

  const isRtl = language === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const fontFamily = isRtl 
    ? "'IBM Plex Sans Arabic', 'Cairo', Arial, sans-serif"
    : "'Segoe UI', Roboto, Arial, sans-serif";

  const subject = isRtl 
    ? '🔐 تنبيه أمني: طلب إعادة تعيين كلمة المرور'
    : '🔐 Security Alert: Password Reset Requested';

  const htmlBody = `
<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: ${fontFamily};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                ${isRtl ? '🔐 تنبيه أمني' : '🔐 Security Alert'}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${isRtl 
                  ? 'تم طلب إعادة تعيين كلمة المرور للمستخدم التالي:'
                  : 'A password reset was requested for the following user:'}
              </p>
              
              <!-- Details Table -->
              <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">
                    ${isRtl ? 'البريد الإلكتروني (مخفي)' : 'Email (Masked)'}
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-family: monospace;">
                    ${maskedEmail}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">
                    ${isRtl ? 'عنوان IP' : 'IP Address'}
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-family: monospace;">
                    ${ipAddress}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">
                    ${isRtl ? 'المتصفح/الجهاز' : 'User Agent'}
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 12px;">
                    ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">
                    ${isRtl ? 'المنصة' : 'Platform'}
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827;">
                    ${platform}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #6b7280; font-weight: 600;">
                    ${isRtl ? 'الوقت' : 'Timestamp'}
                  </td>
                  <td style="padding: 12px 16px; color: #111827; font-family: monospace;">
                    ${new Date(timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-US', { timeZone: 'Asia/Riyadh' })}
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-inline-start: 4px solid #f59e0b;">
                ${isRtl 
                  ? '⚠️ إذا لم يكن هذا الطلب متوقعاً، يرجى مراجعة سجلات الأمان والتحقق من أي نشاط مشبوه.'
                  : '⚠️ If this request was unexpected, please review security logs and check for any suspicious activity.'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${isRtl 
                  ? 'هذه رسالة تلقائية من نظام أمان Dhuud. لا ترد على هذا البريد.'
                  : 'This is an automated message from Dhuud Security System. Do not reply to this email.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // AWS SES API call
  const endpoint = `https://email.${AWS_SES_REGION}.amazonaws.com/`;
  const params = new URLSearchParams({
    'Action': 'SendEmail',
    'Source': `Dhuud Security <${AWS_SES_FROM_EMAIL}>`,
    'Destination.ToAddresses.member.1': adminEmail,
    'Message.Subject.Data': subject,
    'Message.Subject.Charset': 'UTF-8',
    'Message.Body.Html.Data': htmlBody,
    'Message.Body.Html.Charset': 'UTF-8',
    'Version': '2010-12-01',
  });

  // Sign request with AWS Signature V4
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const canonicalRequest = [
    'POST',
    '/',
    '',
    `content-type:application/x-www-form-urlencoded`,
    `host:email.${AWS_SES_REGION}.amazonaws.com`,
    `x-amz-date:${amzDate}`,
    '',
    'content-type;host;x-amz-date',
    await sha256(params.toString()),
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${AWS_SES_REGION}/ses/aws4_request`,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_SES_REGION, 'ses');
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${dateStamp}/${AWS_SES_REGION}/ses/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Amz-Date': amzDate,
        'Authorization': authHeader,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AWS SES error:', errorText);
      return false;
    }

    console.log('Admin security alert sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send admin alert:', error);
    return false;
  }
}

// AWS Signature V4 helper functions
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: Uint8Array | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = key instanceof Uint8Array ? new Uint8Array(key) : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacHex(key: Uint8Array | ArrayBuffer, message: string): Promise<string> {
  const result = await hmac(key, message);
  return Array.from(new Uint8Array(result)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode('AWS4' + key);
  const kDate = await hmac(keyBytes, dateStamp);
  const kRegion = await hmac(new Uint8Array(kDate), region);
  const kService = await hmac(new Uint8Array(kRegion), service);
  return await hmac(new Uint8Array(kService), 'aws4_request');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    
    // Server-side rate limiting by IP
    if (!checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      // Return success to not reveal rate limiting to potential attackers
      return new Response(
        JSON.stringify({ success: true, message: 'Request processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PasswordResetNotification = await req.json();
    const { email, userAgent, platform, origin, timestamp, language } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maskedEmail = maskEmail(email);
    console.log(`Password reset requested for: ${maskedEmail} from IP: ${clientIp}`);

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to find the user to get tenant context
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, tenant_id')
      .eq('email', email)
      .maybeSingle();

    // Log the password reset attempt to user_activity_logs
    const logData = {
      user_id: userData?.id || null,
      tenant_id: userData?.tenant_id || null,
      event_type: 'login', // Using existing enum value
      metadata: {
        security_event: 'password_reset_request',
        email_masked: maskedEmail,
        user_agent: userAgent?.substring(0, 500),
        platform,
        origin,
        request_timestamp: timestamp,
        user_found: !!userData,
      },
      ip_address: clientIp,
    };

    // Only insert if we have a user_id (required by table)
    if (userData?.id) {
      const { error: logError } = await supabase
        .from('user_activity_logs')
        .insert(logData);

      if (logError) {
        console.error('Failed to log password reset attempt:', logError);
      } else {
        console.log('Password reset attempt logged successfully');
      }
    } else {
      console.log('No user found for email, logging to console only:', maskedEmail);
    }

    // Send admin alert email
    const adminEmail = Deno.env.get('ADMIN_SECURITY_EMAIL');
    if (adminEmail) {
      await sendAdminAlert(
        adminEmail,
        maskedEmail,
        clientIp,
        userAgent || 'Unknown',
        platform || 'Unknown',
        timestamp,
        language || 'en'
      );
    } else {
      console.warn('ADMIN_SECURITY_EMAIL not configured, skipping admin alert');
    }

    // Always return success (constant-time response to prevent enumeration)
    return new Response(
      JSON.stringify({ success: true, message: 'Request processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-password-reset:', error);
    // Return success even on error to not reveal internal state
    return new Response(
      JSON.stringify({ success: true, message: 'Request processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
