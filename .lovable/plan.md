

## Fix: Public Gate Pass Submission Notifications Not Sending

### Root Cause

The `notify-public-gate-pass` edge function **is not registered in `supabase/config.toml`**. Without an entry there, the function is never deployed, so all calls to it from the frontend fail silently (the `try/catch` in `use-public-gate-pass.ts` swallows the error).

The function code itself is complete and correct -- it handles WhatsApp + email for both the requester and Golf Club Management staff. It just needs to be deployed.

### Fix

**File: `supabase/config.toml`**

Add the missing entry:

```toml
[functions.notify-public-gate-pass]
verify_jwt = false
```

`verify_jwt = false` is correct here because this function is called from the public (unauthenticated) gate pass submission flow.

### What This Enables

Once deployed, on submission the function will:
1. Send a **WhatsApp confirmation** to the requester with reference number, date, materials, and tracking link (bilingual Arabic/English)
2. Send a **WhatsApp notification** to Golf Club Management staff (rep/manager roles) about the new request
3. Send an **email confirmation** to the requester (if email was provided)

### No Other Changes Needed

- The function code (`supabase/functions/notify-public-gate-pass/index.ts`) is complete
- The frontend call in `use-public-gate-pass.ts` (lines 145-160) is correct
- The `WASENDER_API_KEY` secret is already configured
- The database trigger (`trg_notify_public_gate_pass_status`) also exists for status-change notifications

Single config line addition. The function will auto-deploy once added.

