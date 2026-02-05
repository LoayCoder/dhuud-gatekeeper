

# Public Gate Pass WhatsApp Notifications & PDF Distribution

## Overview

This plan implements automatic WhatsApp notifications throughout the public gate pass lifecycle, ensuring requesters receive confirmation messages when they submit a request and when it is approved (with a PDF download link).

## Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| `notify-public-gate-pass` Edge Function | ✅ Exists | Handles submitted/approved/rejected/acknowledged events |
| `generate-public-gate-pass-pdf` Edge Function | ✅ Exists | Generates downloadable PDF with QR code |
| Submission notification trigger | ❌ Missing | Hook doesn't call the edge function |
| Approval notification trigger | ❌ Missing | Approval workflow doesn't notify public requesters |
| PDF link in approval message | ❌ Missing | Message mentions QR but no direct PDF link |

## What Users Will Experience

```text
1. SUBMISSION
   ─────────────
   User submits request → Receives WhatsApp:
   "✅ Your gate pass request has been received.
    Reference: PUB-20260205-abc123
    Track status: [link]
    Pending with: Golf Club Management"

2. APPROVAL
   ─────────────
   Request approved → Receives WhatsApp:
   "🎉 Your gate pass has been APPROVED!
    Reference: PUB-20260205-abc123
    Download PDF: [direct link]
    Show QR code at the gate."
```

## Technical Implementation

### 1. Update Submission Hook to Trigger Notification

**File:** `src/hooks/public-gate-pass/use-public-gate-pass.ts`

After successful submission, call the `notify-public-gate-pass` edge function:

```typescript
onSuccess: async (result, variables) => {
  if (result.success && result.gate_pass_id) {
    // Store token for status page
    if (result.public_access_token) {
      localStorage.setItem("public_gate_pass_token", result.public_access_token);
    }
    
    // Trigger WhatsApp notification (fire-and-forget)
    supabase.functions.invoke('notify-public-gate-pass', {
      body: {
        gate_pass_id: result.gate_pass_id,
        tenant_id: variables.tenant_id,
        branch_id: variables.branch_id,
        reference_number: result.reference_number,
        requester_name: variables.requester_name,
        requester_phone: variables.requester_phone,
        requester_email: variables.requester_email,
        requester_company: variables.requester_company,
        material_description: variables.material_description,
        pass_date: variables.pass_date,
        tracking_url: `/${variables.tenant_slug}/track/${result.public_access_token}`,
        event_type: 'submitted',
      }
    }).catch(err => console.error('Notification failed:', err));
    
    toast.success("Gate pass request submitted successfully!");
  }
};
```

### 2. Create Database Trigger for Approval Notifications

**New Migration:** Create a trigger that fires when a public gate pass status changes to `approved` or `rejected`

```sql
CREATE OR REPLACE FUNCTION notify_public_gate_pass_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process public requests
  IF NEW.is_public_request = true THEN
    -- Check for status change to approved or rejected
    IF (OLD.status IS DISTINCT FROM NEW.status) AND 
       (NEW.status IN ('approved', 'rejected')) THEN
      
      -- Call edge function via pg_net
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notify-public-gate-pass',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'gate_pass_id', NEW.id,
          'tenant_id', NEW.tenant_id,
          'branch_id', NEW.branch_id,
          'reference_number', NEW.reference_number,
          'requester_name', NEW.public_requester_name,
          'requester_phone', NEW.public_requester_phone,
          'requester_email', NEW.public_requester_email,
          'requester_company', NEW.public_requester_company,
          'material_description', NEW.material_description,
          'pass_date', NEW.pass_date,
          'tracking_url', '/' || (SELECT slug FROM tenants WHERE id = NEW.tenant_id) || '/track/' || NEW.public_access_token,
          'event_type', NEW.status,
          'rejection_reason', NEW.rejection_reason
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_public_gate_pass_status
  AFTER UPDATE ON material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_gate_pass_status_change();
```

### 3. Enhance Approval WhatsApp Message with PDF Link

**File:** `supabase/functions/notify-public-gate-pass/index.ts`

Update the approval message to include:
- Direct PDF download link
- Information about who approved
- Clear call-to-action

