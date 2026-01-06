import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  version: string;
  release_notes: string[];
  priority: 'normal' | 'important' | 'critical';
  tenant_ids?: string[];
  custom_title?: string;
  custom_body?: string;
  language?: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  tenant_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Base64 URL encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const cleanStr = str.replace(/\s+/g, '').replace(/[\r\n]/g, '');
  const padding = '='.repeat((4 - (cleanStr.length % 4)) % 4);
  const base64 = (cleanStr + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  } catch (error) {
    console.error('base64UrlDecode error:', error);
    throw error;
  }
}

function safeBase64UrlDecode(str: string): Uint8Array {
  let cleanStr = str.replace(/[\s\r\n]/g, '');
  
  if (/^[0-9a-fA-F]+$/.test(cleanStr) && cleanStr.length === 64) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleanStr.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  
  const padding = '='.repeat((4 - (cleanStr.length % 4)) % 4);
  const base64 = (cleanStr + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  } catch (error) {
    try {
      const trimmed = cleanStr.slice(0, -1);
      const trimPadding = '='.repeat((4 - (trimmed.length % 4)) % 4);
      const trimBase64 = (trimmed + trimPadding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(trimBase64);
      return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
    } catch {
      throw error;
    }
  }
}

// Create JWT for VAPID authentication
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string,
  publicKeyBase64Url: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  let privateKey: CryptoKey;
  
  if (privateKeyBase64Url.length >= 40 && privateKeyBase64Url.length <= 50) {
    const publicKeyBytes = safeBase64UrlDecode(publicKeyBase64Url);
    
    if (publicKeyBytes.length !== 65) {
      throw new Error(`Invalid public key length: ${publicKeyBytes.length}`);
    }
    
    const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
    const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
    
    const jwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      x: x,
      y: y,
      d: privateKeyBase64Url,
    };
    
    privateKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } else {
    const privateKeyBytes = safeBase64UrlDecode(privateKeyBase64Url);
    
    if (privateKeyBytes.length > 100) {
      privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBytes.buffer as ArrayBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
    } else {
      throw new Error(`Unsupported private key format`);
    }
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt push payload
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const subscriberKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authSecret = base64UrlDecode(authKey);

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecret.buffer as ArrayBuffer,
      info: authInfo,
    },
    sharedSecretKey,
    256
  );

  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo,
    },
    prkKey,
    128
  );

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo,
    },
    prkKey,
    96
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cekBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBits) },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

function buildEncryptedBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array,
  recordSize: number = 4096
): Uint8Array {
  const header = new Uint8Array(86);
  header.set(salt, 0);
  
  const view = new DataView(header.buffer);
  view.setUint32(16, recordSize, false);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string; expired?: boolean }> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh_key,
      subscription.auth_key
    );
    const body = buildEncryptedBody(encrypted, salt, localPublicKey);

    const headers = {
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': body.length.toString(),
      'TTL': '86400',
      'Urgency': 'high',
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: body.buffer as ArrayBuffer,
    });

    if (response.status === 201) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 410 || response.status === 404) {
      return { success: false, statusCode: response.status, error: 'Subscription expired', expired: true };
    } else {
      const errorText = await response.text();
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ========== Broadcast Update Notification ==========`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${requestId}] VAPID keys not configured`);
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured - VAPID keys missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_super_admin, tenant_id')
      .eq('id', user.id)
      .single();

    const { data: roleAssignments } = await supabase
      .from('user_role_assignments')
      .select('role_id, roles!inner(code)')
      .eq('user_id', user.id);

    // deno-lint-ignore no-explicit-any
    const roleCodes = (roleAssignments || []).map((ra: any) => ra.roles?.code).filter(Boolean);
    const isAdmin = profile?.is_super_admin || 
      roleCodes.some((code: string) => ['admin', 'super_admin', 'hsse_manager'].includes(code));

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BroadcastRequest = await req.json();
    const { 
      version, 
      release_notes = [], 
      priority = 'normal', 
      tenant_ids,
      custom_title,
      custom_body,
      language = 'en'
    } = body;

    if (!version) {
      return new Response(
        JSON.stringify({ error: 'Version is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Broadcasting update v${version} with priority ${priority}`);

    // Check if this version was already broadcast
    const { data: existingUpdate } = await supabase
      .from('app_updates')
      .select('id')
      .eq('version', version)
      .is('deleted_at', null)
      .single();

    if (existingUpdate) {
      return new Response(
        JSON.stringify({ error: 'This version has already been broadcast' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query active push subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('id, user_id, tenant_id, endpoint, p256dh_key, auth_key')
      .eq('is_active', true)
      .is('deleted_at', null)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (tenant_ids && tenant_ids.length > 0) {
      query = query.in('tenant_id', tenant_ids);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error(`[${requestId}] Error fetching subscriptions:`, fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalRecipients = subscriptions?.length || 0;
    console.log(`[${requestId}] Found ${totalRecipients} active subscriptions`);

    // Create app_updates record
    const { data: updateRecord, error: insertError } = await supabase
      .from('app_updates')
      .insert({
        version,
        release_notes,
        priority,
        broadcast_by: user.id,
        tenant_id: tenant_ids?.[0] || null,
        total_recipients: totalRecipients,
        successful_sends: 0,
        failed_sends: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Error creating update record:`, insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create update record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification payload
    const notificationTitle = custom_title || (language === 'ar' 
      ? 'تحديث جديد متوفر' 
      : 'Update Available');
    
    const notificationBody = custom_body || (language === 'ar'
      ? `الإصدار ${version} جاهز. انقر للتحديث.`
      : `Version ${version} is ready. Tap to update.`);

    const pushPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      badge: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      tag: `app-update-${version}`,
      requireInteraction: priority === 'critical',
      data: {
        type: 'update',
        version,
        priority,
        release_notes,
        action_url: '/'
      },
      actions: [
        { action: 'update', title: language === 'ar' ? 'تحديث الآن' : 'Update Now' },
        { action: 'dismiss', title: language === 'ar' ? 'لاحقاً' : 'Later' }
      ],
      vibrate: priority === 'critical' ? [200, 100, 200, 100, 200] : [100, 50, 100]
    });

    let successCount = 0;
    let failCount = 0;
    const errors: { subscription_id: string; error: string }[] = [];
    const expiredSubscriptions: string[] = [];

    // Send to all subscriptions
    const vapidSubject = 'mailto:support@dhuud.com';
    
    for (const subscription of (subscriptions || [])) {
      const result = await sendPushToSubscription(
        subscription,
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject
      );

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        errors.push({ subscription_id: subscription.id, error: result.error || 'Unknown error' });
        
        if (result.expired) {
          expiredSubscriptions.push(subscription.id);
        }
      }
    }

    // Mark expired subscriptions as inactive
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', expiredSubscriptions);
      
      console.log(`[${requestId}] Deactivated ${expiredSubscriptions.length} expired subscriptions`);
    }

    // Update app_updates record with results
    await supabase
      .from('app_updates')
      .update({
        successful_sends: successCount,
        failed_sends: failCount,
        error_details: errors.slice(0, 50), // Keep first 50 errors
      })
      .eq('id', updateRecord.id);

    console.log(`[${requestId}] Broadcast complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        version,
        total_recipients: totalRecipients,
        successful_sends: successCount,
        failed_sends: failCount,
        expired_cleaned: expiredSubscriptions.length,
        update_id: updateRecord.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
