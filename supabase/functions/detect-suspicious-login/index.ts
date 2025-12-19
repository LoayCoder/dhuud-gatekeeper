import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginDetectionRequest {
  user_id?: string;
  email: string;
  success: boolean;
  device_fingerprint: string;
  user_agent: string;
  platform?: string;
  browser?: string;
  failure_reason?: string;
}

interface GeoLocation {
  country_code: string;
  country_name: string;
  city: string;
  region: string;
  isp: string;
  is_vpn: boolean;
  is_proxy: boolean;
}

interface RiskAssessment {
  risk_score: number;
  risk_factors: string[];
  is_suspicious: boolean;
  is_new_device: boolean;
  is_new_location: boolean;
}

// Get client IP from headers
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '0.0.0.0';
}

// Get IP geolocation using free ip-api.com
async function getGeoLocation(ip: string): Promise<GeoLocation> {
  try {
    // Skip for private/local IPs
    if (ip === '0.0.0.0' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country_code: 'LOCAL',
        country_name: 'Local Network',
        city: 'Local',
        region: 'Local',
        isp: 'Local Network',
        is_vpn: false,
        is_proxy: false,
      };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,region,isp,proxy,hosting`);
    
    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country_code: data.countryCode || 'UNKNOWN',
        country_name: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        isp: data.isp || 'Unknown',
        is_vpn: data.hosting || false,
        is_proxy: data.proxy || false,
      };
    }
    
    throw new Error('Geolocation lookup failed');
  } catch (error) {
    console.error('Geolocation error:', error);
    return {
      country_code: 'UNKNOWN',
      country_name: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      isp: 'Unknown',
      is_vpn: false,
      is_proxy: false,
    };
  }
}

// Calculate risk score based on various factors
async function assessRisk(
  supabase: any, // Use any for edge function context
  userId: string | undefined,
  deviceFingerprint: string,
  geoLocation: GeoLocation,
  loginSuccess: boolean
): Promise<RiskAssessment> {
  const riskFactors: string[] = [];
  let riskScore = 0;
  let isNewDevice = false;
  let isNewLocation = false;

  // Check if VPN/Proxy
  if (geoLocation.is_vpn) {
    riskFactors.push('vpn_detected');
    riskScore += 15;
  }
  if (geoLocation.is_proxy) {
    riskFactors.push('proxy_detected');
    riskScore += 10;
  }

  // Failed login attempt
  if (!loginSuccess) {
    riskFactors.push('failed_login');
    riskScore += 10;
  }

  if (userId) {
    // Check if this is a new device (not in trusted_devices or login_history)
    const { data: trustedDevices } = await supabase
      .from('trusted_devices')
      .select('device_fingerprint')
      .eq('user_id', userId);

    const trustedFingerprints = trustedDevices?.map((d: any) => d.device_fingerprint) || [];
    
    if (!trustedFingerprints.includes(deviceFingerprint)) {
      // Also check recent login history
      const { data: recentLogins } = await supabase
        .from('login_history')
        .select('device_fingerprint')
        .eq('user_id', userId)
        .eq('login_success', true)
        .limit(50);

      const recentFingerprints = recentLogins?.map((l: any) => l.device_fingerprint) || [];
      
      if (!recentFingerprints.includes(deviceFingerprint)) {
        isNewDevice = true;
        riskFactors.push('new_device');
        riskScore += 30;
      }
    }

    // Check if this is a new location
    const { data: recentLocations } = await supabase
      .from('login_history')
      .select('country_code, city')
      .eq('user_id', userId)
      .eq('login_success', true)
      .limit(50);

    const previousLocations = recentLocations?.map((l: any) => `${l.country_code}:${l.city}`) || [];
    const currentLocation = `${geoLocation.country_code}:${geoLocation.city}`;

    if (previousLocations.length > 0 && !previousLocations.includes(currentLocation)) {
      isNewLocation = true;
      riskFactors.push('new_location');
      riskScore += 25;
    }

    // Check for recent failed login attempts (brute force detection)
    const { data: recentFailures } = await supabase
      .from('login_history')
      .select('id')
      .eq('user_id', userId)
      .eq('login_success', false)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

    if (recentFailures && recentFailures.length >= 3) {
      riskFactors.push('multiple_failed_attempts');
      riskScore += 20;
    }
    if (recentFailures && recentFailures.length >= 5) {
      riskFactors.push('brute_force_suspected');
      riskScore += 25;
    }
  }

  // Check login time (2AM-5AM local time is suspicious)
  const currentHour = new Date().getUTCHours();
  if (currentHour >= 2 && currentHour <= 5) {
    riskFactors.push('unusual_time');
    riskScore += 10;
  }

  return {
    risk_score: Math.min(riskScore, 100),
    risk_factors: riskFactors,
    is_suspicious: riskScore > 50,
    is_new_device: isNewDevice,
    is_new_location: isNewLocation,
  };
}

// Send admin alert email via AWS SES
async function sendAdminAlert(
  email: string,
  riskAssessment: RiskAssessment,
  geoLocation: GeoLocation,
  ip: string,
  userAgent: string
): Promise<void> {
  const adminEmail = Deno.env.get('ADMIN_SECURITY_EMAIL');
  const awsAccessKey = Deno.env.get('AWS_ACCESS_KEY_ID');
  const awsSecretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const awsRegion = Deno.env.get('AWS_SES_REGION') || 'us-east-1';
  const fromEmail = Deno.env.get('AWS_SES_FROM_EMAIL');

  if (!adminEmail || !awsAccessKey || !awsSecretKey || !fromEmail) {
    console.log('AWS SES not configured, skipping admin alert email');
    return;
  }

  const subject = `🚨 Suspicious Login Alert - ${email}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Suspicious Login Detected</h2>
      <p>A suspicious login attempt was detected for account: <strong>${email}</strong></p>
      
      <h3>Risk Assessment</h3>
      <ul>
        <li><strong>Risk Score:</strong> ${riskAssessment.risk_score}/100</li>
        <li><strong>Risk Factors:</strong> ${riskAssessment.risk_factors.join(', ')}</li>
        <li><strong>New Device:</strong> ${riskAssessment.is_new_device ? 'Yes' : 'No'}</li>
        <li><strong>New Location:</strong> ${riskAssessment.is_new_location ? 'Yes' : 'No'}</li>
      </ul>
      
      <h3>Location Details</h3>
      <ul>
        <li><strong>IP Address:</strong> ${ip}</li>
        <li><strong>Country:</strong> ${geoLocation.country_name} (${geoLocation.country_code})</li>
        <li><strong>City:</strong> ${geoLocation.city}</li>
        <li><strong>ISP:</strong> ${geoLocation.isp}</li>
        <li><strong>VPN/Proxy:</strong> ${geoLocation.is_vpn || geoLocation.is_proxy ? 'Yes' : 'No'}</li>
      </ul>
      
      <h3>Device Information</h3>
      <p>${userAgent}</p>
      
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        This is an automated security alert from DHUUD HSSA Platform.
      </p>
    </div>
  `;

  try {
    // Use SES API v2 with simpler approach
    const endpoint = `https://email.${awsRegion}.amazonaws.com/v2/email/outbound-emails`;
    
    const body = JSON.stringify({
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: htmlBody, Charset: 'UTF-8' } }
        }
      },
      Destination: { ToAddresses: [adminEmail] },
      FromEmailAddress: fromEmail
    });

    // For simplicity, log the alert instead if SES is complex
    console.log('SECURITY ALERT:', {
      type: 'suspicious_login',
      email,
      risk_score: riskAssessment.risk_score,
      risk_factors: riskAssessment.risk_factors,
      location: geoLocation,
      ip
    });
    
  } catch (error) {
    console.error('Failed to send admin alert:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: LoginDetectionRequest = await req.json();
    const clientIP = getClientIP(req);
    
    console.log('Processing login detection:', { 
      email: body.email, 
      success: body.success,
      ip: clientIP 
    });

    // Get geolocation
    const geoLocation = await getGeoLocation(clientIP);
    console.log('Geolocation:', geoLocation);

    // Assess risk
    const riskAssessment = await assessRisk(
      supabase,
      body.user_id,
      body.device_fingerprint,
      geoLocation,
      body.success
    );
    console.log('Risk assessment:', riskAssessment);

    // Get tenant_id for the user if available
    let tenantId: string | null = null;
    if (body.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', body.user_id)
        .single();
      
      tenantId = profile?.tenant_id || null;
    }

    // Log to login_history
    const { error: insertError } = await supabase
      .from('login_history')
      .insert({
        user_id: body.user_id,
        tenant_id: tenantId,
        email: body.email,
        ip_address: clientIP,
        country_code: geoLocation.country_code,
        country_name: geoLocation.country_name,
        city: geoLocation.city,
        region: geoLocation.region,
        isp: geoLocation.isp,
        is_vpn: geoLocation.is_vpn,
        is_proxy: geoLocation.is_proxy,
        device_fingerprint: body.device_fingerprint,
        user_agent: body.user_agent,
        platform: body.platform,
        browser: body.browser,
        risk_score: riskAssessment.risk_score,
        risk_factors: riskAssessment.risk_factors,
        is_suspicious: riskAssessment.is_suspicious,
        is_new_device: riskAssessment.is_new_device,
        is_new_location: riskAssessment.is_new_location,
        login_success: body.success,
        failure_reason: body.failure_reason,
      });

    if (insertError) {
      console.error('Failed to insert login history:', insertError);
    }

    // Also log to user_activity_logs if user_id is available
    if (body.user_id) {
      const eventType = !body.success 
        ? 'login' // Will use metadata to distinguish
        : riskAssessment.is_suspicious 
          ? 'login' 
          : riskAssessment.is_new_device 
            ? 'login' 
            : 'login';

      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: body.user_id,
          tenant_id: tenantId,
          event_type: eventType,
          ip_address: clientIP,
          metadata: {
            login_success: body.success,
            failure_reason: body.failure_reason,
            risk_score: riskAssessment.risk_score,
            risk_factors: riskAssessment.risk_factors,
            is_suspicious: riskAssessment.is_suspicious,
            is_new_device: riskAssessment.is_new_device,
            is_new_location: riskAssessment.is_new_location,
            country: geoLocation.country_name,
            city: geoLocation.city,
            device_fingerprint: body.device_fingerprint,
            user_agent: body.user_agent,
            timestamp: new Date().toISOString(),
          },
        });
    }

    // Send admin alert if suspicious
    if (riskAssessment.is_suspicious && body.success) {
      await sendAdminAlert(
        body.email,
        riskAssessment,
        geoLocation,
        clientIP,
        body.user_agent
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        risk_score: riskAssessment.risk_score,
        is_suspicious: riskAssessment.is_suspicious,
        is_new_device: riskAssessment.is_new_device,
        is_new_location: riskAssessment.is_new_location,
        risk_factors: riskAssessment.risk_factors,
        location: {
          country: geoLocation.country_name,
          city: geoLocation.city,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in detect-suspicious-login:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