```typescript
} else if (event_type === 'approved') {
  // Generate PDF URL
  const pdfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-public-gate-pass-pdf?token=${public_access_token}&tenant=${tenant.slug}`;
  
  const approvalMessage = `
🎉 *${tenant.name} - Gate Pass APPROVED*

Great news! Your gate pass has been approved.

📋 Reference: ${reference_number}
📅 Valid Date: ${pass_date}
${branchName ? `📍 Location: ${branchName}` : ''}

📱 *View your pass with QR code:*
${fullTrackingUrl}

📄 *Download PDF for printing:*
${pdfUrl}

⚠️ Present the QR code or printed PDF at the security gate.
`.trim();

  // Also send bilingual version
  const approvalMessageAr = `
🎉 *${tenant.name} - تمت الموافقة على التصريح*

تمت الموافقة على طلب تصريح المرور الخاص بك.

📋 المرجع: ${reference_number}
📅 تاريخ الصلاحية: ${pass_date}
${branchName ? `📍 الموقع: ${branchName}` : ''}

📱 *اعرض تصريحك مع رمز QR:*
${fullTrackingUrl}

📄 *تحميل PDF للطباعة:*
${pdfUrl}

⚠️ قدم رمز QR أو PDF المطبوع عند بوابة الأمن.
`.trim();

  // Send bilingual message
  const combinedMessage = `${approvalMessageAr}\n\n---\n\n${approvalMessage}`;
```

### 4. Add "Pending With" Information to Submission Confirmation

Update submission message to show who the request is pending with:

```typescript
if (event_type === 'submitted') {
  const requesterMessage = `
✅ *${tenant.name} - طلب تصريح جديد*
✅ *${tenant.name} - Gate Pass Submitted*

تم استلام طلبك بنجاح.
Your gate pass request has been received.

📋 المرجع | Reference: ${reference_number}
📅 التاريخ | Date: ${pass_date}
📦 المواد | Materials: ${truncatedMaterial}
${branchName ? `📍 الموقع | Location: ${branchName}` : ''}

⏳ *في انتظار | Pending with:*
Golf Club Management

🔗 *تتبع الحالة | Track status:*
${fullTrackingUrl}

سيتم إشعارك عند مراجعة طلبك.
You will be notified when your request is reviewed.
`.trim();
```

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/public-gate-pass/use-public-gate-pass.ts` | **Modify** | Add notification trigger on submission success |
| `supabase/functions/notify-public-gate-pass/index.ts` | **Modify** | Enhance messages with PDF link and "pending with" info |
| Database Migration | **Create** | Add trigger for approval/rejection notifications |

## Message Flow Diagram

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  User Submits   │────▶│ submit_public_gate_  │────▶│  Gate Pass      │
│  Request        │     │ pass RPC             │     │  Created        │
└─────────────────┘     └──────────────────────┘     └────────┬────────┘
                                                              │
                        ┌──────────────────────┐              │
                        │ notify-public-gate-  │◀─────────────┘
                        │ pass (submitted)     │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  WhatsApp to User:   │
                        │  "Request received,  │
                        │   pending with..."   │
                        └──────────────────────┘

┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Staff Approves │────▶│ approve_gate_pass_   │────▶│  Status =       │
│  Request        │     │ unified RPC          │     │  'approved'     │
└─────────────────┘     └──────────────────────┘     └────────┬────────┘
                                                              │
                        ┌──────────────────────┐              │
                        │ DB Trigger:          │◀─────────────┘
                        │ trg_notify_public_   │
                        │ gate_pass_status     │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │ notify-public-gate-  │
                        │ pass (approved)      │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  WhatsApp to User:   │
                        │  "APPROVED! Download │
                        │   PDF: [link]"       │
                        └──────────────────────┘
```

## Testing Checklist

After implementation:
1. Submit a new public gate pass request
2. Verify WhatsApp received with "pending with Golf Club Management"
3. Log in as Golf Club Management and acknowledge
4. Verify requester receives acknowledgment WhatsApp
5. Log in as Security Supervisor and approve
6. Verify requester receives approval WhatsApp with PDF link
7. Click PDF link and verify download works
8. Test rejection flow - verify rejection WhatsApp received

