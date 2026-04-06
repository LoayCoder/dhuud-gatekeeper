

# Fix: Bulk WhatsApp Messages, ID Cards, and Inductions Not Being Received

## Root Cause

Three distinct issues across three edge functions:

### 1. `send-worker-bulk-message` — queries non-existent `whatsapp_settings` table
The logs show: **"No active WhatsApp settings found for tenant: 9290e913-..."**

This function queries a `whatsapp_settings` table that **does not exist** in the database. It also uses the **wrong WaSender API endpoint** (`https://api.wasender.dev/v1/messages`) and requires a `sessionId` — none of which match the project's actual WaSender integration.

The shared utility at `_shared/wasender-whatsapp.ts` already works correctly with the `WASENDER_API_KEY` env var and the correct endpoint (`https://wasenderapi.com/api/send-message`). This function needs to use it.

### 2. `send-contractor-id-card` — uses correct API but has inline code
This function uses the correct `wasenderapi.com` endpoint and reads `WASENDER_API_KEY` directly. It should work, but the logs show no recent invocations — meaning the frontend may not be calling it, or the call is failing before reaching the function. Need to verify the frontend trigger path.

### 3. `onboard-worker` (induction) — 30-second wait causes edge function timeout
The function has a `await new Promise(resolve => setTimeout(resolve, 30000))` — a 30-second delay before sending the QR image. Edge functions have a ~25-second timeout, so this **always times out** before the message is sent.

## Fix Plan

### Step 1: Rewrite `send-worker-bulk-message` to use shared utility
**File:** `supabase/functions/send-worker-bulk-message/index.ts`

- Remove the `sendWhatsAppMessage()` inline function that queries non-existent `whatsapp_settings`
- Import `sendWaSenderTextMessage` from `../_shared/wasender-whatsapp.ts`
- Call it directly with the worker's phone number and message
- Keep the throttled delay between messages (but reduce from 30s to 6s to stay within rate limits while avoiding timeouts)
- Since bulk sends can exceed edge function timeout for many workers, keep the fire-and-forget pattern but ensure the first message actually sends

### Step 2: Remove 30-second delay from `onboard-worker`
**File:** `supabase/functions/onboard-worker/index.ts`

- Remove the 30-second sleep at line ~244 that causes timeout
- The shared `sendWaSenderMediaMessage` already has built-in rate-limit retry logic (5.5s delay on 429), so the manual 30s wait is unnecessary and destructive

### Step 3: Redeploy both functions

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-worker-bulk-message/index.ts` | Replace inline WhatsApp code with shared utility import |
| `supabase/functions/onboard-worker/index.ts` | Remove 30-second sleep that causes timeout |

## Expected Result
- Bulk messages: workers receive WhatsApp messages
- Induction/onboarding: QR code and induction video links are delivered without timeout
- ID cards: already using correct API — should work once the other functions are fixed

