

# Fix Gate Pass Remaining Issues

## Summary

Four issues need fixing. One (orphaned entry logs) is actually not a bug.

## Issue Analysis

| # | Issue | Verdict |
|---|-------|---------|
| 1 | WhatsApp never sent for gate passes | **Bug** — field name mismatch between caller and edge function |
| 2 | company_id/project_id NULL on all passes | **By design** — both are optional fields for internal requests |
| 3 | 111 orphaned gate_entry_logs | **Not a bug** — these are visitor/employee/contractor/delivery entries, not gate pass entries |
| 4 | Edge functions show zero invocations | **Bug** — consequence of issue #1, plus audit function may not be deployed |

## Changes

### 1. Fix `send-gate-whatsapp/index.ts` — Add `gate_pass_status` notification type

The edge function only handles visitor notification types. Gate pass code sends `{ phone, message }` but the function expects `{ mobile_number, notification_type }`.

- Add `'gate_pass_status'` to the `notification_type` union in the interface
- Add `message`, `gate_pass_id`, `reference_number` fields to the interface
- Add an early handler block: when `notification_type === 'gate_pass_status'`, send the provided `message` as a plain text WhatsApp via WaSender, log to `auto_notification_logs`, and return
- This keeps the existing visitor logic untouched

### 2. Fix `materialGatePassActionService.ts` — Correct field names

Line 106-112 currently sends:
```js
{ phone: requesterProfile.phone_number, message, tenant_id }
```

Change to:
```js
{
  mobile_number: requesterProfile.phone_number,
  notification_type: 'gate_pass_status',
  message,
  tenant_id: gatePass.tenant_id,
  gate_pass_id: gatePass.id,
  reference_number: gatePass.reference_number,
}
```

### 3. Fix `materialGatePassCreateService.ts` — Remove project_id gate on dept rep notification

Line 168: `if (result?.project_id && tenantId)` blocks notification when no project is set (which is all 11 passes).

Change to: `if (tenantId)` — always attempt to notify dept reps for internal passes. The edge function `notify-dept-rep-gate-pass` should handle the case where no project exists by falling back to branch-based lookup.

### 4. Deploy edge functions

Deploy `contractor-audit-log`, `send-gate-whatsapp`, and `notify-public-gate-pass` then verify with curl test calls.

### No changes needed for orphaned entry logs

The 111 `gate_entry_logs` break down as: 22 employee, 35 visitor, 24 contractor, 24 delivery, 6 worker entries. None are material gate pass entries. The `material_gate_pass_id` column exists and is correctly populated when `verifyGatePass()` records an entry. This is expected behavior.

## Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/send-gate-whatsapp/index.ts` | Add `gate_pass_status` handler with WaSender text send + logging |
| `src/features/contractors/services/materialGatePassActionService.ts` | Fix field names in WhatsApp invoke call |
| `src/features/contractors/services/materialGatePassCreateService.ts` | Remove `project_id` requirement for dept rep notification |

