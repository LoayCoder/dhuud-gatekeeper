
# Gate Pass Remaining Issues — Fix Plan

## Issues & Root Causes

| # | Issue | Real Status | Root Cause |
|---|-------|-------------|------------|
| 1 | **WhatsApp never sent for gate passes** | 🔴 Broken | `materialGatePassActionService.ts` sends `{ phone, message }` but `send-gate-whatsapp` expects `{ mobile_number, notification_type }` — field name mismatch causes silent failure |
| 2 | **company_id NULL on all passes** | 🟡 By Design | `company_id` is optional in `CreateGatePassData` — internal users can create passes without a company. Not a bug for internal passes, but public passes should populate it from `public_requester_company` |
| 3 | **project_id NULL on all passes** | 🟡 By Design | Same — optional field. Dept rep notification is gated on `project_id`, so it never fires |
| 4 | **111 orphaned gate_entry_logs** | ✅ Not a Bug | These are visitor/employee/contractor/delivery entries (not material gate pass entries). The `material_gate_pass_id` column exists and is correctly set when a gate pass entry is recorded via `verifyGatePass()` |
| 5 | **Edge function logs show zero** | 🔴 Confirmed | `contractor-audit-log` and `send-gate-whatsapp` are never successfully invoked for gate passes |

---

## Fix Plan

### Fix 1: Gate Pass WhatsApp Notification (CRITICAL)

**Problem:** `materialGatePassActionService.ts` line 106-112 sends:
```js
{ phone: "...", message: "...", tenant_id: "..." }
```
But `send-gate-whatsapp` destructures `mobile_number` and `notification_type` — `phone` is ignored, `mobile_number` is undefined, function fails silently.

**Solution:** Add a `gate_pass_status` notification type to `send-gate-whatsapp` that accepts `phone`/`message` or change the caller to use the WaSender shared utility directly. The cleanest fix:

- Add `notification_type: 'gate_pass_status'` handling in `send-gate-whatsapp/index.ts`
- Update the caller in `materialGatePassActionService.ts` to send `mobile_number` instead of `phone` and include `notification_type: 'gate_pass_status'`
- Log delivery to `auto_notification_logs`

### Fix 2: Dept Rep Notification Without project_id

**Problem:** Line 168 in create service: `if (result?.project_id && tenantId)` — skips notification when no project.

**Solution:** Remove the `project_id` gate. Send dept rep notification based on branch assignment instead. Change the condition to fire whenever an internal gate pass is created, using branch_id to find the responsible dept rep.

### Fix 3: Verify contractor-audit-log Edge Function Deployment

**Action:** Deploy the edge function and test it with a curl call to confirm it's reachable and working.

### Fix 4: No Code Change Needed for Orphaned Logs

The 111 `gate_entry_logs` are visitor/employee entries — they correctly have `material_gate_pass_id = NULL`. This is expected behavior, not a bug.

---

## Technical Changes

| File | Change |
|------|--------|
| `supabase/functions/send-gate-whatsapp/index.ts` | Add `gate_pass_status` notification type that sends a plain text WhatsApp message and logs to `auto_notification_logs` |
| `src/features/contractors/services/materialGatePassActionService.ts` | Fix field names: `phone` → `mobile_number`, add `notification_type: 'gate_pass_status'` |
| `src/features/contractors/services/materialGatePassCreateService.ts` | Remove `project_id` gate on dept rep notification — use branch_id instead |
| Edge function deploy | Deploy `contractor-audit-log` and `send-gate-whatsapp` |
