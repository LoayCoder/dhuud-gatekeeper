/**
 * Secure CORS configuration for edge functions
 * Restricts origins to known domains instead of wildcard
 */

// Allowed origins for the application
const ALLOWED_ORIGINS = [
  // Production domains - update these for your deployment
  'https://lovable.dev',
  'https://id-preview--xdlowvfzhvjzbtgvurzj.lovable.app', // Preview URL
  // Add your custom domain here when deployed
];

// Check if we're in development mode (allow localhost)
const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';

if (isDevelopment) {
  ALLOWED_ORIGINS.push(
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080'
  );
}

/**
 * Get CORS headers for the given request origin
 * Returns restrictive headers that only allow known origins
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin = requestOrigin || '';
  
  // Check if origin is in allowed list
  const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  // If origin is allowed, reflect it; otherwise use first allowed origin
  const allowedOrigin = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0] || '';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

/**
 * Legacy wildcard CORS headers for backwards compatibility
 * USE WITH CAUTION - only for truly public endpoints
 */
export const wildcardCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}

/**
 * Verify that the request has a valid JWT token
 * Returns the user object if valid, null if invalid
 */
export async function verifyAuth(req: Request, supabase: any): Promise<{ user: any; error?: string } | null> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return { user: null, error: 'Invalid authorization header format' };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }
    
    return { user };
  } catch (err) {
    return { user: null, error: 'Token verification failed' };
  }
}

/**
 * Create unauthorized response with CORS headers
 */
export function unauthorizedResponse(message: string, requestOrigin?: string | null): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { 
      status: 401, 
      headers: { 
        ...getCorsHeaders(requestOrigin), 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
