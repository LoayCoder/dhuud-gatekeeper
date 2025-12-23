import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Security Headers Edge Function
 * 
 * This function returns recommended security headers for the DHUUD HSSE Platform.
 * These headers should be applied at the CDN/proxy level for production deployments.
 * 
 * Usage: Call this endpoint to get the security headers configuration
 * Apply these headers in your CDN (Cloudflare, Vercel, etc.) or reverse proxy.
 */

const SUPABASE_PROJECT_URL = 'https://xdlowvfzhvjzbtgvurzj.supabase.co';
const LOVABLE_PREVIEW_URL = 'https://8feca61a-47e3-4736-9ecf-c70ee7c6acc3.lovableproject.com';

// Content Security Policy configuration
const getCSPHeader = () => {
  const directives = [
    // Default fallback
    "default-src 'self'",
    
    // Scripts - allow self, inline (for Vite), and trusted CDNs
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net`,
    
    // Styles - allow self, inline (for styled-components/tailwind), and Google Fonts
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    
    // Images - allow self, data URIs, blobs, Supabase storage, and HTTPS
    `img-src 'self' data: blob: ${SUPABASE_PROJECT_URL} https:`,
    
    // Fonts - allow self and Google Fonts
    `font-src 'self' https://fonts.gstatic.com data:`,
    
    // Connect - API endpoints, Supabase, WebSockets
    `connect-src 'self' ${SUPABASE_PROJECT_URL} wss://*.supabase.co https://api.ipify.org https://*.lovable.app`,
    
    // Media - audio/video from self and Supabase
    `media-src 'self' ${SUPABASE_PROJECT_URL} blob:`,
    
    // Object/embed - restrict
    "object-src 'none'",
    
    // Frame ancestors - prevent clickjacking
    "frame-ancestors 'self'",
    
    // Base URI
    "base-uri 'self'",
    
    // Form actions
    "form-action 'self'",
    
    // Upgrade insecure requests in production
    "upgrade-insecure-requests",
    
    // Workers
    `worker-src 'self' blob:`,
    
    // Child frames
    `child-src 'self' blob:`,
    
    // Manifest
    "manifest-src 'self'",
  ];
  
  return directives.join('; ');
};

// All security headers
const getSecurityHeaders = () => ({
  // Content Security Policy
  'Content-Security-Policy': getCSPHeader(),
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Clickjacking protection (legacy, superseded by CSP frame-ancestors)
  'X-Frame-Options': 'SAMEORIGIN',
  
  // XSS Protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer Policy - send origin only, no path
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy - restrict sensitive features
  'Permissions-Policy': [
    'camera=(self)',
    'microphone=(self)',
    'geolocation=(self)',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=(self)',
    'accelerometer=(self)',
  ].join(', '),
  
  // Strict Transport Security (HSTS) - enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Cross-Origin-Embedder-Policy': 'credentialless',
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const securityHeaders = getSecurityHeaders();
    
    // Return headers configuration as JSON
    const response = {
      success: true,
      message: 'Security headers configuration for DHUUD HSSE Platform',
      headers: securityHeaders,
      usage: {
        description: 'Apply these headers in your CDN or reverse proxy configuration',
        examples: {
          cloudflare: 'Use Transform Rules or Workers to add these headers',
          vercel: 'Add to vercel.json headers configuration',
          nginx: 'Add add_header directives to your server block',
        }
      },
      csp_notes: {
        warning: "The CSP includes 'unsafe-inline' and 'unsafe-eval' for Vite/React compatibility. Consider tightening for production.",
        recommendations: [
          "Use nonces or hashes instead of 'unsafe-inline' for scripts in production",
          "Remove 'unsafe-eval' if not required by your dependencies",
          "Audit and whitelist specific CDN domains instead of using wildcards"
        ]
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // Apply security headers to this response as an example
        ...securityHeaders,
      },
    });

  } catch (error: unknown) {
    console.error('[Security Headers] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
