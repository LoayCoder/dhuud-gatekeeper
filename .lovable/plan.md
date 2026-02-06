
# Fix: AI Analyze Edge Function CORS Headers

## Problem Identified

The **"AI Analyze"** button on the incident report page (/incidents/report) is failing with:
> "Failed to send a request to the Edge Function"

The root cause is a **CORS header mismatch** in the `analyze-observation` edge function.

## Technical Details

### What's Happening

1. User clicks "AI Analyze" on the incident/observation form
2. Browser sends a preflight OPTIONS request to check if the POST is allowed
3. The Supabase JS client now includes these new headers:
   - `x-supabase-client-platform`
   - `x-supabase-client-platform-version`  
   - `x-supabase-client-runtime`
   - `x-supabase-client-runtime-version`
4. The `analyze-observation` function only allows: `authorization, x-client-info, apikey, content-type`
5. Browser blocks the request because the headers are not permitted

### Comparison

| Edge Function | CORS Headers | Status |
|--------------|--------------|--------|
| `analyze-incident` | Uses shared `cors.ts` module | Working |
| `analyze-observation` | Has hardcoded incomplete headers | Broken |

**analyze-observation/index.ts (line 12-15):**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};  // ❌ Missing new Supabase client headers
```

**Required headers:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Solution

Update `supabase/functions/analyze-observation/index.ts` to include all required CORS headers that the Supabase client sends.

### File Change

**`supabase/functions/analyze-observation/index.ts`**

Update lines 12-15:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Expected Outcome

After this fix:
- The preflight OPTIONS request will succeed
- The AI Analyze button will work again
- Observations submitted from /incidents/report will be analyzed by AI

## Notes

- The `analyze-incident` function uses the shared `cors.ts` module which has similar headers, but for consistency it should also be verified
- All other edge functions should be audited to ensure they include these headers if called from the browser
