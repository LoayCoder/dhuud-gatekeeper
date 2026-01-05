# DHUUD Platform - Security Headers Configuration

> **Last Updated:** 2026-01-05  
> **Status:** Production Ready  
> **Priority:** Critical for Production Deployment

## Overview

This document outlines the security headers that must be configured at the CDN/proxy level for production deployment. These headers protect against XSS, clickjacking, MIME-type sniffing, and other common web vulnerabilities.

---

## Required Security Headers

### 1. Content Security Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpt.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.gpt.lovable.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests
```

**Note:** Remove `'unsafe-inline'` and `'unsafe-eval'` from `script-src` once you implement nonce-based CSP.

### 2. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Prevents MIME-type sniffing attacks.

### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

Prevents clickjacking by disabling iframe embedding.

### 4. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Controls what referrer information is sent with requests.

### 5. Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(), usb=()
```

Restricts browser features. Adjust `geolocation=(self)` if GPS features are needed.

### 6. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Forces HTTPS for all connections. **Only enable after confirming HTTPS works correctly.**

### 7. Cross-Origin Headers

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

Provides isolation from cross-origin attacks.

---

## CDN Configuration Examples

### Cloudflare

1. Go to **Security → Page Rules** or **Transform Rules**
2. Create a new rule for your domain
3. Add each header using the "Modify Response Header" action

Or use Cloudflare Workers:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const response = await fetch(request);
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpt.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
```

### Vercel

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(self)" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpt.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'" }
      ]
    }
  ]
}
```

### Netlify

Add to `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(self)"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Cross-Origin-Opener-Policy = "same-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpt.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'"
```

### Nginx

```nginx
server {
    # ... other config ...
    
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpt.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'" always;
}
```

---

## Rate Limiting Recommendations

Implement at the CDN/API Gateway level:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login attempts | 5 requests | per minute per IP |
| Password reset | 3 requests | per hour per email |
| API calls (authenticated) | 100 requests | per minute per user |
| API calls (anonymous) | 20 requests | per minute per IP |
| File uploads | 10 requests | per minute per user |

---

## Verification Checklist

After configuration, verify headers using:

1. **Browser DevTools:** Network tab → Response headers
2. **curl:** `curl -I https://your-domain.com`
3. **Security Scanner:** https://securityheaders.com/
4. **Mozilla Observatory:** https://observatory.mozilla.org/

### Expected Grades

| Scanner | Target Grade |
|---------|-------------|
| securityheaders.com | A+ |
| Mozilla Observatory | A+ |

---

## CSP Improvement Roadmap

### Current State (Permissive)
- Uses `'unsafe-inline'` and `'unsafe-eval'` for compatibility

### Future State (Strict)
1. Implement nonce-based CSP for inline scripts
2. Remove `'unsafe-eval'` by refactoring eval dependencies
3. Use strict-dynamic for script loading

Example strict CSP:
```
Content-Security-Policy: default-src 'none'; script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic'; style-src 'self' 'nonce-{RANDOM}'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

---

## Support

For questions about security configuration, contact your platform administrator or refer to:
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
