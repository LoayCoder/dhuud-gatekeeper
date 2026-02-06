
# Fix: Use Correct Domain for Tracking URLs & Update Status Page

## Problem Summary

| Issue | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| Tracking URL in WhatsApp | Uses `golf-saudi.lovable.app` | Should use `www.dhuud.com` (from tenant settings) |
| Status page mapping | Missing `pending_security_approval` status | Should show "Pending with Security" step |

**Confirmed Database State:**
- Gate Pass: `PUB-20260205-565a7432`
- Status: `pending_security_approval` (after Khalid acknowledged)
- Tenant's configured domain: `https://www.dhuud.com`

---

## Solution

### Part 1: Fix Tracking URL in Edge Function

**File:** `supabase/functions/notify-public-gate-pass/index.ts`

Update to fetch and use `public_gate_pass_domain` from tenant settings:

```typescript
// Current code (line 61-65):
const { data: tenant, error: tenantError } = await supabase
  .from('tenants')
  .select('id, name, slug')
  .eq('id', tenant_id)
  .single();

// Updated code:
const { data: tenant, error: tenantError } = await supabase
  .from('tenants')
  .select('id, name, slug, public_gate_pass_domain')
  .eq('id', tenant_id)
  .single();
```

Update the URL construction (line 87-88):

```typescript
// Current code:
const siteUrl = Deno.env.get('SITE_URL') || `https://${tenant.slug}.lovable.app`;

// Updated code - prioritize tenant's configured domain:
const siteUrl = tenant.public_gate_pass_domain 
  || Deno.env.get('SITE_URL') 
  || `https://${tenant.slug}.lovable.app`;
```

**Result:** WhatsApp messages will now include `https://www.dhuud.com/golf-saudi/track/...`

---

### Part 2: Add Missing Status to Tracking Page

**File:** `src/pages/public-gate-pass/PublicStatusPage.tsx`

Add `pending_security_approval` and `pending_club_mgmt_ack` to the `STATUS_CONFIG`:

```typescript
// Add after line 52 (after 'acknowledged')
pending_club_mgmt_ack: {
  label: "Pending Management",
  labelAr: "في انتظار الإدارة",
  color: "bg-blue-500",
  icon: <Clock className="h-4 w-4" />,
  step: 1,
},
pending_security_approval: {
  label: "Pending Security",
  labelAr: "في انتظار الأمن",
  color: "bg-amber-500",
  icon: <Clock className="h-4 w-4" />,
  step: 2,
},
```

Update the `STEPS` array for a more accurate workflow:

```typescript
const STEPS = [
  { step: 1, label: "Submitted", labelAr: "تم التقديم" },
  { step: 2, label: "Acknowledged", labelAr: "تم الاستلام" },
  { step: 3, label: "Approved", labelAr: "تمت الموافقة" },
];
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/notify-public-gate-pass/index.ts` | Fetch `public_gate_pass_domain` and use it for tracking URL |
| `src/pages/public-gate-pass/PublicStatusPage.tsx` | Add `pending_club_mgmt_ack` and `pending_security_approval` statuses |

---

## Expected Result After Fix

**WhatsApp Messages will show:**
```
🔗 *تتبع الحالة | Track status:*
https://www.dhuud.com/golf-saudi/track/565a7432-95e8-42ba-acdb-2210c0150bc0
```

**Tracking Page will show:**
- Step 1: ✅ Submitted (completed)
- Step 2: 🔄 Acknowledged / Pending Security (current)
- Step 3: ⏳ Approved (pending)

---

## Notification Flow Diagram

```text
┌────────────────────────────────────────────────────────────┐
│                    TENANT SETTINGS                         │
│         public_gate_pass_domain = www.dhuud.com            │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              notify-public-gate-pass                        │
│                                                             │
│  1. Fetch tenant including public_gate_pass_domain         │
│  2. Use domain for tracking URL: www.dhuud.com/...         │
│  3. Send WhatsApp with correct link                        │
└────────────────────────────────────────────────────────────┘
```
