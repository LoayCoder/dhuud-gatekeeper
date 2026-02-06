
# Fix: Public Gate Pass Notifications Not Being Sent

## Problem Analysis

| Component | Current State | Issue |
|-----------|--------------|-------|
| Gate pass `PUB-20260205-2c524b70` | Status: `pending_club_mgmt_ack` | Created correctly |
| `notify-public-gate-pass` edge function | Exists, works | **Never invoked** |
| `submit_public_gate_pass` RPC | Creates record only | No notification trigger |
| `useSubmitPublicGatePass` hook | Shows toast, stores token | **Missing edge function call** |
| Database triggers | None exist | **No trigger for notifications** |
| Notification logs | Empty for this request | Confirms nothing was sent |

**Root Cause:** The notification edge function exists but is never called anywhere in the flow.

---

## Solution: Two-Part Implementation

### Part 1: Call Notification Edge Function on Submission

**File:** `src/hooks/public-gate-pass/use-public-gate-pass.ts`

Update the `onSuccess` callback to call the `notify-public-gate-pass` edge function:

```typescript
onSuccess: async (result, variables) => {
  if (result.success) {
    // Store token in localStorage for status page
    if (result.public_access_token) {
      localStorage.setItem("public_gate_pass_token", result.public_access_token);
    }
    
    // Trigger WhatsApp notification to requester AND staff
    try {
      await supabase.functions.invoke('notify-public-gate-pass', {
        body: {
          gate_pass_id: result.gate_pass_id,
          tenant_id: variables.tenant_id,  // Need to pass this
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
      });
    } catch (err) {
      console.error('[Public Gate Pass] Notification failed:', err);
      // Don't fail the submission - notification is best-effort
    }
    
    toast.success("Gate pass request submitted successfully!");
  } else {
    toast.error(result.error || "Failed to submit gate pass request");
  }
},
```

**Issue:** The hook doesn't have `tenant_id` - we need to get it from the tenant slug.

**Solution:** Update the `PublicGatePassSubmission` type to include `tenant_id` OR fetch it in the form component and pass it.

---

### Part 2: Fix Edge Function Staff Query

**File:** `supabase/functions/notify-public-gate-pass/index.ts`

The edge function has a **critical bug** - it queries `user_roles.role` which uses the old role string format, not the new `roles.code` format via `user_role_assignments`.

Current broken query:
```typescript
.eq('user_roles.role', 'golf_club_mgmt')  // ❌ Wrong - no such role
```

Also uses `mobile_number` which doesn't exist (should be `phone_number`).

**Fix the staff query:**
```typescript
// Get Golf Club Management department reps for this tenant
const { data: golfClubDept } = await supabase
  .from('departments')
  .select('id')
  .eq('tenant_id', tenant_id)
  .or("name.eq.Golf Club Management,name.ilike.%golf%club%management%")
  .is('deleted_at', null)
  .limit(1)
  .single();

if (golfClubDept) {
  const { data: staffUsers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone_number,
      preferred_language,
      user_role_assignments!inner(
        roles!inner(code)
      )
    `)
    .eq('tenant_id', tenant_id)
    .eq('assigned_department_id', golfClubDept.id)
    .in('user_role_assignments.roles.code', ['department_representative', 'department_manager'])
    .eq('is_active', true)
    .is('deleted_at', null);
  
  // staffUsers now contains the correct reps like Khalid Al Shuhail
}
```

---

### Part 3: Create Database Trigger for Status Changes

**Migration:** Create trigger for approval/rejection notifications

```sql
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to notify on public gate pass status changes
CREATE OR REPLACE FUNCTION notify_public_gate_pass_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_slug TEXT;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only process public requests with relevant status changes
  IF NEW.is_public_request = true 
     AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('approved', 'rejected', 'pending_security_approval') THEN
    
    -- Get tenant slug
    SELECT slug INTO v_tenant_slug FROM tenants WHERE id = NEW.tenant_id;
    
    -- Get config values
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.service_role_key', true);
    
    -- Only proceed if we have the config
    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/notify-public-gate-pass',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
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
          'pass_date', NEW.pass_date::text,
          'tracking_url', '/' || v_tenant_slug || '/track/' || NEW.public_access_token,
          'event_type', CASE 
            WHEN NEW.status = 'approved' THEN 'approved'
            WHEN NEW.status = 'rejected' THEN 'rejected'
            WHEN NEW.status = 'pending_security_approval' THEN 'acknowledged'
          END,
          'rejection_reason', NEW.rejection_reason
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_notify_public_gate_pass_status ON material_gate_passes;
CREATE TRIGGER trg_notify_public_gate_pass_status
  AFTER UPDATE ON material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_gate_pass_status_change();
```

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/public-gate-pass/use-public-gate-pass.ts` | **Modify** | Add edge function call on submission success |
| `src/types/public-gate-pass.types.ts` | **Modify** | Add `tenant_id` to submission type |
| `supabase/functions/notify-public-gate-pass/index.ts` | **Modify** | Fix staff query (use correct role assignment pattern) |
| Database Migration | **Create** | Add trigger for approval/rejection notifications |

---

## Notification Flow After Fix

```text
USER SUBMITS REQUEST
        │
        ▼
┌───────────────────────┐
│ submit_public_gate_   │
│ pass RPC              │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ useSubmitPublicGate   │──▶ supabase.functions.invoke('notify-public-gate-pass')
│ Pass hook (onSuccess) │               │
└───────────────────────┘               │
                                        ▼
                           ┌────────────────────────┐
                           │ Edge Function:         │
                           │ - WhatsApp to Requester│
                           │ - WhatsApp to Khalid   │
                           │   Al Shuhail (Rep)     │
                           │ - In-app notification  │
                           └────────────────────────┘

STAFF APPROVES/REJECTS
        │
        ▼
┌───────────────────────┐
│ approve_gate_pass_    │
│ unified RPC           │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ DB Trigger:           │──▶ notify-public-gate-pass edge function
│ trg_notify_public_... │
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│ WhatsApp to Requester │
│ with status update    │
└───────────────────────┘
```

---

## Golf Club Management Representative

The database confirms that **Khalid Al Shuhail** (`+966509993439`) is the Golf Club Management department representative who should receive notification of new public gate pass requests.

---

## Testing After Implementation

1. Submit a new public gate pass request from Golf Saudi portal
2. Verify requester receives WhatsApp confirmation with tracking link
3. Verify Khalid Al Shuhail receives WhatsApp notification about new request
4. Login as Khalid and acknowledge the request
5. Verify requester receives acknowledgment WhatsApp
6. Approve the request as Security Supervisor
7. Verify requester receives approval WhatsApp with PDF link
