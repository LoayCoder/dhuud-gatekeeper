

# Fix: WhatsApp ID Card Sending — Wrong API Domain

## Root Cause

The edge function logs show the exact error:

```
TypeError: error sending request for url (https://api.wasender.net/v1/messages/send-image): 
client error (Connect): received fatal alert: UnrecognisedName
```

The `send-id-card-notification` edge function uses **the wrong WaSender API domain and endpoints**:
- Wrong: `https://api.wasender.net/v1/messages/send-image`
- Correct: `https://wasenderapi.com/api/send-message`

The project already has a well-tested shared utility at `supabase/functions/_shared/wasender-whatsapp.ts` with the correct API URL, phone formatting, retry logic, and media support. But the ID card notification function **does not use it** — it has its own inline WhatsApp code pointing at a non-existent domain.

## Fix

### Single file change: `supabase/functions/send-id-card-notification/index.ts`

Replace the inline WaSender HTTP calls (lines 84-121) with imports from the shared utility:

```typescript
import { sendWaSenderMediaMessage, sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";
```

Then replace the manual fetch calls with:
1. `sendWaSenderMediaMessage(phone, card_image_url, caption)` for the image+caption
2. `sendWaSenderTextMessage(phone, textMessage)` as the fallback

This also fixes:
- Phone number formatting (the shared utility handles country code detection properly)
- Rate limit retry logic (built into the shared utility)
- Remove the now-unnecessary inline `WASENDER_API_KEY` check (shared utility handles it)

### Deploy

Redeploy `send-id-card-notification` edge function after the change.

## Summary

| Item | Detail |
|------|--------|
| File | `supabase/functions/send-id-card-notification/index.ts` |
| Change | Replace inline wrong-URL WaSender code with shared utility imports |
| Deploy | Redeploy edge function |
| No DB changes | — |

